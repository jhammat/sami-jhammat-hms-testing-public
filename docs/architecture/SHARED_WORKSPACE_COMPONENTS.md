# WonFlow Shared Workspace Components

## Document Status

```text
Task: WF-050
Area: Shared Frontend Foundation
Status: Approved workspace-component baseline
```

## Purpose

WonFlow uses reusable workspace components instead of rebuilding dashboard
structures independently in every portal.

```text
Page Header
→ KPI Cards
→ Action Bar
→ Operational Panels
```

## Shared Components

### WonFlowPageHeader

Provides:

- Breadcrumb navigation
- Page title
- Description
- Eyebrow text
- Leading icon
- Metadata
- Primary and secondary actions

### WonFlowKpiCard

Provides:

- KPI label
- Primary value
- Supporting description
- Meaningful tone
- Optional trend
- Optional footer
- Loading skeleton

### WonFlowActionBar

Provides:

- Search controls
- Filters
- Result summaries
- Secondary actions
- Primary actions
- Optional sticky behaviour

### WonFlowActionButton

Provides consistent action styling for:

- Primary actions
- Secondary actions
- Destructive actions
- Low-emphasis actions

### WonFlowOperationalPanel

Provides:

- Panel title
- Description
- Icon
- Status
- Header action
- Main content
- Footer
- Meaningful operational tone

## Portal Usage

These components may be reused for:

- Patient lists
- Appointment dashboards
- Doctor schedules
- Laboratory queues
- Pharmacy dispensing
- Admissions
- Ward operations
- Billing
- Insurance
- Management reporting
- Platform administration

## Visual Rules

1. White remains the primary surface.
2. Blue and violet provide WonFlow brand emphasis.
3. Emerald represents normal completion or availability.
4. Amber represents pending attention.
5. Rose represents critical or blocked conditions.
6. Color never replaces text.
7. KPI cards remain compact.
8. Panels prioritize operational data over decoration.
9. Action bars remain usable on narrow screens.
10. Tables may scroll horizontally inside panels rather than breaking the page.

## Accessibility

The components provide:

- Semantic headers and sections
- Breadcrumb navigation labels
- Keyboard-focus styles
- Button disabled states
- Screen-reader loading states
- Text accompanying trends and colors
- Responsive layouts
- Visible hierarchy

## Safety Rules

1. KPI values must come from an approved data service.
2. Loading values must not be shown as confirmed values.
3. Clinical warnings must not rely only on color.
4. Destructive actions require controlled workflows.
5. Buttons do not provide authorization by themselves.
6. Hidden controls do not replace backend permission checks.
7. Financial values must preserve their currency.
8. Operational panels must retain patient and branch context where required.
9. Empty and failed data remain distinct.
10. Shared components must not contain hospital-specific business logic.

## Locked Decisions

1. Shared workspace components live in the web frontend foundation.
2. Portal screens compose these components.
3. Page headers provide consistent page context.
4. KPI cards support meaningful tones and trends.
5. Action bars combine filtering and operational actions.
6. Operational panels support compact hospital information.
7. Reusable action buttons use standard variants.
8. Components remain responsive.
9. Components remain compatible with async-data boundaries.
10. Components remain independent of mock or API data sources.

## Acceptance Checklist

- [x] Shared page header created
- [x] Breadcrumb support created
- [x] Header actions created
- [x] KPI card created
- [x] KPI tones created
- [x] KPI trends created
- [x] KPI loading state created
- [x] Shared action bar created
- [x] Shared action button created
- [x] Primary button variant created
- [x] Secondary button variant created
- [x] Danger button variant created
- [x] Ghost button variant created
- [x] Operational panel created
- [x] Panel tones created
- [x] Panel header actions supported
- [x] Panel status supported
- [x] Panel footer supported
- [x] Public exports created
- [x] Visual review page created
- [x] Accessibility rules documented