# Shefa Design System

## Design concept

Light glassmorphism. A blurred photo background (`blur(70px)`) sits behind a light-gray page surface. UI panels use semi-transparent overlays (opacity modifiers like `/30`, `/40`) so the depth shows through. The palette is a blue-gray spectrum — dark navy to sky blue — with warm accent notes (orange, message-green).

## How Tailwind v4 + shadcn work together

In Tailwind v4 there is no `tailwind.config.js`. All configuration lives in `globals.css`.

The pattern is:
1. Define raw color primitives in `:root` (palette layer)
2. Assign semantic tokens to primitives (second `:root` block)
3. Wire semantic tokens into Tailwind v4 utilities via `@theme inline`
4. Use semantic Tailwind classes everywhere (`bg-card`, `text-foreground`, etc.)

shadcn components read from these same CSS variables automatically — that's the integration.

---

## Single theme — one palette only

No light/dark toggle. No `.dark` class. One theme, always the same. All token values defined once in `:root`.

---

## Background

The page background is a blurred photo (`/bg-image.jpg`) rendered via `body::before` (fixed, inset, `blur(70px)`). The `body` itself has `background-color: var(--background)` (`rgb(208, 210, 211)`) — a light gray that tints over the photo.

Never use a solid opaque background on `body` or `html` — it will cover the photo.

For translucent panels, use `bg-card/30` or `bg-white/40` rather than opaque fills. This lets the blurred photo show through.

---

## Color tokens

All tokens are defined in `globals.css` and wired into Tailwind via `@theme inline`.

### Semantic tokens

| Token | Tailwind class | Value | Usage |
|-------|----------------|-------|-------|
| `--background` | `bg-background` | `rgb(208, 210, 211)` | Page background (light gray) |
| `--foreground` | `text-foreground` | `rgb(41, 48, 56)` | Default body text (dark gray) |
| `--card` | `bg-card` | `rgb(139, 165, 193)` | Cards — use `bg-card/30` for translucent panels |
| `--card-foreground` | `text-card-foreground` | `rgb(208, 210, 211)` | Text on filled card surfaces |
| `--popover` | `bg-popover` | `rgb(10, 51, 78)` | Dark navy surfaces, dropdowns, dialogs |
| `--popover-foreground` | `text-popover-foreground` | `rgb(208, 210, 211)` | Light text on dark (`bg-popover`) surfaces |
| `--primary` | `text-primary` / `bg-primary` | `rgb(174, 206, 253)` | Sky blue accent — buttons, highlights |
| `--muted` | `bg-muted` | `rgb(43, 64, 91)` | Muted dark-blue surface |
| `--muted-foreground` | `text-muted-foreground` | — | Secondary/muted text |
| `--accent` | `text-accent` | `green-300` | Green accent — edit icons, positive CTAs |
| `--success` | `text-success` | `rgb(85, 180, 45)` | Active, confirmed |
| `--warning` | `text-warning` | `rgb(255, 214, 79)` | Paused, caution |
| `--destructive` / `--danger` | `text-destructive` / `text-danger` | `rgb(156, 20, 45)` | Errors, closed, danger |
| `--input` | `bg-input` | `rgb(43, 64, 91)` | Input field background |
| `--border` | (via `border` class) | `rgb(208, 210, 211)` | Borders — avoid wherever possible |

### Additional palette tokens

| Class | Value | Usage |
|-------|-------|-------|
| `text-message-green` | `rgb(43, 121, 95)` | Contextual icons (location, type, status) |
| `text-orange` / `hover:text-orange` | `rgb(217, 119, 87)` | Link hover color |
| `bg-blue-dark-3` | `rgb(68, 94, 124)` | Chip/badge background |
| `bg-blue-dark-2` / `bg-muted` | `rgb(43, 64, 91)` | Nested sections, inputs |
| `bg-blue-light-1` / `bg-card` | `rgb(139, 165, 193)` | Card fill (use with `/30` opacity) |

### One accent color

`--primary` (`rgb(174, 206, 253)`) is the primary interactive accent. `--accent` (green-300) is used for icons and edit CTAs. Don't add further accent colors.

Opacity variants — `bg-primary/15`, `bg-primary/20`, `bg-primary/30` — no separate variable needed.

---

## Surface hierarchy

Maximum 3 layers. Never nest deeper.

```
Layer 0 — bg-background         → page (light gray + blurred photo beneath)
Layer 1 — bg-card/30            → primary content panels (semi-transparent)
Layer 2 — bg-white/40           → inline content boxes, nested sections
Floating — bg-popover           → dropdowns, dialogs (dark navy)
```

---

## Translucency pattern

Use opacity modifiers on existing tokens rather than defining new transparent colors:

```tsx
// Primary card panel — layer 1
<div className="bg-card/30 rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent p-5">

// Content section within a card — layer 2
<div className="rounded-sm bg-white/40 p-4">{text}</div>

// Pill / chip
<Pill className="bg-white/40 text-popover">…</Pill>
```

---

## Typography

| Use | Class | Weight |
|-----|-------|--------|
| Page heading (h1) | `text-2xl` | `font-bold` |
| Card title | `<CardTitle>` from shadcn | — |
| Section heading | `text-sm` | `font-medium` |
| Section label (uppercase) | `text-xs uppercase tracking-wide` | `font-medium` |
| Body | `text-sm` | `font-normal` |
| Supporting / meta | `text-xs` | `font-normal` |
| Badge / pill | `text-xs` | `font-semibold` |

Rules:
- Default text color is `text-foreground` (set on `body`)
- Use `text-popover-foreground` for text on `bg-popover` (dark navy) surfaces
- Use `text-popover` for text on `bg-white/40` pill backgrounds (dark navy, readable on light)
- Never go below `text-xs`
- Avoid `font-bold` except for h1 page headings

---

## Spacing scale

Use only these values:

| Gap | Value | Use |
|-----|-------|-----|
| `gap-1` / `p-1` | 4px | Tight inline |
| `gap-2` / `p-2` | 8px | Component internal |
| `gap-3` / `p-3` | 12px | Between related elements |
| `gap-4` / `p-4` | 16px | Within a card |
| `gap-5` / `p-5` | 20px | Card padding (comfortable) |
| `gap-6` | 24px | Between cards |
| `gap-8` | 32px | Between page sections |
| `mb-8` | 32px | Below page headers |

---

## Border radius

| Context | Class |
|---------|-------|
| Pills, badges | `rounded-full` |
| Buttons, inputs, chips | `rounded-md` |
| Cards, panels | `rounded-md` |
| Inline content boxes | `rounded-sm` |
| Never use | `rounded-xl` or above |

---

## Borders

Borders use `var(--border)` (light gray). Avoid them wherever possible — glass contrast and spacing are usually sufficient.

---

## Transitions

All transitions must be:
- Duration: `duration-100` only
- Property: `transition-colors` — color/background only
- No movement — no `translate`, `scale`, or `transform` on hover

```tsx
// Correct
className="transition-colors duration-100 hover:bg-blue-dark-3"

// Wrong — element moves
className="transition-transform hover:scale-105"
```

---

## Component patterns

### Primary card panel

```tsx
<div className="bg-card/30 mt-5 rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent p-5">
  {children}
</div>
```

### Content section within a card

```tsx
<div className="rounded-sm bg-white/40 p-4">{text}</div>
```

### Pill / chip with icon

```tsx
<Pill className="bg-white/40 text-popover">
  <div className="flex items-center">
    <MapPin className="text-message-green mr-1 size-4" strokeWidth={2.5} />
    Label
  </div>
</Pill>
```

### Primary button (submit, publish, confirm)

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

### Filter trigger button

```tsx
<Button
  variant="ghost"
  className="bg-primary/20 hover:bg-primary/30 h-8 rounded-md px-3 text-sm shadow-lg transition-colors duration-100"
>
  Filter label <ChevronDownIcon className="size-3.5" />
</Button>
```

### shadcn Card

Glass blur applied automatically via `[data-slot="card"]`. Use as normal:

```tsx
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Form section label

```tsx
<p className="mb-1.5 px-1 text-xs font-medium">Location</p>
```

### Link hover

```tsx
<Link href="..." className="hover:text-orange">
  Link text
</Link>
```

---

## Status colors

### Job status

| Status | Classes |
|--------|---------|
| ACTIVE | `bg-success/15 text-success` |
| DRAFT | `bg-blue-dark-3 text-muted-foreground` |
| PAUSED | `bg-warning/15 text-warning` |
| FILLED | `bg-primary/15 text-primary` |
| EXPIRED / CLOSED | `bg-danger/15 text-danger` |

### Application status

| Status | Classes |
|--------|---------|
| SUBMITTED | `bg-blue-dark-3 text-muted-foreground` |
| VIEWED | `bg-warning/15 text-warning` |
| REJECTED | `bg-danger/15 text-danger` |
| CLOSED | `bg-blue-dark-3 text-muted-foreground` |

---

## Icon style

All contextual icons (location, job type, section markers) use:
- Size: `size-4`
- Stroke: `strokeWidth={2.5}`
- Color: `text-message-green`

---

## Custom components (in `components/ui/`)

These are Shefa-specific, not shadcn primitives:

| File | Purpose |
|------|---------|
| `status-badge.tsx` | Job status pill — ACTIVE/DRAFT/PAUSED/etc |
| `responsive-badge.tsx` | User responsiveness indicator |
| `job-card.tsx` | Job listing card |
| `stat-card.tsx` | Dashboard metric card |
| `page-header.tsx` | Page title + description + action slot |
| `empty-state.tsx` | Empty list placeholder |
| `inbox-row.tsx` | Message thread row |
| `divider.tsx` | Horizontal rule |
| `filter-trigger.tsx` | Dropdown trigger with optional badge count |
| `pill.tsx` | Inline chip/tag with optional icon |
| `location-picker.tsx` | City/state dropdown picker |

---

## Layout rules

- Mobile-first always: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Max content width: `max-w-2xl mx-auto` (detail pages), `max-w-4xl mx-auto` (forms), `max-w-6xl mx-auto` (dashboards)
- Page padding: `p-5`
- Between cards: `gap-6`
- Between page sections: `gap-8` or `mb-8`
- Never use float-based layout

---

## What to avoid

| Avoid | Use instead |
|-------|-------------|
| Raw hex in className | Semantic token (`bg-card`, `text-foreground`) |
| `font-bold` except h1 | `font-medium` for sub-headings |
| `rounded-xl` or larger | `rounded-lg` max |
| `shadow-xl` on general elements | No shadow (acceptable on `bg-white/40` content boxes) |
| Solid opaque fills on card panels | `bg-card/30` or `bg-white/40` for translucency |
| Third accent color | `--primary` + `--accent` only |
| `text-[10px]` | `text-xs` minimum |
| Nested surfaces beyond layer 2 | Flatten the layout |
| Hover animations that move | `transition-colors duration-100` only |
| `style={{ color: '...' }}` | Tailwind class |
| Solid opaque background on body | Keep body transparent over photo |
