---
name: Obsidiana
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#ffb784'
  on-tertiary: '#4f2500'
  tertiary-container: '#a15100'
  on-tertiary-container: '#ffe0cd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin: 24px
---

## Brand & Style
This design system is engineered for the high-stakes environment of Argentine commerce, where speed, reliability, and clarity are paramount. The aesthetic is **Corporate Modern** with a lean toward **Minimalist functionality**. It leverages a deep, obsidian-inspired dark mode to reduce eye strain during long shifts in retail or administrative settings.

The brand personality is authoritative and "bulletproof." It evokes a sense of technological sophistication through high-contrast interfaces and precision-engineered layouts. By stripping away unnecessary ornamentation, the design system focuses the user's attention on transactional data and inventory management, providing a professional workspace that feels more like a precision tool than a generic website.

## Colors
The palette is built on a foundation of "Obsidian Darks." The primary background is a deep, near-black charcoal, providing a canvas that makes data points pop. 

- **Primary:** A vibrant Violet (#7C3AED) used for critical action paths and brand recognition.
- **Secondary:** An Electric Blue (#0EA5E9) reserved for informational callouts, links, or secondary indicators.
- **Surface Tiers:** UI layering is achieved through subtle shifts from `#121212` (base) to `#1A1A1A` (cards/modals).
- **Status:** Standard semantic colors apply (Success: Emerald, Warning: Amber, Error: Rose), but they are tuned for high luminosity against the dark backgrounds to ensure WCAG compliance.

## Typography
The system utilizes **Inter** for its exceptional legibility and neutral, systematic character. In retail environments where screens are often viewed from a distance or under varied lighting, the high x-height of Inter ensures data remains readable.

- **Headlines:** Use tighter letter-spacing and heavier weights to establish clear hierarchy.
- **Tabular Data:** Use `tnum` (tabular figures) for all numerical displays, prices, and stock counts to ensure vertical alignment in tables.
- **Labels:** Small caps or uppercase labels are used sparingly for metadata to distinguish them from actionable body text.

## Layout & Spacing
The design system employs a **Fixed-Fluid Hybrid Grid**. For large-scale dashboards, a 12-column fluid grid with a maximum container width of 1440px is used. For mobile point-of-sale interfaces, the system transitions to a single-column layout with generous touch targets.

Spacing follows a strict 4px/8px baseline rhythm. Internal component padding should prioritize density for professional workflows; use `16px` for standard card padding and `8px` for tighter list items. Consistent gutters of `16px` ensure that even information-dense screens feel organized and breathable.

## Elevation & Depth
Depth is signaled through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows. In a dark-themed environment, shadows are naturally less visible, so this system relies on:

1.  **Luminance Stepping:** The higher an element's elevation, the lighter its background hex code (e.g., Background #121212 → Card #1A1A1A → Popover #242424).
2.  **Ghost Borders:** Use 1px borders with low opacity (`rgba(255, 255, 255, 0.1)`) to define the boundaries of cards and inputs.
3.  **Accent Gloom:** For primary buttons or active states, a very subtle outer glow of the primary color (#7C3AED) can be used to simulate light emission in the dark interface.

## Shapes
The system uses a **Rounded** language (Level 2). This softens the "industrial" feel of the dark theme, making the software feel modern and approachable while maintaining professional rigor. 

- **Standard Elements:** 8px (0.5rem) for buttons, input fields, and small cards.
- **Large Containers:** 16px (1rem) for main dashboard panels and modals.
- **Full Rounding:** Reserved exclusively for tags, status badges, and search bars to provide visual variety and indicate specific functionality.

## Components
- **Buttons:** Primary buttons use a solid Violet fill with white text. Secondary buttons use a ghost style with a subtle border and the Electric Blue accent for text. 
- **Input Fields:** Backgrounds should be a shade darker than the cards they sit on to create an "inset" feel. Borders brighten to the primary color on focus.
- **Cards:** Use the #1A1A1A surface color with an 8px corner radius. No shadow is required; use the subtle border to separate from the background.
- **Data Tables:** High-density rows with 1px horizontal dividers. Use "striped" rows (alternating #1A1A1A and #1E1E1E) for large datasets.
- **Status Chips:** Small, pill-shaped indicators. Use a low-opacity background of the semantic color (e.g., 10% Green) with a high-intensity text color for readability.
- **Inventory List:** A specialized component featuring a thumbnail, SKU, and a high-contrast stock count badge.