# WonFlow Frontend Async Data States

## Document Status

```text
Task: WF-048
Area: Shared Frontend Foundation
Status: Approved async-data baseline
```

## Purpose

WonFlow uses one standardized model for asynchronous frontend requests.

```text
Hospital service
→ Async-data hook
→ Standard request state
→ Loading, empty, error or successful interface
```

## Supported States

### Idle

The request has not started.

### Loading

The first request is running and no usable data is available.

### Success

Valid non-empty data is available.

### Empty

The request completed successfully, but no matching records were returned.

### Error

The request failed.

The error state may contain retained previous data.

## Refreshing

Refreshing is separate from first loading.

```text
First loading:
No previous data is visible

Refreshing:
Previous data remains visible while a new request runs
```

This avoids replacing a useful hospital screen with a full loading indicator
during every refresh.

## Request Keys

Every hook request has a stable key.

Examples:

```text
dashboard-summary
patients:branch-1:zara
patient-overview:patient-14
appointments:doctor-2:confirmed
```

When the key changes:

1. The previous request is cancelled.
2. A new request begins.
3. Stale results are ignored.

## Cancellation

The hook uses `AbortController`.

Cancellation may occur when:

- A component unmounts
- A user changes filters
- A user opens a different patient
- A request key changes
- The data state is reset

Cancelled requests do not display error messages.

## Error Normalization

Unknown service errors are converted into controlled WonFlow errors.

Supported codes include:

- `aborted`
- `not-found`
- `invalid-query`
- `simulated-failure`
- `network-error`
- `unexpected-error`

Each normalized error contains:

- Code
- Title
- Message
- Retryability
- Operation name when available

## Retained Data

When `retainPreviousData` is enabled:

```text
Previous successful data
→ Refresh starts
→ Existing screen remains visible
→ Refresh indicator appears
```

When the refresh fails:

```text
Previous data remains visible
+
Compact error warning appears
+
Retry action remains available
```

## Standardized Feedback Components

WonFlow provides:

- `WonFlowLoadingState`
- `WonFlowEmptyState`
- `WonFlowErrorState`
- `WonFlowRefreshIndicator`
- `WonFlowAsyncDataBoundary`

## Loading-State Principles

Loading interfaces should:

- Clearly communicate progress
- Avoid unnecessary full-screen blocking
- Use subtle animation
- Preserve surrounding navigation
- Remain accessible to screen readers

## Empty-State Principles

Empty states must distinguish:

```text
No records exist
```

from:

```text
A request failed
```

Examples include:

- No patients match the search
- No appointments today
- No active admissions
- No outstanding invoices
- No reports available

## Error-State Principles

Error interfaces should:

- Use clear language
- Avoid exposing technical internals
- Explain whether retry is possible
- Preserve useful previous data
- Avoid displaying cancelled requests as errors

## Accessibility

Feedback components use:

- `role="status"` for loading and refreshing
- `role="alert"` for request failures
- `aria-live` announcements
- Visible keyboard focus for retry controls
- Text alongside colors and icons

## Portal Usage Rule

Portal components should use:

```text
useWonFlowAsyncData
+
WonFlowAsyncDataBoundary
```

They should not independently recreate:

- Loading-state logic
- Abort-controller logic
- Error normalization
- Retry logic
- Empty-state layouts

## Safety Rules

1. Every request uses a stable request key.
2. Previous requests are cancelled when the key changes.
3. Stale request results are ignored.
4. Cancellation is not presented as failure.
5. First loading and refreshing remain separate.
6. Empty and error states remain separate.
7. Previous data may remain visible during refresh.
8. Errors use controlled public-safe messages.
9. Retry is only displayed when appropriate.
10. Service internals are not exposed to users.
11. Feedback components remain keyboard accessible.
12. Clinical and operational screens retain clear context during loading.

## Locked Decisions

1. Async request handling is centralized in a reusable hook.
2. AbortController provides request cancellation.
3. Standard request statuses are used.
4. Request keys control reloading and cancellation.
5. Previous data is retained by default.
6. Service errors are normalized.
7. Cancelled requests remain silent.
8. Standard loading, empty and error components are shared.
9. Successful retained data may coexist with a refresh error.
10. Portal screens use the shared async-data boundary.

## Acceptance Checklist

- [x] Async-data status model created
- [x] Standard error model created
- [x] Mock-service errors normalized
- [x] Network and unexpected errors normalized
- [x] Cancellation detection created
- [x] Reusable async-data hook created
- [x] AbortController support added
- [x] Request-key behaviour added
- [x] Stale-result protection added
- [x] Reload action added
- [x] Reset action added
- [x] Previous-data retention added
- [x] Loading state created
- [x] Empty state created
- [x] Error state created
- [x] Refresh indicator created
- [x] Async-data boundary created
- [x] Accessibility states added
- [x] Public exports updated
- [x] Architecture rules documented