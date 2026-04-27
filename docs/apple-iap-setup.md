# Apple In-App Purchase — Server-Side Setup

This document covers configuration required for the Milesto backend to verify Apple StoreKit transactions and process Apple Server Notifications V2.

## Apple Root CA certificates

`@apple/app-store-server-library` does NOT ship Apple root certificates. Four DER-encoded `.cer` files must be present in the directory referenced by `APPLE_ROOT_CA_DIR` (default: `api/resources/apple-root-certs/`):

- `AppleIncRootCertificate.cer` — https://www.apple.com/appleca/AppleIncRootCertificate.cer
- `AppleRootCA-G2.cer` — https://www.apple.com/certificateauthority/AppleRootCA-G2.cer
- `AppleRootCA-G3.cer` — https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
- `AppleComputerRootCertificate.cer` — https://www.apple.com/certificateauthority/AppleComputerRootCertificate.cer

These are public root CA certs and are committed to the repo. If Apple rotates or deprecates a root, refresh the directory. On startup, `loadAppleRootCertificates` fails closed (throws) if the directory is missing or empty — this is intentional: running the verifier without trusted roots would accept unsigned data.

Validate a `.cer` is well-formed DER:

```bash
openssl x509 -inform DER -in resources/apple-root-certs/AppleIncRootCertificate.cer -noout -subject -issuer
```

## Environment variables

| Name                   | Required        | Description                                                                                                         |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `APPLE_BUNDLE_ID`      | Always          | Must match Xcode `PRODUCT_BUNDLE_IDENTIFIER`. Current value: `app.milesto-ai.auth.mobile`.                          |
| `APPLE_ENVIRONMENT`    | Always          | `Sandbox` (default) or `Production`.                                                                                |
| `APPLE_APP_APPLE_ID`   | Production only | Numeric App Apple ID from App Store Connect. Required when `APPLE_ENVIRONMENT=Production`; startup fails otherwise. |
| `APPLE_ROOT_CA_DIR`    | Optional        | Path to Apple root cert directory. Default `resources/apple-root-certs`.                                            |
| `APPLE_ISSUER_ID`      | Follow-up       | App Store Server API issuer (UUID). Needed for reconciliation; not required for webhook path.                       |
| `APPLE_KEY_ID`         | Follow-up       | App Store Server API key ID (10-char).                                                                              |
| `APPLE_PRIVATE_KEY_P8` | Follow-up       | `.p8` private key contents.                                                                                         |

If any of the three follow-up vars are missing, `AppStoreServerApiService` logs `App Store Server API not configured — reconciliation disabled` once at startup and the reconciliation methods throw `NotImplementedException` if called.

## Environment-aware verifier

The service constructs one `SignedDataVerifier` for the configured environment, plus an additional `Sandbox` verifier when running in `Production`. This is required because TestFlight builds submit sandbox transactions to the Production backend — on `VerificationStatus.INVALID_ENVIRONMENT`, the service retries with the sandbox verifier. Any other verification failure (e.g. `VERIFICATION_FAILURE`, `INVALID_APP_IDENTIFIER`) is rethrown and surfaced as HTTP 401.

## App Store Connect configuration

### Server Notifications V2

1. App Store Connect → your app → **App Information** → **App Store Server Notifications**.
2. Set Version to **Version 2**.
3. Production URL: `https://api.milesto.app/api/subscription/apple-webhook`.
4. Sandbox URL: same path on your staging host.
5. Save. Use the **Request Test Notification** button after every deploy to confirm the backend responds `200`.

### Subscription products

Ensure the following products exist and are **Approved** in App Store Connect:

- `milesto_monthly`
- `milesto_quarterly`

The product IDs are validated server-side in `subscription.service.ts` and must match `config.apple.productIds`.

### Family Sharing

**Verify Family Sharing is DISABLED on both SKUs.** Apple's own documentation notes that once Family Sharing is enabled for an in-app purchase it **cannot be disabled**. Family-shared transactions are rejected server-side (`inAppOwnershipType === 'FAMILY_SHARED'` → HTTP 401), so family members who have accepted a share would hit a silent entitlement failure in the app — poor UX, hard to diagnose. Until the app supports Family Sharing end-to-end, keep this setting off.

To check: App Store Connect → product → **Subscription Information** → **Family Sharing**.

## Webhook response codes

| Outcome                                                        | HTTP                |
| -------------------------------------------------------------- | ------------------- |
| Processed, state updated                                       | 200                 |
| Duplicate notificationUUID (idempotent)                        | 200                 |
| Known ignored type (e.g. `CONSUMPTION_REQUEST`)                | 200                 |
| Stale `signedDate` (older than stored)                         | 200                 |
| No user found for transaction                                  | 200                 |
| Missing/empty `signedPayload`                                  | 400                 |
| Signature verification failed                                  | 401                 |
| Transaction not bound to authenticated user (verify path only) | 401                 |
| Real DB error (non-"no rows")                                  | 500 (Apple retries) |

Apple retries on 4xx and 5xx, so returning 200 on known-ignored conditions prevents retry storms. 500 is reserved for transient backend errors where retry is desired.

## DB schema touchpoints

- `profiles.subscription_status` — `active`, `grace_period`, `billing_retry`, `expired`, `revoked`, or `unknown`. Includes `grace_period` in `isPro` checks.
- `profiles.subscription_apple_signed_at` — Apple's `signedDate` for monotonicity; guards against out-of-order webhooks.
- `profiles.subscription_auto_renew_status` — Updated from `DID_CHANGE_RENEWAL_STATUS` subtypes and renewal info.
- `profiles.subscription_environment` — `Sandbox` or `Production`.
- `processed_notifications` — Dedupe table keyed by `notification_uuid`. RLS deny-all.

## Local development

1. Install deps: `cd api && bun install`.
2. Create `.env` from `.env.example`. Set `APPLE_BUNDLE_ID=app.milesto-ai.auth.mobile` and `APPLE_ENVIRONMENT=Sandbox`.
3. Ensure `api/resources/apple-root-certs/` contains the four `.cer` files (already committed).
4. Run `bun run test` to validate the wiring.
5. To exercise the webhook end-to-end, use Apple Request Test Notification or expose your local server via a tunnel and point Sandbox URL at it.

## Sandbox testing playbook

1. Create a sandbox Apple ID in App Store Connect → **Users and Access** → **Sandbox Testers**.
2. Sign the device into the sandbox account (`Settings` → `App Store` → sandbox account section).
3. Launch the app, purchase `milesto_monthly`.
4. Check `profiles` row for the user: `subscription_status = 'active'`, `subscription_product_id = 'milesto_monthly'`, `subscription_apple_signed_at` set, `subscription_environment = 'Sandbox'`.
5. Accelerated renewal cycles (monthly → 5 min) allow observing `DID_RENEW`, `DID_FAIL_TO_RENEW`, `EXPIRED` webhook transitions in real time.
6. Use App Store Connect's sandbox refund tool to exercise `REFUND` → `revoked`.

## Troubleshooting

- **Signature fails in production only**: Production APNs key or root CA set may be out of date, or `APPLE_APP_APPLE_ID` unset — Production verifier requires it.
- **"No Apple root certs found"** on startup: `APPLE_ROOT_CA_DIR` points to wrong path, or `.cer` files not mounted in the deployment image. Verify `ls $APPLE_ROOT_CA_DIR`.
- **Webhooks all 401**: Bundle ID mismatch. Compare `APPLE_BUNDLE_ID` with Xcode `PRODUCT_BUNDLE_IDENTIFIER` and App Store Connect app record.
- **Everything returns 200 but profiles never update**: Check that `appAccountToken` is being set on the iOS purchase path and that the backend's `profiles.id` matches the token UUID.
