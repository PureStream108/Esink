import { runConcurrent } from "../../src/shared/concurrency";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("runConcurrent stress", () => {
  it("handles large workloads without dropping entries", async () => {
    const entries = Array.from({ length: 1200 }, (_, index) => index);
    const controller = new AbortController();
    const visited = new Set<number>();
    let active = 0;
    let maxActive = 0;

    await runConcurrent(entries, 16, controller.signal, async (entry) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(entry % 7 === 0 ? 2 : 1);
      visited.add(entry);
      active -= 1;
    });

    expect(visited.size).toBe(entries.length);
    expect(maxActive).toBeLessThanOrEqual(16);
  });

  it("stops early when cancelled under load", async () => {
    const entries = Array.from({ length: 2000 }, (_, index) => index);
    const controller = new AbortController();
    let processed = 0;

    await runConcurrent(entries, 24, controller.signal, async () => {
      processed += 1;

      if (processed === 120) {
        controller.abort();
      }

      await sleep(1);
    });

    expect(processed).toBeLessThan(entries.length);
  });
});
