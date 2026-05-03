# Shefa Design System

## How Tailwind v4 + shadcn work together

In Tailwind v4 there is no `tailwind.config.js`. All configuration lives in `globals.css`.

The pattern is:

1. Define raw CSS custom properties in `:root` (these are the shadcn theme variables)
2. Wire them into Tailwind v4 utilities via `@theme inline`
3. Use semantic Tailwind classes everywhere (`bg-background`, `text-text`, etc.)

shadcn components read from these same CSS variables automatically — that's the integration.
You never touch `tailwind.config.js` because it doesn't exist.

---

## Single theme — one palette only

No light/dark toggle. No `.dark` class. One theme, always the same.
All token values are defined once in `:root`.

---

## Color palette — dark ocean

Deep navy surfaces with a sky-blue accent. Evokes deep water, calm and focused.
Background is a muted teal; cards and inputs are dark navy wells.

| Token            | Utility class                 | Value     | Usage                             |
| ---------------- | ----------------------------- | --------- | --------------------------------- |
| `--background`   | `bg-background`               | `#4b6e6e` | Page base (layer 0)               |
| `--surface-1`    | `bg-surface-1`                | `#1a222e` | Cards, panels (layer 1)           |
| `--surface-2`    | `bg-surface-2`                | `#202a38` | Popovers, dropdowns (layer 2)     |
| `--surface-3`    | `bg-surface-3`                | `#283444` | Subtle sections, inputs (layer 2) |
| `--text`         | `text-text`                   | `#ebf2f8` | Primary text                      |
| `--text-muted`   | `text-text-muted`             | `#bbd3eb` | Secondary / supporting text       |
| `--text-inverse` | `text-text-inverse`           | `#121822` | Text on light surfaces            |
| `--primary`      | `text-primary` / `bg-primary` | `#78bee6` | Accent — sky blue                 |
| `--secondary`    | `text-secondary` / `bg-secondary` | `#6e8ca0` | Muted secondary accent         |
| `--success`      | `text-success`                | `#5ad28c` | Active, confirmed states          |
| `--warning`      | `text-warning`                | `#d2af5a` | Paused, caution states            |
| `--danger`       | `text-danger`                 | `#d26e6e` | Errors, closed, danger            |

> **Borders**: there is no `--border` CSS variable. The default border color is set globally via
> `* { border-color: var(--text-muted); }` in `globals.css`. Applying `border` alone gives a
> `text-muted`-colored border. All borders are strongly discouraged.

### One accent only

`--primary` (`#78bee6`) is the single accent. Never introduce a second accent color.
`--secondary` may be used for muted decorative elements (skill pills, etc.) but not as a competing accent.
Hover variant: use `text-primary/80` or `bg-primary/20` — no separate variable needed.

---

## Surface hierarchy

Maximum 3 layers. Never nest deeper.

```
Layer 0 — bg-background  → page base
Layer 1 — bg-surface-1   → primary content blocks (cards, panels)
Layer 2 — bg-surface-2   → popovers, dropdowns, overlays
Layer 2 — bg-surface-3   → nested sections, inputs within cards
```

`bg-surface-2` and `bg-surface-3` are both valid layer-2 surfaces; use surface-2 for floating
elements (popovers/menus) and surface-3 for inline nested sections.

---

## Typography

| Use               | Class       | Weight          |
| ----------------- | ----------- | --------------- |
| Page heading      | `text-xl`   | `font-medium`   |
| Section heading   | `text-text` | `font-medium`   |
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
Always avoid borders

---

## Transitions

All transitions must be:

- Duration: `duration-150` only
- Property: `transition-colors` — color/background only
- No movement — no `translate`, `scale`, or `transform` on hover

```tsx
// Correct
className = "transition-colors duration-150 hover:bg-surface-3";

// Wrong — element moves
className = "transition-transform hover:scale-105";
```

---

## Component patterns

### Card

```tsx
<div className="bg-surface-1 rounded-lg p-5 transition-colors duration-150">
  {children}
</div>
```

### Primary button (publish, confirm)

```tsx
<Button className="bg-primary/15 text-primary hover:bg-primary/25 transition-colors duration-150">
  Publish job
</Button>
```

### Ghost button (cancel, secondary)

```tsx
<Button
  variant="ghost"
  className="hover:bg-surface-3 transition-colors duration-150"
>
  Cancel
</Button>
```

### Destructive button (close, delete)

```tsx
<Button className="bg-danger/15 text-danger hover:bg-danger/25 transition-colors duration-150">
  Close job
</Button>
```

### Input / Textarea

```tsx
<Input className="bg-surface-3 text-text placeholder:text-text-muted transition-colors duration-150" />
```

### Form label

```tsx
<Label className="text-text-muted text-sm font-medium" />
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
| Raw hex in className                         | Semantic token (`bg-surface-1`, `text-text`) |
| `font-bold`, `font-semibold` (except badges) | `font-medium`                                 |
| `rounded-xl` or larger                       | `rounded-lg` max                              |
| `shadow-lg`, `shadow-xl`                     | ``                                            |
| `bg-blue-500`, `bg-green-400`                | Status tokens                                 |
| Hover animations that move                   | `hover:bg-surface-3` only                         |
| `style={{ color: '#...' }}`                  | Tailwind class                                |
| Second accent color                          | One accent: `--primary` only                  |
| `text-[10px]`                                | `text-xs` minimum                             |
| Nested surfaces beyond layer 2               | Flatten the layout                            |
