# @wonflow/mock-data

Deterministic fictional demonstration data for WonFlow.

## Purpose

This package provides safe, repeatable records for:

- Interface development
- Dashboard development
- Workflow demonstrations
- Role-based portal testing
- Screenshot generation
- Stakeholder review
- Frontend automated testing

## Approved Usage

```ts
import {
  createWonFlowDemoScenario,
} from "@wonflow/mock-data";

const dataset =
  createWonFlowDemoScenario(
    "hospital-day",
  );
```

## Deterministic Generation

The same seed produces the same records.

```ts
const first =
  createWonFlowDemoScenario(
    "busy-opd",
  );

const second =
  createWonFlowDemoScenario(
    "busy-opd",
  );
```

Both datasets contain the same generated identities and relationships.

## Fictional-Data Rules

1. Every person and organization is fictional.
2. Every record carries `fictional: true`.
3. MR numbers begin with `WF-DEMO-MR-`.
4. Email addresses use `wonflow.example`.
5. Demo phone values use an explicit zero-based fictional pattern.
6. Real CNIC values are forbidden.
7. Real patient data is forbidden.
8. Real employee data is forbidden.
9. Real hospital exports are forbidden.
10. Mock data must never be mixed with production records.

## Scenarios

- `hospital-day`
- `busy-opd`
- `inpatient-focus`
## Mock Service Adapter

Frontend components should use the service instead of directly searching fixture arrays.

```ts
import {
  createWonFlowMockHospitalService,
} from "@wonflow/mock-data";

const service =
  createWonFlowMockHospitalService({
    scenario: "hospital-day",
    minimumLatencyMs: 120,
    maximumLatencyMs: 300,
  });

const patients =
  await service.listPatients({
    search: "zara",
    limit: 10,
  });
```

## Cancellation

```ts
const controller =
  new AbortController();

const request =
  service.listAppointments(
    {
      status: "confirmed",
    },
    controller.signal,
  );

controller.abort();
```

Cancellation produces a controlled `WonFlowMockServiceError` with the code:

```text
aborted
```

## Architecture

```text
Frontend component
→ WonFlow mock hospital service
→ Asynchronous adapter
→ In-memory repository
→ Deterministic fictional dataset
```

The same portal can later use a production API service implementing a compatible interface.
## Verification

```powershell
pnpm --filter @wonflow/mock-data audit:fictional
pnpm --filter @wonflow/mock-data typecheck
pnpm --filter @wonflow/mock-data check
```