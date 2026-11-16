/** Server-side error capture: unhandled request errors are written to error_logs (admins only). */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const e = error instanceof Error ? error : new Error(String(error));
    await createAdminClient()
      .from("error_logs")
      .insert({
        level: "error",
        message: e.message.slice(0, 1000),
        stack: e.stack?.slice(0, 4000) ?? null,
        digest: (e as Error & { digest?: string }).digest ?? null,
        url: request.path.slice(0, 500),
        context: { method: request.method, route: context.routePath, type: context.routeType, server: true },
      });
  } catch {
    // Logging must never throw.
  }
}
