export type TenantSession = {
  authenticated: boolean;
  context?: { enabledModuleKeys: string[] };
  email: string;
  name?: string;
  userType: string;
};

type SessionEnvelope =
  { success: true; data: TenantSession } | { success: false; error: { message: string } };

export async function loadTenantSession(): Promise<TenantSession> {
  const response = await fetch("/api/platform/auth/session", {
    credentials: "include",
    headers: { "x-auth-desk": "tenant" }
  });
  const envelope = (await response.json()) as SessionEnvelope;
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "Session request failed." : envelope.error.message);
  }
  return envelope.data;
}

export async function endTenantSession(): Promise<void> {
  await fetch("/api/platform/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "x-auth-desk": "tenant" }
  });
}
