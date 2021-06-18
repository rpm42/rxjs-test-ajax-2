import { of, throwError, Subject, from } from 'rxjs'
import {
  tap,
  delay,
  concatMap,
  catchError,
  mergeMap,
  mapTo
} from 'rxjs/operators'
import Irp from './Irp'
import { fromFetch } from 'rxjs/fetch'
import { ajax } from 'rxjs/ajax'

export default class Port {
  dispatch = (irp: Irp) => {
    console.log('port', irp)
    return ajax({
      url: irp.req.url,
      method: irp.req.method,
      headers: { 'Content-Type': 'plain/text;charset=utf-8' }
    }).pipe(
      mergeMap(resp => {
        console.log('resp', resp)
        // irp.ok = resp.ok
        irp.res.status = resp.status
        return of(resp.responseText)
      }),
      tap(v => console.log('get body 2', v)),
      mapTo(irp),
      catchError(e => {
        console.log('catchError', e, irp)
        irp.error(e.message)
        return of(irp)
      })
    )
  }

  irpIn$ = new Subject<Irp>()
  irpOut$ = this.irpIn$.pipe(mergeMap(this.dispatch))

  constructor(next$: Subject<Irp>, back$: Subject<Irp>) {
    next$.subscribe(this.irpIn$)
    this.irpOut$.subscribe(back$)
  }
}
