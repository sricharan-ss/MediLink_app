VitaData OTP Workflow

Overview

- OTP (one-time password) is used for phone and email-based authentication and signup flows.
- Short, stateless tokens are issued to verify ownership; long-lived auth tokens are issued after successful verification.

Flows

1) Login / Signup by phone (existing user or new user)

- Endpoint: `POST /api/auth/user`
  - Used by clients to start an OTP flow when a user provides `firstName`, `lastName` (for new users) and `phoneNumber`.
  - If the phone is new, a temporary user is created and an OTP is sent. If the phone exists, the user's OTP is updated and sent.
  - Response includes a short verification JWT (expires ~10 minutes). Client must call verify endpoint with this token.

Payload example:

{
  "firstName": "Test",
  "lastName": "User",
  "phoneNumber": "+919876543210"
}

2) Login by phone (existing user sends OTP)

- Endpoint: `POST /api/auth/login/phone`
  - Client supplies `phoneNumber`.
  - Server generates an OTP, stores a hashed value, sends SMS, and returns a short token (expires ~10 minutes).
  - Client calls `/api/auth/login/phone/verify` with OTP and the token in `Authorization: Bearer <token>`.

Payload example:

{
  "phoneNumber": "+919876543210"
}

3) Verify OTP

- Endpoint: `POST /api/auth/login/phone/verify` or use the generic verify endpoints used by signup flows.
  - Client sends `{ "otp": "123456" }` and includes the earlier short token in `Authorization` header.
  - Server validates token, compares provided OTP against the stored (hashed) OTP, then:
    - If valid: issues `accessToken` (short lived) and `refreshToken` (14 days) and deletes the stored OTP.
    - If invalid or token expired: returns error 400 with relevant message.

Implementation notes

- OTP generation: server uses `otp-generator` to create 6-character numeric (or mixed) OTPs and stores a bcrypt-hash in DB.
- Short verification tokens: different secrets are used depending on flow (`VERIFY_OTP_TOKEN_SECRET`, `LOGINPHONESECRET`). These tokens typically expire in 10 minutes.
- After successful verification the service generates `accessToken` (expires ~15m) and `refreshToken` (expires ~14d). Refresh token may be set as an httpOnly cookie in production.
- The server deletes the stored OTP after successful verification to prevent reuse.

Sending OTP / Email

- SMS or WhatsApp: `src/services/sendOtpByNumber.js` sends OTP via Twilio.
  - Required env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
  - Optional switch: `TWILIO_OTP_CHANNEL=sms|whatsapp`.
  - For WhatsApp Sandbox, set `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`.
  - If Twilio is not configured (local/test), the service logs the OTP to the server console with `[OTP-MOCK]` so development can proceed without external delivery.
- Email: `src/services/sendOtpByEmail.js` is used for email OTPs (signup / verify-by-email flows).

Endpoints summary

- `POST /api/auth/user` — start OTP signup/login (phone), returns short verification token.
- `POST /api/auth/login/phone` — start OTP login for existing user, returns short verification token.
- `POST /api/auth/login/phone/verify` — verify OTP with token, returns `accessToken` and `refreshToken` on success.

Environment variables (important)

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — Twilio auth + default sender.
- `TWILIO_OTP_CHANNEL` — `sms` or `whatsapp` (default `sms`).
- `TWILIO_WHATSAPP_FROM` — WhatsApp sender (sandbox commonly `whatsapp:+14155238886`).
- `VERIFY_OTP_TOKEN_SECRET` or fallback secrets — used to sign short verification tokens.
- `LOGINPHONESECRET` — used for phone-login short tokens.
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` — used to sign auth tokens.

Error cases & tips

- If SMS sending fails, the service returns a 500 and the client should display a retry message.
- Tokens are short-lived; client should surface clear UI for entering OTP quickly and allow requesting a new OTP.
- For local development, look for `[OTP-MOCK]` logs in server console when Twilio isn't configured.

Notes for frontends

- Keep the short verification token returned by the initial endpoint and include it in `Authorization: Bearer <token>` when calling the verify endpoint.
- After successful verification, store `accessToken` securely (in memory or secure storage) and use it for authenticated requests. Use the refresh token flow to obtain new access tokens.

OTP logic (implementation summary)

- Generate OTP: use `otp-generator` to create a 6-character code. Prefer numeric-only for SMS flows.
- Persist OTP: hash the OTP with `bcrypt` and store it on the user record or temp-user row in DB (`user.repo` functions handle this).
- Send OTP: call `src/services/sendOtpByNumber.js` for SMS or `src/services/sendOtpByEmail.js` for email. In local/test, SMS function logs `[OTP-MOCK]` with the OTP.
- Short verification token: after storing hashed OTP, create a short JWT (expires ~10m) signed with `VERIFY_OTP_TOKEN_SECRET` or `LOGINPHONESECRET` and return it to client.
- Verify step: client calls verify endpoint with `{ "otp": "..." }` and `Authorization: Bearer <short-token>`; server verifies JWT, fetches stored hashed OTP, compares with `bcrypt.compare`, then:
  - On success: create `accessToken` (expires ~15m) and `refreshToken` (expires ~14d), delete stored OTP, and return tokens.
  - On failure: return 400 with a clear message (invalid or expired token/OTP).

Pseudocode

1. requestOtp(phone):
  - otp = generate(6)
  - hashed = bcrypt.hash(otp)
  - saveOtpToDb(userId, hashed)
  - sendOtp(phone, otp)
  - return jwt.sign({ userId }, VERIFY_SECRET, { expiresIn: '10m' })

2. verifyOtp(token, otp):
  - data = jwt.verify(token, VERIFY_SECRET)
  - user = getUserWithOtp(data.userId)
  - if bcrypt.compare(otp, user.hashedOtp) -> issue access & refresh tokens; deleteOtp(userId)

Notes

- Keep OTPs short-lived and delete them after use to prevent replay.
- Log `[OTP-MOCK]` only in non-production environments.
- Make sure `TWILIO_*` and the various token secret env vars are set in production.

