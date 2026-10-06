import { createMiddleware } from "@tanstack/react-start";

export const adminAuthMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { requireAdminSession } = await import("./admin-auth.server");
  await requireAdminSession();
  return next();
});
