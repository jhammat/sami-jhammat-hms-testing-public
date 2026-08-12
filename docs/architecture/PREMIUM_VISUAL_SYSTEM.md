# WonFlow Premium Visual System

## Document Status

Task: WF-067  
Area: Shared Frontend Foundation  
Status: Visual-system baseline  
Scope: All WonFlow portals and workflows

## Objective

Create a consistent, premium and human-designed visual language for the complete
WonFlow platform.

## Design Character

WonFlow should feel:

- Professional
- Calm
- Premium
- Reliable
- Efficient
- Modern
- Human-designed
- Appropriate for prestigious hospitals

WonFlow should not feel:

- Artificially futuristic
- Neon
- Overdecorated
- Template-based
- Repetitive
- Empty
- Toy-like
- Visually distracting

## Core Color Roles

### Blue

Used for:

- Primary actions
- Main navigation
- Selected records
- Scheduling
- General platform identity

### Violet

Used for:

- Clinical workspaces
- Doctor workflows
- Active consultation states
- Secondary brand emphasis

### Cyan

Used for:

- Laboratory
- Radiology
- Diagnostic services
- Informational operational states

### Emerald

Used for:

- Successful completion
- Verified records
- Healthy operational states

### Amber

Used for:

- Waiting
- Attention
- Pending review
- Non-critical warnings

### Rose

Used for:

- Critical information
- Cancellation
- Destructive actions
- Safety warnings

## Typography

Typography follows a compact operational hierarchy:

1. Page title
2. Section title
3. Record title
4. Field label
5. Supporting text
6. Metadata

Headings use controlled weight and negative letter spacing.

Body text remains highly readable at normal desktop distances.

## Surfaces

Primary surfaces use:

- White backgrounds
- Soft slate borders
- Controlled corner radii
- Restrained shadows
- Clear internal spacing

Repeated glass effects and excessive gradients are prohibited.

## Forms

Forms must support:

- Fast scanning
- Keyboard use
- Clear focus states
- Compact spacing
- Required-field clarity
- Error visibility
- Minimal scrolling

## Tables

Operational tables must support:

- Fast row scanning
- Sticky headers where appropriate
- Consistent status presentation
- Clear selected-row state
- Restrained action placement
- Horizontal overflow only when necessary

## Status Language

The same workflow state must use the same visual meaning throughout WonFlow.

Examples:

- Scheduled: blue
- Waiting: amber
- In progress: violet
- Completed: emerald
- Critical: rose
- Unknown or unavailable: slate

## Motion

Motion must be subtle and functional.

Allowed:

- Small hover transitions
- Focus transitions
- Drawer and modal movement
- Loading-state transitions

Not allowed:

- Decorative floating
- Constant animation
- Glowing effects
- Large scaling effects
- Distracting background motion

## Accessibility

The design system must maintain:

- Keyboard focus visibility
- Readable contrast
- Clear field labels
- Non-color status labels
- Reduced-motion support
- Responsive layouts

## Implementation Sequence

WF-067 establishes the visual language.

The following tasks will:

1. Redesign the application shell and navigation.
2. Create reusable premium workflow components.
3. Apply the visual system across existing modules.
4. Validate consistency and responsiveness.