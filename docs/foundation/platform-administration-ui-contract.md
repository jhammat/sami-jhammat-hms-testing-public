# WonFlow Platform Administration UI Contract

## Routes

| Route | Purpose |
| --- | --- |
| `/platform` | Platform overview |
| `/platform/organizations` | Tenant directory |
| `/platform/organizations/new` | Empty tenant creation form |
| `/platform/organizations/[organizationId]` | Tenant detail workspace |
| `/platform/entitlements` | Cross-tenant entitlement management |
| `/platform/subscriptions` | Cross-tenant subscription management |
| `/platform/support` | Temporary support-access management |
| `/platform/audit` | Platform audit |
| `/platform/settings` | Platform defaults and experience standards |

## Empty-first requirements

1. The tenant directory starts empty.
2. New tenants start in `draft`.
3. New tenants contain no branch records.
4. New tenants contain no user records.
5. New tenants have no configured subscription plan.
6. Every module entitlement starts disabled.
7. Support access starts empty.
8. Audit starts empty and grows only from operator actions.
9. Empty KPI cards display `0` or `—`.
10. No sample charts, fake organizations or seeded hospital data may be introduced.

## Tenant detail tabs

- Overview
- Branches
- Users
- Subscription
- Entitlements
- Settings
- Activity

## Approved experience rules

- White and very light blue/violet surfaces.
- Blue primary actions and violet accents.
- Rounded cards, subtle borders and soft shadows.
- PKR is the configurable default currency.
- “Main Branch” is the configurable default branch label.
- English is the default locale.
- Urdu is the configured secondary locale.
- Hospital logos appear only after upload; otherwise a neutral placeholder is shown.
- User avatars display a profile photo when available and initials otherwise.
- Avatar fallback is circular with a violet outline.
- Critical audit events use a deeper red surface and text treatment.
- Internal route transitions use the rotating WonFlow W loader.
- Reduced-motion behavior is inherited from the shared loader implementation.

## Safety rules

- Tenant suspension requires a reason.
- Tenant deletion requires typing the organization name exactly.
- Support access is explicit, time-limited and auditable.
- All entitlement changes generate an audit event.
- No password, secret, access token or payment credential is stored by this frontend adapter.
- The UI must not imply that browser-local configuration equals production persistence.

## Backend replacement points

The production phase must replace the local adapter with:

- authenticated platform-admin APIs;
- server-side validation;
- tenant provisioning transactions;
- authorization and permission enforcement;
- immutable audit persistence;
- secure support-access approval and session issuance;
- subscription/billing integration;
- logo object storage;
- organization, branch and user repositories.

The UI contracts and route structure should remain stable while those services are connected.
