import assert from "node:assert/strict";
import { test } from "node:test";
import { activationFee } from "./activation.ts";
import { openTask, taskStep, type TaskProgress } from "./task-order.ts";

test("activation fees are country-specific", () => {
  assert.equal(activationFee("Ghana"), 50);
  assert.equal(activationFee("Nigeria"), 7000);
});

test("number linking routes to activation until approval, then to the correct packages", async () => {
  for (const country of ["Ghana", "Nigeria"] as const) {
    const link: TaskProgress = { signedIn: true, country, linked: true, activated: false };
    let destination: string | undefined;
    const navigate: Parameters<typeof openTask>[0] = async (options) => {
      destination = typeof options.to === "string" ? options.to : undefined;
    };
    assert.equal(taskStep(link), 4);
    await openTask(navigate, link);
    assert.equal(destination, "/activation");
    link.activated = true;
    assert.equal(taskStep(link), 5);
    await openTask(navigate, link);
    assert.equal(destination, country === "Nigeria" ? "/nigeria-pay" : "/packages");
  }
});

test("activation does not bypass registration, country selection, or number linking", () => {
  const link: TaskProgress = { signedIn: false, country: null, linked: false, activated: false };
  assert.equal(taskStep(link), 1);
  link.signedIn = true;
  assert.equal(taskStep(link), 2);
  link.country = "Ghana";
  assert.equal(taskStep(link), 3);
});
