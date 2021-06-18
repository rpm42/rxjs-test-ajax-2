import {
  Subject,
  of,
  BehaviorSubject,
  throwError,
  asapScheduler,
  from
} from 'rxjs'
import {
  catchError,
  concatMap,
  delay,
  map,
  mergeMap,
  tap,
  withLatestFrom
} from 'rxjs/operators'
import Port from './Port'
import Irp from './Irp'
import TriggerSubject from './TriggerSubject'
import { Request, Response } from './io-types'

enum A {
  ACTION_CALL = 'ACTION_CALL',
  ACTION_OK = 'ACTION_OK',
  ACTION_FAIL = 'ACTION_FAIL'
}

enum S {
  INITIAL = 'INITIAL',
  PENGING = 'PENGING',
  READY = 'READY'
}

interface Action {
  type: A
  data?: Irp
}

const nextIO = <T>(a$: Subject<T>, a: T) => a$.next(a)
type WaitingAction = [expr: (srate: S) => boolean, action: Action]

class Dispatcher {
  state$ = new BehaviorSubject<S>(S.INITIAL)
  action$ = new TriggerSubject<Action>()
  irpNext$ = new Subject<Irp>()
  irpBack$ = new Subject<Irp>()
  port = new Port(this.irpNext$, this.irpBack$)

  get state() {
    return this.state$.value
  }

  syscall = async (req: Request) => {
    const irp = new Irp(req)
    const completion = irp.pushCompletion()
    console.log('syscall', irp)
    nextIO(this.action$, { type: A.ACTION_CALL, data: irp })
    await completion
    if (!irp.ok) throw new Error(irp.errorMessage)
    return 'OK'
  }

  private defer = (fn: (...args: any) => void, ...args: any) => {
    asapScheduler.schedule(() => fn.apply(this, args))
  }

  dispatch = (a: Action, s: S) => {
    switch (a.type) {
      case A.ACTION_CALL:
        this.defer(async (irp) => {
          const completion = irp.pushCompletion()
          console.log('defer', irp)
          nextIO(this.irpNext$, irp)
          await completion
          nextIO(this.action$, { type: irp.ok ? A.ACTION_OK : A.ACTION_FAIL })
          irp.complete()
        }, a.data)
        return S.PENGING
      case A.ACTION_OK:
        return S.READY
      case A.ACTION_FAIL:
        return S.READY
    }
    return this.state
  }

  private waitingActionList: WaitingAction[] = []

  private handleStateChange = (newState: S) => {
    for (let i = 0; i < this.waitingActionList.length; i++) {
      const [expr, action] = this.waitingActionList[i]
      if (expr(newState)) {
        this.waitingActionList.splice(i, 1)
        this.action$.putFirst(action)
        break
      }
    }
    this.state$.next(newState)
  }

  constructor() {
    this.action$
      .pipe(
        withLatestFrom(this.state$),
        mergeMap(([a, s]) => from(this.dispatch(a, s)))
      )
      .subscribe(this.handleStateChange)

    this.state$.subscribe(s => {
      this.action$.trigger()
    })
  }
}

const d = new Dispatcher()

const TARGET_URL = `https://l5qcc.sse.codesandbox.io/`

async function main() {
  try {
    await d.syscall({
      url: TARGET_URL,
      method: 'GET'
    })
  } catch (e) {
    console.error('ERROR', e.message)
  }
}

main()
