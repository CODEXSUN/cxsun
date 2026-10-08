export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== "/internal/readiness") {
      return Response.json({ status: "pending_port" }, { status: 503 });
    }

    try {
      await Promise.all([
        env.PLATFORM_DB.prepare("SELECT 1").first(),
        env.TENANT_DB.prepare("SELECT 1").first()
      ]);
      return Response.json({ databases: "ready", status: "pending_port" }, { status: 503 });
    } catch (error) {
      console.error(JSON.stringify({ event: "demo_database_readiness_failed", error: String(error) }));
      return Response.json({ databases: "unavailable", status: "pending_port" }, { status: 503 });
    }
  }
};
