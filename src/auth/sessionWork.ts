/** A queue belongs to one login session. Old jobs never acquire a new account's cookie. */
export class SessionWork {
  private generation = 0;
  private owner = '';
  private tail: Promise<unknown> = Promise.resolve();
  private controllers = new Set<AbortController>();
  begin(owner: string) { this.cancel(); this.owner = owner; }
  cancel() { this.generation++; this.owner = ''; for (const controller of this.controllers) controller.abort(); this.controllers.clear(); this.tail = Promise.resolve(); }
  async run<T>(job: (owner: string, signal: AbortSignal) => Promise<T>): Promise<T> {
    const generation = this.generation, owner = this.owner;
    const pending = this.tail.then(async () => {
      if (!owner || generation !== this.generation) throw new DOMException('Session changed', 'AbortError');
      const controller = new AbortController(); this.controllers.add(controller);
      try {
        const result = await job(owner, controller.signal);
        if (generation !== this.generation) throw new DOMException('Session changed', 'AbortError');
        return result;
      } finally { this.controllers.delete(controller); }
    });
    this.tail = pending.catch(() => undefined);
    return pending;
  }
}
export function isCancelled(error: unknown) { return error instanceof Error && error.name === 'AbortError'; }
