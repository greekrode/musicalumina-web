---
name: Ethereal Resonance
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#524345'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#847374'
  outline-variant: '#d7c1c3'
  surface-tint: '#8a4c56'
  primary: '#2e040e'
  on-primary: '#ffffff'
  primary-container: '#491822'
  on-primary-container: '#c37c86'
  inverse-primary: '#ffb2bc'
  secondary: '#7e5700'
  on-secondary: '#ffffff'
  secondary-container: '#feba3e'
  on-secondary-container: '#6f4c00'
  tertiary: '#16140e'
  on-tertiary: '#ffffff'
  tertiary-container: '#2b2822'
  on-tertiary-container: '#948f86'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9dd'
  primary-fixed-dim: '#ffb2bc'
  on-primary-fixed: '#380b15'
  on-primary-fixed-variant: '#6e353f'
  secondary-fixed: '#ffdead'
  secondary-fixed-dim: '#feba3e'
  on-secondary-fixed: '#281900'
  on-secondary-fixed-variant: '#604100'
  tertiary-fixed: '#e8e2d8'
  tertiary-fixed-dim: '#ccc6bc'
  on-tertiary-fixed: '#1e1b16'
  on-tertiary-fixed-variant: '#4a463f'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-edge: 48px
  section-gap: 120px
---

## Brand & Style

The design system is rooted in the concept of "Classical Modernism." It aims to evoke the emotional depth of a grand concert hall—quiet, expansive, and profoundly sophisticated. The target audience consists of discerning enthusiasts who value artistry and precision. 

The visual style is a blend of **Minimalism** and **Editorial Design**. It prioritizes high-quality typography and intentional negative space to create a "breathable" interface. Textures are derived from mathematical musical representations, using "wireframe waves" to symbolize the intersection of technology and art. The overall aesthetic is one of quiet luxury, avoiding trendy flourishes in favor of timeless elegance and thin, precise linework.

## Colors

The palette is anchored by **Burgundy**, used primarily for typography and deep structural elements to convey authority and depth. **Off White** serves as the primary canvas, specifically chosen to reduce the clinical harshness of pure white and provide a paper-like warmth. 

**Marigold** is used sparingly as a high-contrast accent. It represents the "Lumina" (light) aspect of the brand, reserved for primary calls-to-action, active states, and critical highlights. Subtle variations of the background tones should be used for tonal layering to differentiate content sections without relying on heavy shadows.

## Typography

Typography in this design system follows a high-contrast pairing strategy. **Noto Serif** is utilized for all editorial headlines and display text, emphasizing its high-contrast strokes and traditional forms to ground the brand in classic elegance. 

**Manrope** provides a balanced, contemporary counterpoint for functional text. Body copy should maintain a generous line height to ensure readability and reinforce the "airy" feel of the interface. Labels and small metadata should utilize uppercase styling with increased letter spacing to mimic the look of premium archival documentation.

## Layout & Spacing

The layout utilizes a **Fixed Grid** model for desktop to ensure the editorial integrity of the compositions is maintained across different screen sizes. A 12-column system is used with wide gutters and substantial outer margins.

The rhythm of the design system is defined by "The Pause"—extraordinary amounts of vertical space between major sections (120px+) to allow the user's eyes to rest. Elements should be aligned with a mathematical rigor, often utilizing asymmetrical placements to create dynamic, yet stable, visual interest.

## Elevation & Depth

Hierarchy is established through **Low-contrast Outlines** and tonal shifts rather than traditional shadows. This design system rejects the use of heavy "drop shadows" to maintain its minimal aesthetic.

1.  **Surfaces:** Layers are separated by 1px solid lines in a muted version of the Primary color (at 10-15% opacity) or by subtle shifts between the two Off White hex codes.
2.  **Overlays:** Modals and menus should use a subtle backdrop blur (Glassmorphism) with a high-transparency Off White fill, creating the illusion of frosted glass.
3.  **Depth:** Objects that are "higher" in the hierarchy are defined by thinner, crisper borders and Marigold accents, rather than physical distance from the background.

## Shapes

The shape language is primarily **Sharp** and architectural. To maintain a sense of precision, a very subtle "Soft" radius (0.25rem) is used for functional elements like buttons and input fields to prevent the UI from feeling aggressive. Larger containers and sections should retain 0px corners to reflect the rigid beauty of musical scores and traditional printing.

## Components

### Buttons
Primary buttons use a solid **Marigold** fill with Burgundy text, utilizing a wide horizontal padding for an "elegant pill" or "rectangular" look. Secondary buttons are outlined with a 1px Burgundy or Marigold stroke, featuring a hover state that subtly shifts the background color to a faint tint.

### Input Fields
Inputs are minimalist, consisting of a single 1px bottom border that changes to Marigold on focus. Labels sit above the line in the uppercase Label-SM style.

### Cards
Cards are defined by thin 1px borders or simple color blocks. They do not use shadows. Information inside cards is highly structured, with ample padding (32px+) to prevent crowding.

### Decorative Elements
- **Wireframe Waves:** Use as a low-opacity background texture (#491822 at 5% opacity) to add movement to static sections.
- **Musical Notes:** Used as small, abstract glyphs for iconography or bullet points, treated as fine-line art rather than literal illustrations.

### Navigation
A top-tier navigation bar with a fixed position, using high-transparency background blur and Noto Serif for top-level links to reinforce the premium nature of the journey.
