# Shefa Design System

## Design concept

Glassmorphism over a blurred photo background. Surfaces are semi-transparent glass panels with `backdrop-filter` blur. Text is dark navy by default — light glass panels provide the contrast.

## How Tailwind v4 + shadcn work together

In Tailwind v4 there is no `tailwind.config.js`. All configuration lives in `globals.css`.

The pattern is:

1. Define raw CSS custom properties in `:root` (these are the shadcn theme variables)
2. Wire them into Tailwind v4 utilities via `@theme inline`
3. Use semantic Tailwind classes everywhere (`bg-card`, `text-dark`, etc.)

shadcn components read from these same CSS variables automatically — that's the integration.
You never touch `tailwind.config.js` because it doesn't exist.

---

## Single theme — one palette only

No light/dark toggle. No `.dark` class. One theme, always the same.
All token values are defined once in `:root`.

---

## Background

The page background is a blurred photo (`/israeli-flag.jpg`) rendered via `body::before` (fixed, inset, `blur(3px)`). The `body` itself has `background: transparent`. An `rgba(25, 64, 112, 0.288)` overlay sits on top, giving the whole page a deep blue tint.

Never use a solid opaque background on the `body` or `html` — it will cover the photo.

---

## Color tokens

All tokens are defined in `globals.css` and wired into Tailwind via `@theme inline`.

| Token                | Utility class            | Value                          | Usage                                    |
| -------------------- | ------------------------ | ------------------------------ | ---------------------------------------- |
| `--background`       | `bg-background`          | `rgba(25, 64, 112, 0.288)`     | Page overlay (layer 0)                   |
| `--blue-dark-2`        | `bg-blue-dark-2`           | `rgba(155, 200, 255, 0.15)`    | Subtle inline sections (layer 2)         |
| `--blue-dark-3`        | `bg-blue-dark-3`           | `rgba(155, 200, 255, 0.25)`    | Inputs, nested sections (layer 2)        |
| `--card`             | `bg-card`                | `rgba(155, 200, 255, 0.18)`    | Cards and panels (layer 1)               |
| `--popover`          | `bg-popover`             | `rgba(140, 190, 255, 0.35)`    | Dropdowns, popovers (floating layer)     |
| `--input`            | `bg-input`               | `rgba(155, 200, 255, 0.22)`    | Input fields                             |
| `--light`            | `text-popover-foreground` / `bg-light`| `rgba(191, 212, 235)`          | Light text — use on dark/photo contexts  |                      |
| `--dark`             | `text-dark` / `bg-dark`  | `rgb(20, 35, 55)`              | Default body text (dark navy)            |
| `--primary`          | `text-primary` / `bg-primary` | `rgb(143, 184, 246)`      | Accent — sky blue                        |
| `--success`          | `text-success`           | `rgb(135, 219, 135)`           | Active, confirmed states                 |
| `--warning`          | `text-warning`           | `rgb(221, 139, 44)`            | Paused, caution, pay highlights          |
| `--danger`           | `text-danger`            | `rgb(255, 70, 70)`             | Errors, closed, danger                   |
| `--muted-foreground` | `text-muted-foreground`  | same as `--light-muted`        | shadcn alias for muted text              |
| `--border-col`       | (via `border` class)     | `rgba(228, 165, 72, 0.466)`    | Amber/gold border — use sparingly        |

> **Note**: There is no `--popover` or `text-text`. Use `bg-card` for cards, `text-dark` for body text.

### One accent only

`--primary` (`rgb(143, 184, 246)`) is the single accent. Never introduce a second accent color.
Opacity variants: `bg-primary/15`, `bg-primary/20`, `bg-primary/25`, `bg-primary/30` — no separate variable needed.

---

## Surface hierarchy

Maximum 3 layers. Never nest deeper.

```
Layer 0 — bg-background         → page overlay (on top of photo)
Layer 1 — bg-popover               → primary content blocks (cards, panels, shadcn Card)
Layer 2 — bg-blue-dark-2          → subtle inline nested sections
Layer 2 — bg-blue-dark-3          → inputs, more-visible nested sections
Floating — bg-popover           → dropdowns, popovers, dialogs (backdrop-blur via globals)
```

---

## Glass effects

Glass blur is applied **globally in `globals.css`** — you do not need to add it per-component.

| Element                                                                           | Applied blur                             |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| `header`, `[data-slot="card"]`, dialogs, dropdowns, popovers, `[data-slot="command"]` | `backdrop-filter: blur(18px) saturate(160%)` |
| `[data-slot="input"]`, `[data-slot="textarea"]`, `[data-slot="button"]`           | `backdrop-filter: blur(8px)`             |

For custom containers that need glass: add `backdrop-blur-lg` directly.

Example — job card (not a shadcn Card, custom div):
```tsx
<div className="bg-light/40 hover:bg-dark/15 rounded-md p-5 backdrop-blur-lg transition-colors duration-100">
```

---

## Typography

| Use               | Class          | Weight          |
| ----------------- | -------------- | --------------- |
| Page heading (h1) | `text-2xl`     | `font-bold`     |
| Section label     | `text-xs`      | `font-medium`   |
| Body              | `text-sm`      | `font-normal`   |
| Supporting / meta | `text-xs`      | `font-normal`   |
| Badge / pill      | `text-xs`      | `font-semibold` |

Rules:
- Default text color is `color: var(--dark)` (set on `body`) — dark navy on light glass
- Use `text-popover-foreground` when placing text directly on the photo background or on a dark surface
- Never go below `text-xs`
- Avoid `font-bold` except for h1 page headings

---

## Spacing scale

Use only these values. Never arbitrary spacing.

| Gap             | Value | Use                        |
| --------------- | ----- | -------------------------- |
| `gap-1` / `p-1` | 4px   | Tight inline               |
| `gap-2` / `p-2` | 8px   | Component internal         |
| `gap-3` / `p-3` | 12px  | Between related elements   |
| `gap-4` / `p-4` | 16px  | Within a card              |
| `gap-5` / `p-5` | 20px  | Card padding (comfortable) |
| `gap-6`         | 24px  | Between cards              |
| `gap-8`         | 32px  | Between page sections      |
| `mb-8`          | 32px  | Below page headers         |

---

## Border radius

| Context                         | Class                 |
| ------------------------------- | --------------------- |
| Pills, badges, avatars          | `rounded-full`        |
| Buttons, inputs, small elements | `rounded-md` (8px)    |
| Cards, panels                   | `rounded-lg` (12px)   |
| Never use                       | `rounded-xl` or above |

---

## Borders

Borders are amber/gold (`rgba(228, 165, 72, 0.466)`). Avoid them wherever possible — glass contrast and spacing should be sufficient. The `.border` class is globally overridden to use `--border-col` at `0.1px` width.

---

## Transitions

All transitions must be:

- Duration: `duration-100` only
- Property: `transition-colors` — color/background only
- No movement — no `translate`, `scale`, or `transform` on hover

```tsx
// Correct
className = "transition-colors duration-100 hover:bg-blue-dark-3";

// Wrong — element moves
className = "transition-transform hover:scale-105";
```

---

## Component patterns

### Job card (custom glass div, not shadcn Card)

```tsx
<div className="bg-light/40 hover:bg-dark/15 rounded-md p-5 backdrop-blur-lg transition-colors duration-100">
  {children}
</div>
```

### Filter trigger button

```tsx
<Button
  variant="ghost"
  className="bg-primary/20 hover:bg-primary/30 h-8 rounded-md px-3 text-sm shadow-lg transition-colors duration-100"
>
  Filter label <ChevronDownIcon className="size-3.5" />
</Button>
```

### Primary button (publish, confirm, submit)

```tsx
<Button className="bg-primary/15 text-primary hover:bg-primary/25 transition-colors duration-100">
  Publish job
</Button>
```

### Ghost button (cancel, secondary)

```tsx
<Button variant="ghost" className="hover:bg-blue-dark-3 transition-colors duration-100">
  Cancel
</Button>
```

### Destructive button (close, delete)

```tsx
<Button className="bg-danger/15 text-danger hover:bg-danger/25 transition-colors duration-100">
  Close job
</Button>
```

### Input / Textarea

shadcn Input has glass blur applied globally. No extra classes needed unless overriding color:
```tsx
<Input className="placeholder:text-muted-foreground" />
```

### Form section label

```tsx
<p className="mb-1.5 px-1 text-xs font-medium">Location</p>
```

### shadcn Card

Glass blur applied automatically via `[data-slot="card"]` selector. Use as normal:
```tsx
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

---

## Status colors

| Status          | Classes                              |
| --------------- | ------------------------------------ |
| ACTIVE          | `bg-success/15 text-success`         |
| DRAFT           | `bg-blue-dark-3 text-muted-foreground` |
| PAUSED          | `bg-warning/15 text-warning`         |
| FILLED          | `bg-primary/15 text-primary`         |
| EXPIRED / CLOSED| `bg-danger/15 text-danger`           |

---

## Custom components (in `components/ui/`)

These are Shefa-specific, not shadcn primitives:

| File                   | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `status-badge.tsx`     | Job status pill — ACTIVE/DRAFT/PAUSED/etc |
| `responsive-badge.tsx` | User responsiveness indicator             |
| `job-card.tsx`         | Job listing card                          |
| `stat-card.tsx`        | Dashboard metric card                     |
| `page-header.tsx`      | Page title + description + action slot    |
| `empty-state.tsx`      | Empty list placeholder                    |
| `inbox-row.tsx`        | Message thread row                        |
| `divider.tsx`          | Horizontal rule (`bg-background h-px`)    |
| `filter-trigger.tsx`   | Dropdown trigger with optional badge count|

---

## Layout rules

- Mobile-first always: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Max content width: `max-w-4xl mx-auto` (forms), `max-w-6xl mx-auto` (dashboards)
- Page padding: `px-4 pt-8`
- Between cards: `gap-6`
- Between page sections: `gap-8` or `mb-8`
- Never use float-based layout

---

## What to avoid

| Avoid                                        | Use instead                                   |
| -------------------------------------------- | --------------------------------------------- |
| Raw hex in className                         | Semantic token (`bg-card`, `text-dark`)       |
| `font-bold` except h1                        | `font-medium` for headings below page title   |
| `rounded-xl` or larger                       | `rounded-lg` max                              |
| `shadow-lg`, `shadow-xl` (except filter buttons) | No shadow                              |
| `bg-blue-500`, `bg-success`                | Status tokens                                 |
| Hover animations that move                   | `transition-colors duration-100` only         |
| `style={{ color: '#...' }}`                  | Tailwind class                                |
| Second accent color                          | One accent: `--primary` only                  |
| `text-[10px]`                                | `text-xs` minimum                             |
| Nested surfaces beyond layer 2               | Flatten the layout                            |
| Solid opaque background on body              | Keep body transparent over photo              |
