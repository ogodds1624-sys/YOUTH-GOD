const CONNECTION_WINDOWS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  3: [[30_000, 90_000], [120_000, 150_000]],
  10: [[60_000, 360_000], [480_000, 540_000]],
  15: [[120_000, 420_000], [480_000, 780_000]],
};

export function connectionWaitSeconds(mins: number, elapsedMs: number): number | null {
  const window = CONNECTION_WINDOWS[mins]?.find(
    ([start, end]) => elapsedMs >= start && elapsedMs < end,
  );
  return window ? Math.ceil((window[1] - elapsedMs) / 1000) : null;
}
