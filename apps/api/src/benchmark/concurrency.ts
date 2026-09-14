/**
 * Runs `totalIterations` calls to `task` with at most `concurrency`
 * in flight at once — a small fixed-size worker pool, not an
 * unbounded `Promise.all(Array.from({length: iterations}, ...))`
 * which would fire every iteration simultaneously regardless of the
 * requested concurrency. Each worker pulls the next index only when
 * it finishes its previous one, so exactly `min(concurrency,
 * totalIterations)` operations ever run at the same time.
 *
 * Results are returned in index order (matching input order), not
 * completion order, so callers can correlate a result back to "which
 * iteration" if needed.
 */
export async function runWithConcurrency<T>(
  totalIterations: number,
  concurrency: number,
  task: (index: number) => Promise<T>,
): Promise<T[]> {
  const results: T[] = new Array(totalIterations);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= totalIterations) {
        return;
      }
      results[current] = await task(current);
    }
  }

  const workerCount = Math.min(concurrency, totalIterations);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
