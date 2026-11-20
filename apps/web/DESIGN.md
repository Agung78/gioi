# apps/web UI contract

Read before touching any `.vue`, `assets/css/style.css`, or `tailwind.config.js`. Scope: layout, responsiveness, tokens, shape. Per-page content/copy lives in `docs/design/gioi_ui_design_spec.md` (predates the Nuxt move; if it disagrees with this file or the code, this file wins).

**Rule: a feature change must not alter anything below unless the task says "change the design/layout". If a change needs an exception, say so in the reply.**

## Breakpoints (Tailwind defaults, mobile-first)

| Name | Min width | Device meaning |
|---|---|---|
| base | 0 | phone. Design here first; no horizontal page scroll |
| `sm` | 640px | large phone / small tablet. Header nav switches from scroll-strip to inline |
| `md` | 768px | tablet. Page gutter `px-4` -> `px-8`, two-column grids start, vertical rhythm grows |
| `lg` | 1024px | desktop. Booking bottom bar (`book.vue`) is hidden, summary becomes in-page |

No custom breakpoints. No `xl:`/`2xl:` unless adding a new page-level layout (usage today: none). Use `sm`/`md`/`lg` only.

## Page shell

- Container: `mx-auto max-w-{size} px-4 md:px-8`. Allowed widths: public landing `7xl`; admin/host/guest `5xl`-`6xl`; forms, confirmation, feedback, login, privacy `2xl`. Header inner is `max-w-6xl`.
- Vertical padding: `py-8` (app screens), `py-12 md:py-20` (public sections), `pt-8 pb-28 lg:pb-16` when a fixed bottom bar exists (reserve its height).
- Header (`app.vue`): sticky, `z-30`, blurred `bg-surface/90`, persistent view-transition name `app-header`. Hidden on public routes (`definePageMeta({ public: true })`). Do not move it, resize it, or give it another z-index.
- Primary nav: inline `hidden sm:flex`; below `sm` a second row with `overflow-x-auto`. Keep both in sync.
- Public routes: no header; floating `ThemeToggle` bottom-right. `definePageMeta({ bottomBar: true })` lifts it above the booking bar (`bottom-28 lg:bottom-6`).
- Booking bottom bar: `fixed inset-x-0 bottom-0 z-20`, `lg:hidden`, bottom padding `max(1rem, env(safe-area-inset-bottom))`. Any new fixed bottom UI must respect safe-area.
- z-order: skip link 50, theme toggle 50, header 30, booking bar 20. Modals/toasts must not sit below the header.

## Touch and tablet (host surface is used on a tablet in service)

- Every tappable target is >= 44px (`min-h-11`; header controls `min-h-10` is the floor, not the target). Use `.btn`, `.pill`; never a bare `<button>` with small padding.
- Inputs use `text-base` (16px) so iOS does not zoom on focus. Never shrink `.field` text.
- No hover-only affordances. Hover is enhancement; focus-visible ring (`ring-accent`) is mandatory.
- Wide data (tables, availability grid, floor plan) scrolls inside its own `overflow-x-auto` wrapper; the page never scrolls sideways.

## Tokens (single source: `:root` in `style.css`)

- Colors are RGB-triplet CSS vars consumed through Tailwind names: `surface`, `raised`, `ink`, `muted`, `line`, `accent`, `accent-ink`, `danger`, brand `sand`/`sun`/`navy`. Light, `[data-theme=dark]`, and `prefers-color-scheme` blocks must stay identical in keys; add a token to all three.
- Never hardcode hex/`rgb()` or Tailwind palette colors (`bg-gray-100`, `text-blue-600`) in components. Exception: floor-plan user-chosen object colors. `gioi-*` names are legacy aliases; do not use in new code.
- Every screen must be checked in light and dark.

## Typography

- Display (`font-display`, Cabinet Grotesk 700/800): `h1`-`h3` only, already applied globally. Body `font-sans` (Satoshi 400/500/700). No new fonts, no new weights without adding the `@font-face`.
- Numbers use `tabular-nums` (set on `body`); do not unset.

## Shape and components (use the classes; do not re-style)

| Thing | Rule |
|---|---|
| Interactive (buttons, chips, pills) | fully round: `.btn-primary/-secondary/-ghost/-danger`, `.pill` + `.pill-on`, `.chip` |
| Surfaces | `.card` = `rounded-surface` (16px), `border-line`, `bg-raised`, `shadow-soft` |
| Inputs | `.field` / `.label` = `rounded-input` (12px) |
| Notices | `.alert-warn`, `.alert-danger` |

New one-off `rounded-*`, `shadow-*`, or button styling = reject; extend the class in `@layer components` instead.

## Motion

- Enter-only, < 300ms, ease `cubic-bezier(0.23, 1, 0.32, 1)`. Existing: `.rise`, `.reveal`, route view-transition, `modal-*`, `toast-*`, `fade-*`.
- Must degrade under `prefers-reduced-motion` (global rule already covers CSS; keep new motion CSS-based so it inherits it).
- Do not touch `@view-transition`, `app-header` transition rules, or `theme-vt` without a task for it.

## Accessibility baseline

Skip link and `<main id="main">` stay. Icon-only controls need `aria-label`. Nav landmarks keep `aria-label="Primary"`. Contrast uses tokens only.

## Done-check for any UI change

1. Viewed at 375, 768, 1280 widths; no horizontal page scroll.
2. Light and dark.
3. Host tablet pages (`host.vue`, `guests/[id].vue`) at 768 and 1024 in touch conditions.
4. `git diff` touches no breakpoint, container width, z-index, or token unless the task asked for it.
