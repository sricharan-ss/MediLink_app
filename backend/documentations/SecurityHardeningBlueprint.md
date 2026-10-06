# Security Hardening Blueprint

## Objective

This single document defines the security architecture for VitaData backend and frontend flows with focus on:
- High security and data leak prevention
- Bot resistance (captcha + tracking)
- Consistent auth/session behavior with TTL
- Cookie-based secure auth with CSRF protection
- Client no-backtrack behavior after logout
- Multiple secure API paths with strict authorization

---

## 1. Security Baseline (Must Have)

### 1.1 Transport and Headers
- Enforce HTTPS in production (TLS 1.2+)
- Add `helmet` middleware globally
- Enable HSTS in production
- Disable `x-powered-by`
- Add strict cache headers for auth-protected endpoints

Recommended header behavior:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store, no-cache, must-revalidate, private`

### 1.2 Input and Request Limits
- Limit JSON body size (`100kb` for normal APIs)
- Validate all inputs with Zod
- Sanitize strings for XSS where rich text is accepted
- Add endpoint-wise rate limiting (auth routes stricter than normal routes)

### 1.3 Secrets and Environment
- Use only strong secrets for:
  - `ACCESS_TOKEN_SECRET`
  - `REFRESH_TOKEN_SECRET`
  - `VERIFY_OTP_TOKEN_SECRET`
  - `JWT_ADMIN_SECRET`
- Keep secrets out of code and git
- Rotate secrets on schedule

---

## 2. Captcha + Bot Tracking

### 2.1 Where captcha is mandatory
- `POST /api/auth/user` (OTP request)
- `POST /api/auth/login-phone` (login initiation)
- `POST /api/auth/signup-email`
- Any endpoint with repeated failed attempts from same IP/device

### 2.2 Bot tracking signals
Track and score by:
- IP + subnet
- User-Agent fingerprint
- Device fingerprint (frontend generated hash)
- Velocity (requests/minute per route)
- OTP failure ratio
- Geo mismatch between consecutive requests

Risk policy:
- Low risk: allow
- Medium risk: require captcha
- High risk: block for cooldown TTL

### 2.3 Store abuse state with TTL (Redis preferred)
Keys example:
- `abuse:ip:{ip}` -> TTL 10m
- `abuse:phone:{phone}` -> TTL 30m
- `abuse:device:{fingerprint}` -> TTL 30m
- `otp:lock:{phone}` -> TTL 15m

---

## 3. Encryption and Data Protection

### 3.1 In transit
- HTTPS only for public endpoints
- Secure cookies only in production

### 3.2 At rest
- Database disk encryption enabled at infra level
- Encrypt sensitive fields application-side (AES-256-GCM)
- Never store raw OTP, password, MPIN (already hashed with bcrypt)

### 3.3 Key management
- Use key identifiers (`kid`) for encrypted fields
- Keep active + previous keys during rotation window
- Decrypt with `kid` selected key only
- Store keys in KMS/secret manager

### 3.4 File encryption
For sensitive uploads (vault/medical docs):
- Encrypt file before persistence
- Store encrypted blob only
- Decrypt only on authorized download path
- Signed URL + short TTL for file access

---

## 4. Login TTL, Session, and `JSESSIONID` Style Cookie

### 4.1 Token/session model
Use split model:
- Access token (short TTL, e.g. 15 minutes)
- Refresh token in secure cookie (longer TTL, e.g. 14 days)
- Server session record (optional but recommended) with TTL for revocation tracking

### 4.2 `JSESSIONID` requirement in this stack
This project is Node/Express, not Java servlet container. Equivalent approach:
- Use cookie name `JSESSIONID` (or `sid`) for session identifier
- Map `JSESSIONID` -> server session state (Redis)
- On login: create session row with TTL
- On logout: revoke session + clear cookie

Session data (minimal):
- `sessionId`
- `userId`
- `issuedAt`
- `expiresAt`
- `ipHash`
- `deviceHash`

### 4.3 TTL rules after login
- Access token TTL: 15m
- Refresh token TTL: 14d
- Idle timeout for session: 30m inactivity (sliding)
- Absolute session lifetime: 14d max

---

## 5. CSRF + Cookie-Based Security

### 5.1 Cookie settings (mandatory)
For auth cookies:
- `httpOnly: true`
- `secure: true` in production
- `sameSite: 'strict'` (or `'lax'` if needed for UX)
- `path: '/api/auth'` for refresh/session cookies where possible

### 5.2 CSRF protection model
If using cookie-based auth for state-changing requests:
- Use CSRF token (double-submit or synchronizer token pattern)
- Return CSRF token via dedicated endpoint after auth
- Frontend sends token in `X-CSRF-Token`
- Validate token + origin/referer for mutating methods

Apply CSRF checks to:
- `POST`, `PUT`, `PATCH`, `DELETE`
- Exclude pure bearer-token-only routes only if no cookies used there

---

## 6. No Backtrack Logic from Client Side

Goal: user should not see protected pages after logout using browser back button.

### 6.1 Client controls
- Clear in-memory auth state on logout
- Clear local/session storage auth artifacts
- Force route guard check on every protected route transition
- Use `history.replace` on logout redirect to remove previous protected entry

### 6.2 Server controls (required, not optional)
- Return `401` for revoked/expired tokens/sessions
- Add no-store headers for protected responses
- Never trust client-side route guards alone

Recommended response headers on protected API responses:
- `Cache-Control: no-store, no-cache, must-revalidate, private`
- `Pragma: no-cache`
- `Expires: 0`

---

## 7. Multiple Secure Paths (Path Segmentation)

Design separate secure paths by function and privilege:
- `/api/auth/*` -> public + captcha + strict limits
- `/api/patient/*` -> PATIENT only
- `/api/staff/*` -> DOCTOR/NURSE/RECEPTIONIST/LAB_MANAGER/INVENTORY_MANAGER
- `/api/admin/*` -> HOSPITAL_ADMIN/SUPER_ADMIN
- `/api/internal/*` -> service-to-service only (IP allowlist + signed tokens)

### 7.1 Per-path controls
- Dedicated rate limits per path group
- Role middleware per path group
- Audit log all admin and write actions
- Extra bot checks for auth and password/OTP flows

### 7.2 Idempotency for consistency
For payment/order and booking endpoints:
- Require `Idempotency-Key`
- Store key hash + response for TTL window
- Return same response for retries

---

## 8. Recommended Middleware Order (Express)

1. `requestId`
2. `helmet`
3. `cors` (strict allowlist)
4. `cookieParser`
5. `bodyParser` with limits
6. `requestLogger` (PII-safe)
7. global rate limiter
8. auth-specific limiter for `/api/auth/*`
9. captcha verification middleware (where required)
10. csrf middleware for state-changing cookie-auth routes
11. auth middleware
12. role/access middleware
13. business routes
14. error middleware (sanitized errors)

---

## 9. Audit and Incident Readiness

Log these events with redaction:
- Login success/failure
- OTP send/verify outcomes
- Captcha failures
- Session creation/refresh/logout/revocation
- Admin writes and privilege changes
- Payment verification and refunds

Never log:
- OTP values
- Passwords/MPIN
- Full tokens
- Full PII payloads

---

## 10. Acceptance Checklist

- [ ] Captcha enforced on auth-sensitive endpoints
- [ ] Bot risk scoring + TTL lockouts enabled
- [ ] Cookie flags set (`httpOnly`, `secure`, `sameSite`, scoped path)
- [ ] CSRF token validation active for mutating cookie-auth requests
- [ ] Session identifier (`JSESSIONID`/`sid`) with server TTL implemented
- [ ] Access/refresh TTL policy implemented and tested
- [ ] Encryption utilities + key rotation implemented
- [ ] No-store headers on protected responses
- [ ] Logout prevents back-navigation access to protected data
- [ ] Role/path segmentation verified (`/auth`, `/patient`, `/staff`, `/admin`, `/internal`)
- [ ] Idempotency enabled for booking/payment critical routes

---

## 11. Implementation Notes for Current Repository

Based on current codebase status:
- Some middleware files are present but currently no-op/empty and must be implemented before production
- Refresh token cookie is set in multiple auth handlers; all must be standardized with secure cookie options
- Encryption utility files exist but are empty; implement these before handling highly sensitive data
- Keep Prisma transaction usage for critical writes and add idempotency where race conditions are possible

---

## 12. Security File Inventory and Purpose

### 12.1 `src/encryption` folder

- `src/encryption/encryption.config.js`: Central crypto configuration (algorithm, key IDs, IV/tag sizes, versioning, and safe defaults).
- `src/encryption/encryption.util.js`: Core field-level encrypt/decrypt helpers (AES-256-GCM), payload envelope format, and `kid` handling.
- `src/encryption/file-encryption.util.js`: Streaming/file encryption and decryption helpers for vault documents and secure download paths.
- `src/encryption/hash.util.js`: One-way hashing helpers for integrity checks, signatures, and deterministic fingerprints where needed.
- `src/encryption/key-management.js`: Key lookup and rotation orchestration (active key, previous keys, grace window, key metadata).

### 12.2 `src/security` folder

- `src/security/captcha.service.js`: Captcha verification adapter and policy checks for auth-sensitive endpoints.
- `src/security/botTracking.service.js`: Bot risk scoring and abuse state tracking (IP/device/velocity/failure patterns with TTL).
- `src/security/csrf.service.js`: CSRF token generation and validation (double-submit or synchronizer-token pattern).
- `src/security/session.service.js`: Server-side session lifecycle (`JSESSIONID`/`sid` mapping, create/revoke/validate, idle and absolute TTL).
- `src/security/tokenTtl.service.js`: Unified token/session TTL constants and helper logic for expiry/sliding behavior.
- `src/security/cookieSecurity.service.js`: Standardized secure cookie options (`httpOnly`, `secure`, `sameSite`, scoped `path/domain`).
- `src/security/noBacktrack.service.js`: Response header and logout helpers to prevent cached protected page back-navigation.
- `src/security/securePathPolicy.service.js`: Route-group policy mapping (`/auth`, `/patient`, `/staff`, `/admin`, `/internal`) and enforcement hooks.
- `src/security/idempotency.service.js`: `Idempotency-Key` validation and replay-safe response caching for critical write endpoints.

### 12.3 Current state note

- Files in `src/security` are intentionally created as empty placeholders for phased implementation.
- Several files in `src/encryption` currently exist and should be fully implemented before production rollout.

This document is the single source of truth for security hardening rollout in VitaData.
