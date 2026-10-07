import {
  AuthSessionRepository,
  emptySessionCache
} from "../../apps/platform/api/src/auth/auth-session.repository.js";
import { verifyAuthToken } from "../../apps/platform/api/src/auth/jwt.js";

const sessions = new AuthSessionRepository();

export async function registerSyntheticSession(token: string) {
  const payload = verifyAuthToken(token);
  if (!payload) throw new Error("The E2E bearer token is invalid.");
  await sessions.create({
    context: emptySessionCache(),
    expiresAt: new Date(payload.exp * 1000),
    jti: payload.jti,
    loginHost: payload.loginHost,
    tenantAccessMode: payload.tenantAccessMode,
    tenantCode: payload.tenantCode ?? null,
    tenantDbName: payload.tenantDbName ?? null,
    tenantId: payload.tenantId ?? null,
    userEmail: payload.email,
    userName: payload.name ?? null,
    userType: payload.userType,
    userUuid: payload.userId
  });
}
