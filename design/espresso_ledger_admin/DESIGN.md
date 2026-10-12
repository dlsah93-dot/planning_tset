---
name: Espresso Ledger Admin
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
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#86522e'
  on-secondary: '#ffffff'
  secondary-container: '#ffba8e'
  on-secondary-container: '#7a4825'
  tertiary: '#240f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#422000'
  on-tertiary-container: '#d97705'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#ffdbc7'
  secondary-fixed-dim: '#fcb88c'
  on-secondary-fixed: '#311300'
  on-secondary-fixed-variant: '#6a3b19'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  numeric-hero:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.02em
  numeric-table:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

### Personality & Purpose
The design system powers high-frequency back-office retail analytics, real-time inventory management, and margin/P&L accounting for modern cafes and multi-roastery enterprises. It balances rigorous fiscal precision with tactile cafe warmth: authoritative, mathematically clear, and operationally rapid under stressful shift-change environments.

### Visual Style: High-Density Precision SaaS
The visual direction combines **Modern High-Density SaaS** with an **Editorial Warm Neutral Palette**:
- **Information Architecture**: Ultra-legible tabular data displays, compact component heights, and deliberate boundary lines rather than heavy floating cards.
- **Warmth vs Authority**: Cool slate neutrals (#0F172A, #1E293B) anchor structural navigation, tables, and typography, while rich espresso (#7C4A27) and amber accents give the tool its distinct specialty-coffee identity.
- **Audit-First Visibility**: Financial entries (profits, stock discrepancies, spoilage loss) are treated as ledger events requiring explicit color-coded validation states and strict tabular-number alignments.

## Colors

### Color Philosophy & Functional Token Mapping
The palette prioritizes operational clarity and financial auditing ergonomics over decorative expression.

- **Primary & Structural Base**:
  - `slate-950` (`#0F172A`): Primary headings, modal backdrop base, high-emphasis text.
  - `slate-800` (`#1E293B`): Primary interactive buttons, top navigation bars, active filter tabs.
  - `slate-600` (`#475569`): Field labels, table headers, supporting secondary text.
  - `slate-400` (`#94A3B8`): Placeholder text, muted icon fills, disabled indicators.

- **Brand & Domain Accents**:
  - `espresso-primary` (`#7C4A27`): Brand identity touchpoints, batch roasting references, primary highlighted summary cards.
  - `espresso-tint` (`#FDF8F5`): Subtle surface fills for cafe-specific meta containers.
  - `amber-warm` (`#D97706`): Caution flags, unit mismatches, physical audit variance alerts, secondary badges.
  - `amber-tint` (`#FFFBEB`): Warning notification background and audit discrepancy callout panels.

- **Semantic Financial Indicators**:
  - `success-emerald` (`#059669`): Stock receiving (입고), operating margin profit, verified match state. Surface background: `#ECFDF5`.
  - `danger-rose` (`#DC2626`): Stock disposal/spoilage (폐기), deficit, critical stock-out thresholds. Surface background: `#FEF2F2`.

- **Surfaces & Overlays**:
  - `bg-canvas` (`#F8FAFC`): Base dashboard viewport background.
  - `bg-surface` (`#FFFFFF`): Work surface cards, inputs, dropdown menus, and modal dialogs.
  - `bg-subtle` (`#F1F5F9`): Table header rows, disabled inputs, read-only field fills.
  - `border-default` (`#E2E8F0`): Strict, low-noise layout division borders.
  - `backdrop-scrim`: `rgba(15, 23, 42, 0.6)` with backdrop blur for focused modal depth.

## Typography

### Rules for Financial & Numerical Displays
- **Tabular Figures Required**: All financial values, unit quantities (g, ml, 개), inventory counts, and timestamps must render with CSS `font-variant-numeric: tabular-nums` (or `font-feature-settings: "tnum" 1`). This ensures currency decimals and negative deltas align cleanly down vertical table axes.
- **Korean Script Pairing**: When localized, Pretendard serves as the primary fallback retaining exact metrics to Inter for Latin text and numerals.
- **Unit Separation Rule**: Units (`원`, `g`, `ml`, `EA`) are treated as structural micro-labels. Render units with `label-sm` in `slate-500`, offset with a 4px gap from the numeric digits rather than concatenated raw text.
- **Negative Balance Syntax**: Negative currency deltas must use clear mathematical formatting: `-₩124,000` or `(₩124,000)` highlighted with `danger-rose`, never solely relying on color.

## Layout & Spacing

### System Architecture
The layout applies a **fluid 12-column grid** constrained by functional view zones:
- **Desktop (1280px+)**: 12 columns with 24px (`1.5rem`) gutters, 32px (`2rem`) canvas margins. Side navigation remains persistent (240px fixed width).
- **Tablet (768px - 1279px)**: 8 columns with 16px (`1rem`) gutters, 24px canvas margins. Side navigation collapses to an icon bar (64px).
- **Mobile (< 768px)**: 4 columns with 16px gutters, 16px canvas margins. Modals convert to bottom sheets.

### Spacing Cadence & Density
- Use `space-xs` (4px) and `space-sm` (8px) for related elements (input label to input container, icon to text, unit badge offsets).
- Use `space-md` (12px) for form control stacking within modal sections and table row padding.
- Use `space-lg` (20px) for inner card margins and modal zone delineations.
- Use `space-xl` (32px) for separation between distinct dashboard data sections.

## Elevation & Depth

### Structural Surface Model
Visual hierarchy avoids extreme drop shadows. Depth is achieved via crisp 1px borders, tonal contrast tiers, and surgical ambient scrims:

- **Level 0 (Flat Canvas)**: `#F8FAFC` base page background.
- **Level 1 (Card & Table Surface)**: `#FFFFFF` with `1px solid #E2E8F0` and `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Level 2 (Popovers, Select Menus, Tooltips)**: `#FFFFFF` with `1px solid #CBD5E1` and `box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Dialogs)**: `#FFFFFF` with `1px solid #CBD5E1`, raised above an active scrim (`rgba(15, 23, 42, 0.6)` with 4px backdrop blur). Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)`.
- **Level Active (Data Field Focus)**: Zero blur displacement; 1px focus ring `#1E293B` backed by a 2px offset halo `rgba(30, 41, 59, 0.15)`.

## Shapes

### Edge Architecture
This system utilizes **Soft** geometry (`roundedness: 1` / 4px base radius) to maintain structural density suitable for enterprise data tables:
- **Base Components (Inputs, Buttons, Badges, Table Rows)**: `4px` (`rounded`, 0.25rem). Retains clean grid alignment without excessive organic softness.
- **Containers & Modals**: `8px` (`rounded-lg`, 0.5rem). Applies to data cards, KPI blocks, and modal dialog windows.
- **Full Radius (Pills)**: Used strictly for Channel Toggles (매장 vs 포장) and inventory status indicator dots.

## Components

### 1. Buttons
- **Primary Action**: Background `#1E293B`, label `#FFFFFF`, hover `#0F172A`, height 36px (compact) or 42px (modal primary). Radius 4px. Font `label-md`.
- **Brand / Accent**: Background `#7C4A27`, text `#FFFFFF`, hover `#633B1F`. Reserved for critical workflow commits (e.g., "정산 마감", "재고 확정").
- **Secondary / Ghost**: Border `1px solid #E2E8F0`, background `#FFFFFF`, text `#334155`, hover `#F8FAFC`.

### 2. Segmented Channel Toggle & Inventory Type Tabs
- **Channel Toggle (매장 vs 포장)**:
  - 36px enclosed segmented container with `#F1F5F9` surface and 1px `#E2E8F0` border.
  - Active segment: `#FFFFFF` fill with micro-shadow `0 1px 2px rgba(0,0,0,0.06)`, text `#0F172A` bold.
- **Inventory Action Tabs (입고 / 폐기 / 실사조정)**:
  - Full-width segmented pill tabs.
  - **입고 (Receiving)** active: Border bottom 2px or subtle tint `#ECFDF5`, text `#059669`.
  - **폐기 (Waste/Disposal)** active: Border bottom 2px or subtle tint `#FEF2F2`, text `#DC2626`.
  - **실사조정 (Audit Adjustment)** active: Border bottom 2px or subtle tint `#FFFBEB`, text `#D97706`.

### 3. Form Input Fields & Unit Badges
- **Container**: 38px height, 1px border `#CBD5E1`, background `#FFFFFF`, radius 4px.
- **Integrated Unit Badges**: Fixed right-aligned attached container (`g`, `ml`, `개`, `원`) rendered with `#F1F5F9` background, `#475569` text, `label-sm`, and inner vertical border line.
- **Number Inputs**: Strict tabular monospace presentation right-aligned against the unit badge.

### 4. Real-Time Calculation Preview Card
- Positioned inside inventory and adjustment modals directly above action footers.
- Surface: `#F8FAFC`, border `1px dashed #CBD5E1`, padding 12px.
- Two-column ledger readout:
  - Left: Computed formula label (e.g., `현재고 1,200g - 폐기 150g`).
  - Right: Projected stock value (`= 1,050g`) in bold `numeric-table`. Color transitions dynamically: `#059669` if stable, `#DC2626` if negative variance.

### 5. Modal Dialogs (Audit & Inventory Transactions)
- **Header**: Title in `headline-md`, close icon button (28px), border-bottom 1px `#E2E8F0`, padding 16px 20px.
- **Guide Banner**: Optional top alert box with semantic coloring (`#FFFBEB` with amber text for inventory warnings).
- **Body**: Max width 520px, scrollable, spacing between field groups 16px.
- **Footer**: Background `#F8FAFC`, border-top 1px `#E2E8F0`, padding 16px 20px, right-aligned secondary (취소) and primary (등록/반영) actions.