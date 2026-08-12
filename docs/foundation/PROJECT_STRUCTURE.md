# WonFlow Project Structure

## Root Structure

```text
wonflow
??? apps
?   ??? web
??? packages
?   ??? config
?   ??? contracts
?   ??? database
?   ??? mock-data
?   ??? ui
?   ??? validation
??? tooling
?   ??? scripts
?   ??? typescript
??? docs
?   ??? foundation
??? .gitignore
??? package.json
??? pnpm-lock.yaml
??? pnpm-workspace.yaml
??? README.md
```

## apps/web

The main Next.js application.

Important paths:

```text
apps/web
??? public
??? src
?   ??? app
?       ??? globals.css
?       ??? layout.tsx
?       ??? page.tsx
??? components.json
??? eslint.config.mjs
??? next.config.ts
??? package.json
??? tsconfig.json
```

Responsibilities:

- Application routes
- Portal layouts
- Role-specific pages
- Client and server components
- Application-level providers
- Frontend service adapters
- Patient-responsive web experience

## packages/ui

Shared components and design-system resources.

```text
packages/ui
??? src
?   ??? components
?   ??? hooks
?   ??? lib
?   ??? styles
??? components.json
??? package.json
??? tsconfig.json
```

Current shared components include:

- Badge
- Button
- Card
- Input
- Label
- Separator
- Skeleton

Future shared components will include:

- Application shell
- Sidebar
- Top header
- Data tables
- Filter bars
- Searchable dropdowns
- Dynamic forms
- Patient cards
- Doctor cards
- KPI cards
- Status indicators
- Dialogs and drawers
- Loading and error states

## packages/contracts

Contains shared domain types and API contracts.

Future domains include:

- Organizations
- Branches
- Departments
- Users
- Roles and permissions
- Doctors
- Schedules
- Patients
- Appointments
- Queues
- Consultations
- Laboratory
- Radiology
- Pharmacy
- Billing
- Inventory
- Admissions
- Procedures
- Patient Access

## packages/validation

Contains reusable validation schemas.

Validation will be shared between frontend forms and production server APIs.

## packages/config

Contains configuration for:

- Modules
- Routes
- Navigation
- Roles
- Permissions
- Features
- Service workflows
- Dynamic forms
- Organization settings
- Localization

## packages/mock-data

Contains realistic fictional data used by the interactive frontend demonstration.

It will include:

- Hospital organizations
- Branches and departments
- Staff and doctors
- Schedules
- Patients and families
- Services
- Appointments and queues
- Clinical visits
- Diagnostic results
- Pharmacy activity
- Billing activity
- Executive reports

## packages/database

Reserved for the production backend stage.

It will later contain:

- Prisma schema
- PostgreSQL migrations
- Database client
- Reference-data seeds
- Tenant-aware repositories
- Database utilities

No production database logic should be added during the early frontend-demo stage.

## tooling/typescript

Contains shared TypeScript configurations:

- base.json
- library.json
- react-library.json
- nextjs.json

## tooling/scripts

Contains project-wide automation scripts.

Current script:

- clean.mjs

## Architectural Rule

Applications may use shared packages.

Shared packages must not depend on application-specific code.

```text
apps/web
   ?
packages/ui
packages/contracts
packages/validation
packages/config
packages/mock-data
```

The future database package will be accessed through production server services,
not imported directly into browser components.

## Current Foundation Status

The clean foundation is complete when all of the following pass:

```powershell
pnpm lint
pnpm typecheck
pnpm check
pnpm build
pnpm clean
pnpm dev
```

Foundation milestone status:

```text
M0 ? Clean Workspace: Completed
```
