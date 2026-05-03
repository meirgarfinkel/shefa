# Shefa Design System

## How Tailwind v4 + shadcn work together

In Tailwind v4 there is no `tailwind.config.js`. All configuration lives in `globals.css`.

The pattern is:

1. Define raw CSS custom properties in `:root` (these are the shadcn theme variables)
2. Wire them into Tailwind v4 utilities via `@theme inline`
3. Use semantic Tailwind classes everywhere (`bg-background`, `text-foreground`, etc.)

shadcn components read from these same CSS variables automatically — that's the integration.
You never touch `tailwind.config.js` because it doesn't exist.

---

## Single theme — one palette only

No light/dark toggle. No `.dark` class. One theme, always the same.
All token values are defined once in `:root`.

---

## Color palette — teal ocean

Warm teal-green mid-tones. Evokes sea glass, coastal fog, still water.
Background is a medium teal; cards and inputs are darker blue-teal wells.

| Token                | Utility class                 | Value     | Usage                               |
| -------------------- | ----------------------------- | --------- | ----------------------------------- |
| `--background`       | `bg-background`               | `#506d6c` | Page base (layer 0)                 |
| `--card`             | `bg-card`                     | `#2d505a` | Cards, panels (layer 1)             |
| `--popover`          | `bg-popover`                  | `#19374b` | Popovers, dropdowns (layer 2)       |
| `--muted`            | `bg-muted`                    | `#28303d` | Subtle sections, inputs (layer 2)   |
| `--foreground`       | `text-foreground`             | `#f0f2f5` | Primary text                        |
| `--muted-foreground` | `text-muted-foreground`       | `#bce4eb` | Secondary / supporting text         |
| `--primary`          | `text-primary` / `bg-primary` | `#6eb5c0` | Accent — misty teal                 |
| `--success`          | `text-success`                | `#55da86` | Active, confirmed states            |
| `--warning`          | `text-warning`                | `#c4a04a` | Paused, caution states              |
| `--destructive`      | `text-destructive`            | `#c46a6a` | Errors, closed, danger              |
| `--border`           | `border-border`               | 12% white | All borders                         |

### One accent only

`--primary` (`#6eb5c0`) is the single accent. Never introduce a second accent color.
Hover variant: use `text-primary/80` or `bg-primary/20` — no separate variable needed.

---

## Surface hierarchy

Maximum 3 layers. Never nest deeper.

```
Layer 0 — bg-background   → page base
Layer 1 — bg-card         → primary content blocks
Layer 2 — bg-muted        → nested sections, overlays, inputs
```

---

## Typography

| Use               | Class       | Weight          |
| ----------------- | ----------- | --------------- |
| Page heading      | `text-xl`   | `font-medium`   |
| Section heading   | `text-base` | `font-medium`   |
| Body              | `text-sm`   | `font-normal`   |
| Supporting / meta | `text-xs`   | `font-normal`   |
| Form label        | `text-xs`   | `font-medium`   |
| Badge / pill      | `text-xs`   | `font-semibold` |

Rules:

- Two weights only: `font-normal` and `font-medium` (badges can use `font-semibold`)
- Never use `font-bold` — too heavy against dark surfaces
- Never go below `text-xs`

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

Always `border border-border`. Never omit borders on cards.
Hover state: `hover:border-border/60` — slightly more visible, no movement.

---

## Transitions

All transitions must be:

- Duration: `duration-150` only
- Property: `transition-colors` — color/border/background only
- No movement — no `translate`, `scale`, or `transform` on hover

```tsx
// Correct
className = "transition-colors duration-150 hover:bg-muted hover:border-border/60";

// Wrong — element moves
className = "transition-transform hover:scale-105";
```

---

## Component patterns

### Card

```tsx
<div className="border-border bg-card hover:border-border/60 rounded-lg border p-5 transition-colors duration-150">
  {children}
</div>
```

### Primary button (publish, confirm)

```tsx
<Button className="bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 border transition-colors duration-150">
  Publish job
</Button>
```

### Ghost button (cancel, secondary)

```tsx
<Button
  variant="ghost"
  className="border-border hover:bg-muted border transition-colors duration-150"
>
  Cancel
</Button>
```

### Destructive button (close, delete)

```tsx
<Button className="bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25 border transition-colors duration-150">
  Close job
</Button>
```

### Input / Textarea

```tsx
<Input className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary transition-colors duration-150" />
```

### Form label

```tsx
<Label className="text-muted-foreground text-xs font-medium" />
```

---

## Custom components (in `components/ui/`)

These are Shefa-specific, not shadcn primitives:

| File                   | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `status-badge.tsx`     | Job status pill — ACTIVE/DRAFT/PAUSED/etc |
| `responsive-badge.tsx` | User responsiveness indicator             |
| `job-card.tsx`         | Job listing card (seeker-facing)          |
| `stat-card.tsx`        | Dashboard metric card                     |
| `page-header.tsx`      | Page title + description + action slot    |
| `empty-state.tsx`      | Empty list placeholder                    |
| `inbox-row.tsx`        | Message thread row                        |
| `divider.tsx`          | Horizontal rule                           |

---

## Layout rules

- Mobile-first always: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Max content width: `max-w-4xl mx-auto` (forms), `max-w-6xl mx-auto` (dashboards)
- Page padding: `px-4 py-8 md:px-8`
- Between cards: `gap-6`
- Between page sections: `gap-8` or `mb-8`
- Never use float-based layout

---

## What to avoid

| Avoid                                        | Use instead                                   |
| -------------------------------------------- | --------------------------------------------- |
| Raw hex in className                         | Semantic token (`bg-card`, `text-foreground`) |
| `font-bold`, `font-semibold` (except badges) | `font-medium`                                 |
| `rounded-xl` or larger                       | `rounded-lg` max                              |
| `shadow-lg`, `shadow-xl`                     | `border border-border`                        |
| `bg-blue-500`, `bg-green-400`                | Status tokens                                 |
| Hover animations that move                   | `hover:bg-muted` only                         |
| `style={{ color: '#...' }}`                  | Tailwind class                                |
| Second accent color                          | One accent: `--primary` only                  |
| `text-[10px]`                                | `text-xs` minimum                             |
| Nested surfaces beyond layer 2               | Flatten the layout                            |
