import { runConcurrent } from "../../src/shared/concurrency";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("runConcurrent", () => {
  it("processes each entry once without exceeding the concurrency limit", async () => {
    const entries = Array.from({ length: 24 }, (_, index) => index);
    const controller = new AbortController();
    const visited: number[] = [];
    let active = 0;
    let maxActive = 0;

    await runConcurrent(entries, 4, controller.signal, async (entry) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(2);
      visited.push(entry);
      active -= 1;
    });

    expect([...visited].sort((left, right) => left - right)).toEqual(entries);
    expect(maxActive).toBeLessThanOrEqual(4);
  });

  it("stops scheduling new work after cancellation", async () => {
    const entries = Array.from({ length: 60 }, (_, index) => index);
    const controller = new AbortController();
    const visited = new Set<number>();

    await runConcurrent(entries, 5, controller.signal, async (entry) => {
      visited.add(entry);

      if (visited.size === 7) {
        controller.abort();
      }

      await sleep(2);
    });

    expect(visited.size).toBeLessThan(entries.length);
  });
});
