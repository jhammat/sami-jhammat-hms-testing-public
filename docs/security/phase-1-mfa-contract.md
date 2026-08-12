# WonFlow Phase 1 MFA Contract

- MFA secrets must be encrypted before database storage.
- MFA secrets must never appear in logs or audit metadata.
- TOTP verification permits a small clock window.
- Recovery codes are stored only as hashes.
- Recovery codes are single-use.
- MFA enrollment is pending until the first valid code is confirmed.
- Login must use a short-lived challenge ID rather than exposing identity ID.
- Platform administrators and support-access users require MFA.
- Tenant MFA requirements are configurable.
- Resetting MFA requires an explicit permission and a critical audit event.

Do not store a plaintext TOTP secret. Use an authenticated encryption implementation before enabling MFA in production.
