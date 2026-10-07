import type { useNavigate } from "@tanstack/react-router";

type Navigate = ReturnType<typeof useNavigate>;

export type TaskProgress = {
  signedIn: boolean;
  country: "Ghana" | "Nigeria" | null;
  linked: boolean;
  activated: boolean;
};

/** Registration, country, SportyBet connection, activation, then package prices. */
export function taskStep(link: TaskProgress): 1 | 2 | 3 | 4 | 5 {
  if (!link.signedIn) return 1;
  if (link.country !== "Ghana" && link.country !== "Nigeria") return 2;
  if (!link.linked) return 3;
  if (!link.activated) return 4;
  return 5;
}

export async function openTask(navigate: Navigate, link: TaskProgress) {
  const step = taskStep(link);
  if (step === 1) {
    await navigate({ to: "/register" });
    return;
  }
  if (step === 2) {
    await navigate({ to: "/country" });
    return;
  }
  if (step === 3) {
    await navigate({ to: "/connect" });
    return;
  }
  if (step === 4) {
    await navigate({ to: "/activation" });
    return;
  }
  if (link.country === "Nigeria") {
    await navigate({ to: "/nigeria-pay" });
    return;
  }
  await navigate({ to: "/packages", search: { stay: 1 } });
}
