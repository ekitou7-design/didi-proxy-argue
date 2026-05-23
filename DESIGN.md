---
name: Paperback Indie
colors:
  surface: '#fff8f6'
  surface-dim: '#f4d3cb'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ed'
  surface-container: '#ffe9e4'
  surface-container-high: '#ffe2db'
  surface-container-highest: '#fddbd3'
  on-surface: '#291712'
  on-surface-variant: '#5d4038'
  inverse-surface: '#402c26'
  inverse-on-surface: '#ffede8'
  outline: '#926f66'
  outline-variant: '#e7bdb2'
  surface-tint: '#b12d00'
  primary: '#ad2c00'
  on-primary: '#ffffff'
  primary-container: '#d83900'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb5a0'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#005daa'
  on-tertiary: '#ffffff'
  tertiary-container: '#0075d5'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb5a0'
  on-primary-fixed: '#3b0900'
  on-primary-fixed-variant: '#872000'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a5c8ff'
  on-tertiary-fixed: '#001c3a'
  on-tertiary-fixed-variant: '#004785'
  background: '#fff8f6'
  on-background: '#291712'
  surface-variant: '#fddbd3'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Bricolage Grotesque
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: Bricolage Grotesque
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-margin: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is built on a "Minimalist Indie Manga" aesthetic. It rejects the heavy, dark-themed tropes of traditional scanlator sites in favor of a clean, editorial feel that mimics high-quality risograph printing on cream-toned paper. 

The style combines the playful irregularities of hand-drawn art with a structured, high-contrast layout. It utilizes a Neo-brutalist foundation—characterized by thick black strokes and offset hard shadows—but softens the impact through a palette of airy pastels and organic, hyper-rounded corners. The emotional response should be one of tactile delight, accessibility, and modern sophistication.

## Colors

The palette is centered on a warm, paper-like cream background (#FFFDF5) to reduce eye strain and provide a "physical book" feel. 

- **Primary Action:** Bright Orange (#FF4500) is used for high-intent actions like "Read Now" or "Subscribe."
- **Secondary Action:** Purple (#8B5CF6) is used for secondary navigational elements or tag filtering.
- **Surface Accents:** Light Purple, Light Blue, and Light Orange are used as container backgrounds to categorize content types (e.g., Genres, Status, or Chapter lists).
- **Ink:** A soft off-black (#1A1A1A) is used for all outlines and typography to maintain high contrast without the harshness of pure hex black.

## Typography

This design system exclusively uses **Bricolage Grotesque** to leverage its expressive, variable-width characters that feel both technical and human. 

Headlines should be set with tight leading and slight negative letter spacing to create a dense, "blocky" feel reminiscent of manga cover titles. Body text remains generous in line height to ensure long-form reading comfort. Use the Bold and ExtraBold weights liberally for UI labels to compete with the thick 3px borders of the components.

## Layout & Spacing

The layout follows a **fluid grid** model with generous outer margins (24px on mobile, 64px+ on desktop) to let the cream background act as a frame. 

Elements are organized in "stacks." Because the components use heavy 4px offset shadows, the vertical spacing (stack-lg) must be large enough to prevent shadows from overlapping the component below. Use a 12-column grid for desktop chapter galleries and a 2-column masonry or simple list for mobile. All containers should have a minimum internal padding of 20px to accommodate the large corner radii.

## Elevation & Depth

Depth is not communicated through blurs or realistic lighting, but through **physical displacement**.

1.  **Resting State:** Elements have a 2px or 3px black solid outline and a 4px 4px 0px 0px black shadow. This creates a "sticker" or "cut-out" effect.
2.  **Interactive State (Hover/Focus):** On hover, the element should move 2px down and 2px right, while the shadow reduces to 2px 2px. This simulates the button being pressed physically toward the page.
3.  **Active State (Press):** The element moves the full 4px, the shadow disappears (0px), appearing as if the element is now flush with the background paper.

## Shapes

The shape language is hyper-rounded. 

- **Components:** Standard buttons and input fields use a minimum radius of 24px. 
- **Cards:** Manga cover containers and large modals use a 32px radius.
- **Outlines:** All strokes must be 2px (for small elements) or 3px (for cards/buttons). If possible, use a slightly irregular "hand-drawn" SVG stroke-dasharray or a custom border-image to mimic ink on paper, avoiding mathematically perfect lines.

## Components

- **Buttons:** High-contrast blocks of #FF4500 or #8B5CF6 with 3px black borders. Text is always centered, bold, and uppercase.
- **Cards (Manga Covers):** The image itself should have a 24px radius and a 2px black border. The card container uses one of the pastel accent colors (e.g., #F3E8FF) with the signature 4px offset shadow.
- **Chips/Tags:** Used for genres. No shadow—just a 2px border and a pill shape. Use the light accent colors as backgrounds.
- **Input Fields:** Cream background (same as page) but with a thick 3px border to define the area. Placeholder text should be in a medium-gray version of the typeface.
- **Lists:** Chapter lists should be treated as stacked "strips" with 2px borders, separated by 8px of vertical space to allow their individual shadows to breathe.
- **Reader Interface:** The reader itself should be "frameless," but UI overlays (back buttons, settings) should appear as floating "stickers" using the same rounded, shadowed style.