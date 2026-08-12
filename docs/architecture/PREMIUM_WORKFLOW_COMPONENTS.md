# WonFlow Premium Workflow Components

## Document Status

Task: WF-069  
Area: Shared Frontend Foundation  
Status: Reusable component baseline  
Scope: All WonFlow operational and clinical workflows

## Purpose

The Premium Workflow Components provide consistent reusable patterns for forms,
filters, tables, statuses, action menus and modal interactions.

## Components

### Form Section

Provides:

- Section title
- Description
- Functional icon
- Status
- Section actions
- Compact or standard spacing
- Meaningful workflow tone

### Field

Provides:

- Field label
- Required-field indicator
- Error text
- Supporting text
- Horizontal or vertical arrangement
- Consistent spacing

### Filter Bar

Provides:

- Search input
- Workflow filters
- Result count
- Clear-filter action
- Primary actions
- Responsive layout

### Status Badge

Provides consistent semantic colors for:

- Scheduled
- Waiting
- Active
- Completed
- Informational
- Critical
- Neutral states

### Data Table

Provides:

- Responsive horizontal scrolling
- Sticky table header
- Selected-row state
- Keyboard-accessible rows
- Reusable column definitions
- Empty state
- Action-column support

### Action Menu

Provides:

- Compact row actions
- Standard actions
- Destructive actions
- Disabled actions
- Escape-key closing
- Outside-click closing

### Modal

Provides:

- Accessible dialog semantics
- Escape-key closing
- Background scroll locking
- Small, medium and large sizes
- Header, body and footer
- Backdrop interaction

## Design Objective

These components reduce repeated page-specific code while maintaining a
human-designed layout.

Shared components should standardize interaction without forcing every module
to use the same page composition.

## Responsive Rules

- Forms adapt to the available workflow width.
- Filters stack before becoming cramped.
- Tables scroll internally rather than expanding the page.
- Modals remain inside the viewport.
- Long text uses controlled wrapping.
- Actions remain reachable on laptop and mobile screens.

## Keyboard Rules

- Visible focus states are mandatory.
- Selectable table rows support Enter and Space.
- Action menus close using Escape.
- Modals close using Escape.
- Native inputs retain expected keyboard behavior.

## Application Sequence

WF-069 creates the reusable component foundation.

WF-070 will apply these components to:

- Patient registration
- Patient directory
- Appointment booking
- Appointment directory
- Billing counter
- Reception queue
- Doctor consultation
- Laboratory
- Radiology

## Production Boundary

Production workflows will later require:

- Permission-aware actions
- Server-driven pagination
- Server-side search
- Persistent user preferences
- Audit-linked action menus
- Accessible focus trapping inside modals
- Internationalization
- Urdu and right-to-left validation
- Real backend validation