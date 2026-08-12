# P1-15 — Owner-entered tenant configuration

## Status

Accepted.

## Decision

WonFlow will not contain a tenant-specific bootstrap or seed.

The mock tenant bootstrap creates only:

- the provisioning request;
- the organization subscription;
- the owner assignment;
- selected module activations; and
- an empty onboarding state.

It does not create tenant profile values, branding, locations,
schedules, services, fees, team members, permissions, policies,
content, patients, appointments, documents, messages or payments.

The organization owner enters all tenant configuration through the
onboarding and management screens.

## Reason

WonFlow is a generic multi-tenant platform. A tenant-specific seed
would make live configuration dependent on source code and deployment.

The owner must be able to create and change every tenant value without
developer involvement.

## Demo environments

Any future populated demo environment must:

- use a fictional generic organization;
- contain only fictional staff and patients;
- be gated behind the demo-data feature;
- call the same public operations used by the application;
- remain completely separate from production provisioning; and
- never contain a live tenant's data.

## Production

The production database provisioning seed creates platform-level
administration only.

Live organizations are provisioned through platform administration and
configured by their owners through the application.
