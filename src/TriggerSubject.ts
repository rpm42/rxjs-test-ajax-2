import { Subject } from 'rxjs'

export default class TriggerSubject<T> extends Subject<T> {
  public readonly queue: T[] = []
  private awaited = 0

  public get isEmpty() {
    return this.queue.length === 0
  }
  public get size() {
    return this.queue.length
  }

  public next(value: T) {
    if (this.closed) return
    if (this.awaited > 0) {
      this.awaited--
      super.next(value)
    } else {
      this.queue.push(value)
    }
  }

  public putFirst(value: T) {
    if (this.closed) return
    if (this.awaited > 0) {
      this.awaited--
      super.next(value)
    } else {
      this.queue.unshift(value)
    }
  }

  public trigger() {
    if (this.closed) return
    if (!this.isEmpty) {
      const value = this.queue.shift()
      super.next(value)
      return value
    } else {
      this.awaited++
    }
  }

  public waitForTrigger = (): Promise<T> => {
    return new Promise(resolve => {
      const sub = this.subscribe(value => {
        sub.unsubscribe()
        resolve(value)
      })
    })
  }
}
