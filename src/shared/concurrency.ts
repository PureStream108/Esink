export async function runConcurrent<T>(
  entries: readonly T[],
  limit: number,
  signal: AbortSignal,
  worker: (entry: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;

  const consume = async (): Promise<void> => {
    while (!signal.aborted) {
      const currentIndex = cursor;
      cursor += 1;

      if (currentIndex >= entries.length) {
        return;
      }

      await worker(entries[currentIndex], currentIndex);
    }
  };

  const workers = Array.from({ length: Math.max(1, Math.min(limit, entries.length)) }, () => consume());
  await Promise.allSettled(workers);
}
