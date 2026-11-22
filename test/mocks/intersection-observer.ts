// A pretend IntersectionObserver for the tests (the test browser, jsdom,
// has none). It never fires by itself, like a page that hasn't been
// scrolled; a test calls scrollIntoView() to say "everything being watched
// is now near the screen" (used by the review video thumbnail, which loads
// only near the screen).
type Watcher = { callback: IntersectionObserverCallback; targets: Set<Element>; observer: IntersectionObserver };

const watchers = new Set<Watcher>();

class PretendIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  private readonly watcher: Watcher;

  constructor(callback: IntersectionObserverCallback) {
    this.watcher = { callback, targets: new Set(), observer: this };
    watchers.add(this.watcher);
  }
  observe(target: Element) {
    this.watcher.targets.add(target);
  }
  unobserve(target: Element) {
    this.watcher.targets.delete(target);
  }
  disconnect() {
    this.watcher.targets.clear();
    watchers.delete(this.watcher);
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

export function installPretendIntersectionObserver() {
  globalThis.IntersectionObserver = PretendIntersectionObserver;
}

// Everything being watched comes near the screen.
export function scrollIntoView() {
  for (const { callback, targets, observer } of [...watchers]) {
    const entries = [...targets].map((target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry);
    if (entries.length > 0) callback(entries, observer);
  }
}
