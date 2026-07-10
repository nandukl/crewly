---
name: Executive Modular Suite
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#23005c'
  on-tertiary-container: '#9466ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system is engineered for high-density, multi-tenant enterprise environments. The brand personality is **authoritative, precise, and systematic**, aiming to reduce the cognitive load of complex workflows. The visual direction follows a **Corporate / Modern** aesthetic with a strong emphasis on architectural clarity and information hierarchy.

The system prioritizes a "Professional Suite" feel, utilizing a modular, card-based structure that allows for seamless multi-tenancy context switching. It balances the rigidity of enterprise software with the fluidity of modern SaaS through subtle transitions and refined depth.

**Key Brand Pillars:**
- **Sovereignty:** Clear visual boundaries and organization-specific identifiers.
- **Precision:** High-fidelity detailing in data visualization and UI controls.
- **Intelligence:** A distinct visual language for AI-assisted features (using AI Purple).

## Colors
The palette is rooted in institutional stability, using **Deep Enterprise Navy** (`#0F172A`) for primary navigation and text to establish authority. **Action Blue** (`#2563EB`) is reserved strictly for primary interactive elements and focus states to ensure WCAG 2.1 AA compliance.

A specialized **AI Purple** (`#8B5CF6`) is used sparingly to denote automated insights or machine-learning layers, differentiating human-generated data from platform intelligence. Neutral tones use a **Slate** scale to maintain a cool, professional temperature across the interface.

**Functional Color Application:**
- **Primary:** Navigation, Headers, and Critical Typography.
- **Action:** Buttons, Links, Selection states.
- **AI Layer:** Gradient accents, Sparkle icons, and AI-generated card borders.
- **Status:** Standard Semantic Green (Success), Red (Destructive), and Amber (Warning) are utilized with high-contrast text.

## Typography
The system employs a dual-font strategy. **Geist** is used for headlines, labels, and technical data for its precise, developer-friendly geometry. **Inter** is used for body copy and long-form descriptions to ensure maximum legibility across all display types.

**Hierarchy Rules:**
- Use `display-lg` exclusively for dashboard overviews and empty state hero sections.
- `label-md` should always be in Uppercase when used for section headers in sidebars or table headers.
- Maintain a minimum of 1.4x line-height for body text to ensure readability in data-dense environments.
- Use tabular numbers (monospaced) for all numerical data in tables and financial modules.

## Layout & Spacing
This design system utilizes a **12-column fluid grid** for internal content areas, while the global navigation remains fixed at 240px (expanded) or 64px (collapsed). A 4px baseline shift ensures all components align to a predictable rhythm.

**Breakpoints:**
- **Mobile (Up to 768px):** Single column, 16px side margins.
- **Tablet (769px - 1024px):** 6-column grid, 24px side margins.
- **Desktop (1025px+):** 12-column grid, 32px side margins, max-content width of 1440px.

**Multi-Tenant Contextual Header:** A persistent 48px top bar is reserved for the Organization Switcher and Global Search, ensuring the user always understands their current tenant context.

## Elevation & Depth
Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. The design avoids heavy black shadows, opting for soft, Navy-tinted shadows that feel integrated with the background.

**Elevation Levels:**
- **Level 0 (Flat):** Background surfaces (`#F8FAFC`).
- **Level 1 (Low):** Cards and main content containers. Uses a 1px border (`#E2E8F0`) and no shadow.
- **Level 2 (Medium):** Hover states for cards and interactive modules. Uses a soft shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.1)`.
- **Level 3 (High):** Modals, Popovers, and Dropdowns. Uses a deep shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.15)`.

**Contextual Borders:** In multi-tenant views, a 4px left-border accent color is used on the "Active Tenant Card" to provide instant orientation.

## Shapes
The shape language is **Soft and Professional**, utilizing a standard 0.25rem (4px) radius for most UI components. This creates a crisp, architectural feel without the harshness of sharp corners or the casualness of overly rounded pills.

**Shape Application:**
- **Standard (4px):** Buttons, Input fields, Checkboxes.
- **Large (8px):** Cards, Modals, Section containers.
- **Extra Large (12px):** Feature announcements or AI Insight panels.

## Components

### Buttons
- **Primary:** Filled Action Blue (`#2563EB`) with white text. 4px radius.
- **Secondary:** Ghost style with Navy text and a Slate-200 border.
- **AI Action:** Gradient fill (Action Blue to AI Purple) with a subtle glow on hover.

### Data Tables
- **Header:** Slate-50 background, Uppercase `label-md` typography.
- **Rows:** 1px bottom border (`#F1F5F9`). High-contrast text for values.
- **Density:** Provide a "Compact" vs "Comfortable" toggle for power users.

### Cards
- White background, 1px Slate-200 border.
- 16px internal padding for standard, 24px for dashboard widgets.
- Active states indicated by a 2px Action Blue bottom border.

### Input Fields
- Clear labels using `label-md`. 
- 1px Slate-300 border that thickens and changes to Action Blue on focus.
- Error states must include both a red border and an icon for accessibility.

### Organization Switcher
- A specialized component in the sidebar featuring the Tenant Logo, Name, and a "chevron-down" for quick switching. 
- Tenant-specific branding should be limited to small accents (e.g., a colored dot or avatar) to maintain system-wide consistency.