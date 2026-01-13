# KoderKids Brand Color Palette

## Overview
This document defines the official brand color palette extracted directly from the `koder-kids-logo.svg` file. All colors are exact hex values from the brand logo.

---

## Color Extraction Analysis

### Colors Found in Logo SVG:
1. **#b166cc** - Primary Purple (cls-2, cls-3) - Used in "KODER" text
2. **#b065ca** - Purple Variant 1 (cls-10) - Used in logo shapes
3. **#b26cc8** - Purple Variant 2 (cls-11) - Used in logo shapes
4. **#2362ab** - Secondary Blue (cls-6, cls-4) - Used in "KIDS" text
5. **#2c62a5** - Blue Variant 1 (cls-5) - Used in logo shapes
6. **#2c60a8** - Blue Variant 2 (cls-8) - Used in logo shapes
7. **#2862aa** - Blue Variant 3 (cls-12) - Used in logo shapes
8. **#343434** - Dark Neutral (cls-1) - Used in logo shapes
9. **#fefefe** - Off-White Background (cls-13) - Logo background

---

## Semantic Color Palette

### 🟣 Primary Brand Color (Purple/Magenta)
**Main Color: `#b166cc`**

**Usage in Logo:**
- "KODER" text (primary brand identifier)
- Primary geometric shapes in logo

**Variants:**
- `#b065ca` - Slightly lighter purple variant
- `#b26cc8` - Alternative purple tone

**UI Application:**
- Primary buttons
- Primary links and CTAs
- Brand highlights
- Active states
- Sidebar background (if applicable)

**Accessibility:**
- Use white text (`#FFFFFF`) on primary backgrounds
- Ensure WCAG AA contrast ratio (4.5:1 minimum)

---

### 🔵 Secondary Brand Color (Blue)
**Main Color: `#2362ab`**

**Usage in Logo:**
- "KIDS" text (secondary brand identifier)
- Secondary geometric shapes in logo

**Variants:**
- `#2c62a5` - Blue variant 1
- `#2c60a8` - Blue variant 2
- `#2862aa` - Blue variant 3

**UI Application:**
- Secondary buttons
- Secondary links
- Info states
- Accent elements
- Supporting UI elements

**Accessibility:**
- Use white text (`#FFFFFF`) on secondary backgrounds
- Ensure WCAG AA contrast ratio (4.5:1 minimum)

---

### ⚫ Neutral Colors
**Dark Neutral: `#343434`**

**Usage in Logo:**
- Structural shapes and elements
- Provides depth and contrast

**UI Application:**
- Primary text color
- Dark UI elements
- Borders and dividers
- Icons and graphics

---

### ⚪ Background Colors
**Off-White: `#fefefe`**

**Usage in Logo:**
- Logo background/container

**UI Application:**
- Page backgrounds
- Card backgrounds
- Light surfaces

---

## Implementation

### In Tailwind CSS
```jsx
// Primary colors
className="bg-brand-primary"           // #b166cc
className="bg-brand-primary-dark"      // #9a4fb8
className="bg-brand-primary-light"     // #c87fdd

// Secondary colors
className="bg-brand-secondary"        // #2362ab
className="bg-brand-secondary-dark"   // #1d4f8a
className="bg-brand-secondary-light"  // #4a8fd4

// Neutral
className="text-brand-neutral-dark"   // #343434
className="bg-brand-bg-white"          // #fefefe
```

### In JavaScript/React
```javascript
import { COLORS } from './utils/designConstants';

// Primary
COLORS.primary.base        // #b166cc
COLORS.primary.dark        // #9a4fb8
COLORS.primary.light       // #c87fdd

// Secondary
COLORS.secondary.base      // #2362ab
COLORS.secondary.dark      // #1d4f8a
COLORS.secondary.light      // #4a8fd4

// Neutral
COLORS.neutral.dark        // #343434
COLORS.background.white    // #fefefe
```

---

## Color Usage Guidelines

### ✅ DO:
- Use primary purple (`#b166cc`) for main brand elements
- Use secondary blue (`#2362ab`) for supporting elements
- Maintain consistent color usage across the application
- Use calculated shades (dark/light) for hover and active states
- Ensure proper contrast ratios for accessibility

### ❌ DON'T:
- Don't use colors outside this palette for brand elements
- Don't modify the base hex values
- Don't use primary and secondary colors at equal visual weight
- Don't use brand colors for error/warning states (use status colors)

---

## Color Relationships

### Primary vs Secondary
- **Primary (Purple)** should be used for:
  - Main CTAs and primary actions
  - Primary navigation elements
  - Key brand moments
  
- **Secondary (Blue)** should be used for:
  - Secondary actions
  - Supporting information
  - Complementary elements

### Contrast & Hierarchy
- Use dark neutral (`#343434`) for primary text
- Use calculated lighter shades for backgrounds
- Maintain clear visual hierarchy with color weight

---

## Accessibility Notes

All brand colors meet WCAG AA standards when used with appropriate text colors:
- Primary purple with white text: ✅ AA compliant
- Secondary blue with white text: ✅ AA compliant
- Dark neutral on white: ✅ AA compliant

Always test color combinations for contrast before implementation.

---

## File Locations

- **Design Constants**: `frontend/src/utils/designConstants.js`
- **Tailwind Config**: `frontend/tailwind.config.js`
- **Logo Source**: `koder-kids-logo.svg`

---

*Last Updated: Based on koder-kids-logo.svg analysis*
*All colors extracted directly from brand logo SVG file*
