import assert from "node:assert/strict";
import test from "node:test";
import {
  claimsMatchSession,
  isPublicAuthenticationPath,
  isTrustedInternalBearerRequest,
  selectRequestAuthentication
} from "./auth-request-context.js";
import { emptySessionCache, type AuthSessionRecord } from "./auth-session.repository.js";
import { signAuthToken, verifyAuthToken } from "./jwt.js";

test("a browser cookie takes precedence over a stale legacy bearer token", () => {
  assert.deepEqual(selectRequestAuthentication("stale-bearer", "active-cookie"), {
    source: "cookie",
    token: "active-cookie"
  });
  assert.deepEqual(selectRequestAuthentication("api-bearer", ""), {
    source: "bearer",
    token: "api-bearer"
  });
  assert.equal(selectRequestAuthentication("", ""), null);
});

test("accepts a bearer token forwarded over the loopback platform API connection", () => {
  assert.equal(isTrustedInternalBearerRequest("bearer", "127.0.0.1", "127.0.0.1"), true);
  assert.equal(isTrustedInternalBearerRequest("bearer", "localhost", "::1"), true);
});

test("does not trust cookies, public hosts, or non-loopback peers as internal forwarding", () => {
  assert.equal(isTrustedInternalBearerRequest("cookie", "127.0.0.1", "127.0.0.1"), false);
  assert.equal(isTrustedInternalBearerRequest("bearer", "app.codexsun.com", "127.0.0.1"), false);
  assert.equal(isTrustedInternalBearerRequest("bearer", "127.0.0.1", "192.0.2.10"), false);
});

test("allows the exact session reset route to bypass broken tenant validation", () => {
  assert.equal(isPublicAuthenticationPath("/auth/session/reset"), true);
  assert.equal(isPublicAuthenticationPath("/auth/session/reset/other"), false);
});

test("keeps public application routes available when a stale session cookie is present", () => {
  assert.equal(isPublicAuthenticationPath("/public/runtime-config"), true);
  assert.equal(isPublicAuthenticationPath("/public/app-portal"), true);
  assert.equal(isPublicAuthenticationPath("/public/blog/article"), true);
  assert.equal(isPublicAuthenticationPath("/publicity"), false);
  assert.equal(isPublicAuthenticationPath("/ready"), true);
});

test("requires a matching active server session for bearer and cookie claims", () => {
  const payload = verifyAuthToken(
    signAuthToken({ email: "session@example.test", userId: "user-1", userType: "super_admin" })
  );
  assert.ok(payload);
  const session: AuthSessionRecord = {
    context: emptySessionCache(),
    expiresAt: new Date(payload.exp * 1000),
    jti: payload.jti,
    lastSeenAt: new Date(),
    loginHost: payload.loginHost,
    revokedAt: null,
    tenantAccessMode: payload.tenantAccessMode,
    tenantCode: null,
    tenantDbName: null,
    tenantId: null,
    userEmail: payload.email,
    userName: null,
    userType: payload.userType,
    userUuid: payload.userId,
    uuid: "session-1"
  };
  assert.equal(claimsMatchSession(payload, session), true);
  assert.equal(claimsMatchSession(payload, null), false);
  assert.equal(claimsMatchSession(payload, { ...session, jti: "other" }), false);
});
