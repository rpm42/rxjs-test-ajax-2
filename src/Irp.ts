import { BehaviorSubject } from 'rxjs'
import { Request, Response } from './io-types'

export type Completion = BehaviorSubject<number>

function* GetUniqId(): Generator<number, number, number> {
  var index = 1
  while (true) yield index++
}

const gen = GetUniqId()

function getUniqId() {
  return gen.next().value
}

const createCompletion = () => new BehaviorSubject<number>(getUniqId())

export default class Irp {
  completionStack: Completion[] = []
  pushCompletion(completion: Completion = createCompletion()) {
    this.completionStack.push(completion)
    console.log(
      'pushCompletion',
      this.completionStack.map(s => `compl-${s.value}`)
    )
    return completion.toPromise()
  }

  ok = true
  errorMessage = ''
  error(msg: string) {
    this.ok = false
    this.errorMessage = msg
  }

  complete() {
    if (this.completionStack.length < 1) return
    const completion = this.completionStack.pop()
    completion.complete()
    console.log(
      'complete',
      this.completionStack.map(s => `compl-${s.value}`)
    )
  }

  public res: Response = {}
  constructor(public req: Request) {}
}
