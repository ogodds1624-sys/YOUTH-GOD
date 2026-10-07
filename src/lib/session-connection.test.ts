import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { connectionWaitSeconds } from "./session-connection.ts";

describe("connectionWaitSeconds", () => {
  it("follows the fifteen-minute sequence at every transition", () => {
    for (const [elapsedMs, expected] of [
      [0, null],
      [119_999, null],
      [120_000, 300],
      [419_999, 1],
      [420_000, null],
      [479_999, null],
      [480_000, 300],
      [779_999, 1],
      [780_000, null],
      [899_999, null],
      [900_000, null],
    ] as const) {
      assert.equal(connectionWaitSeconds(15, elapsedMs), expected);
    }
  });

  it("follows the ten-minute sequence at every transition", () => {
    for (const [elapsedMs, expected] of [
      [0, null],
      [59_999, null],
      [60_000, 300],
      [359_999, 1],
      [360_000, null],
      [479_999, null],
      [480_000, 60],
      [539_999, 1],
      [540_000, null],
      [600_000, null],
    ] as const) {
      assert.equal(connectionWaitSeconds(10, elapsedMs), expected);
    }
  });

  it("preserves the three-minute sequence", () => {
    for (const [elapsedMs, expected] of [
      [0, null],
      [29_999, null],
      [30_000, 60],
      [89_999, 1],
      [90_000, null],
      [119_999, null],
      [120_000, 30],
      [149_999, 1],
      [150_000, null],
      [180_000, null],
    ] as const) {
      assert.equal(connectionWaitSeconds(3, elapsedMs), expected);
    }
  });

  it("resumes the correct countdown from elapsed time after a reload", () => {
    assert.equal(connectionWaitSeconds(15, 180_000), 240);
    assert.equal(connectionWaitSeconds(15, 600_000), 180);
    assert.equal(connectionWaitSeconds(10, 180_000), 180);
    assert.equal(connectionWaitSeconds(10, 510_000), 30);
    assert.equal(connectionWaitSeconds(3, 60_000), 30);
  });

  it("does not interrupt other session lengths", () => {
    for (const mins of [5, 7]) {
      for (const elapsedMs of [30_000, 60_000, 120_000, 480_000]) {
        assert.equal(connectionWaitSeconds(mins, elapsedMs), null);
      }
    }
  });
});
