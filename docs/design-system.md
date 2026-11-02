# MicroAxis Calendar — Design System

## Concept

**The working ledger.** A calendar that reads like a well-kept studio ledger: warm paper, ink, hairline rules, and one green stamp of affirmation. The calendar grid is the main surface; cards are used only when elevation communicates hierarchy.

The existing MicroAxis landing page is the brand reference. It is not restyled or embedded.

## Typography

- **Instrument Sans** — all UI, labels, and body copy
- **Instrument Serif** — welcome headings and empty-state headlines only; never calendar data
- **IBM Plex Mono** — times, counts, keyboard hints, and small metadata

No Inter, Roboto, or Open Sans. No emojis. No generic icon library; Phosphor icons are used consistently.

## Color

Light:

- Canvas `#F7F6F2`
- Surface `#FFFFFF`
- Ink `#141411`
- Muted ink `#66665C` (AA on canvas and surface)
- Line `#E5E4DC`
- Accent `#0C7A43`

Dark:

- Canvas `#121310`
- Surface `#191A16`
- Ink `#F2F0E8`
- Muted ink `#9B9A90`
- Line `#2B2C26`
- Accent `#5BC08A`

Category pastels: sage, sky, amber, rose, clay. Category color is always paired with a label or icon; color is never the only signal.

## Shape and surfaces

- 6px controls
- 10px panels
- 999px only for tags and avatars
- 1px borders, no gradients, no glassmorphism, no heavy shadows
- Paper-noise overlay at 2.5% opacity, fixed and pointer-events none

## Layout

- 248px desktop rail
- 56px topbar
- calendar canvas
- contextual event drawer on desktop; full-screen dialog on mobile
- mobile bottom navigation with 56px targets
- agenda is the mobile default; week is the desktop default

## Distinctive details

- Ledger-margin time spine in week and agenda views
- Small creator monograms on event bands and full creator bylines in agenda/drawer
- Category ticks and priority markers
- Green current-time notch
- Quiet, low-contrast metadata

## Motion

- 160–240ms transitions, transform and opacity only
- Drawer and toast motion respects `prefers-reduced-motion`
- No perpetual or decorative animation
- Press states use `scale(0.98)`

## Accessibility

- Axe reports zero serious/critical WCAG 2.2 A/AA violations across week, month, agenda, event drawer, settings, mobile, and dark mode
- Focus-visible ring uses the accent color
- Skip-to-content link
- Route changes update document title and announce the new page
- Dialog focus trap and focus restoration
- Native labels, `aria-invalid`, and `aria-describedby` on form errors
- 16px mobile inputs to prevent iOS zoom
- 24px minimum target size; 44px+ on mobile navigation
- Color is never the sole carrier of meaning

## Copy

Plain verbs and specific nouns. No “elevate”, “seamless”, “unleash”, or “next-gen”. Empty states say what to do next. Errors explain what happened and how to fix it.
