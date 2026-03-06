# Figma Design Tokens Analysis

## Grey Ramp (the backbone)

| Token | Hex | Role in Figma |
|-------|-----|---------------|
| grey-100 | `#f5f5f5` | bg-secondary, bg-hover (light mode) |
| grey-200 | `#e6e6e6` | bg-tertiary, border, bg-pressed |
| grey-300 | `#d9d9d9` | bg-disabled |
| grey-400 | `#b3b3b3` | — |
| grey-500 | `#757575` | — |
| grey-600 | `#444444` | toolbar-tertiary, desktop-tertiary, border-toolbar |
| grey-700 | `#383838` | desktop bg-secondary, border-menu, border-desktop |
| grey-800 | `#2c2c2c` | desktop-foreground bg, toolbar bg, menu-hover |
| grey-900 | `#1e1e1e` | canvas bg, menu bg, tooltip bg |
| grey-1000 | `#111111` | toolbar-hover/pressed |

## White Ramp (opacity-based, for dark surfaces)

| Token | Hex | Alpha | Role |
|-------|-----|-------|------|
| white-100 | `#ffffff0d` | 5% | transparent bg |
| white-200 | `#ffffff1a` | 10% | loading secondary |
| white-300 | `#ffffff33` | 20% | hover on dark canvas, border-toolbar/menu |
| white-400 | `#ffffff66` | 40% | disabled text/icon on dark, tertiary text/icon |
| white-500 | `#ffffffb3` | 70% | secondary text/icon on dark |
| white-600 | `#ffffffcc` | 80% | on-assistive/brand secondary |
| white-700 | `#ffffffd9` | 85% | — |
| white-800 | `#ffffffe6` | 90% | text on dark canvas, icon on dark canvas |
| white-900 | `#fffffff2` | 95% | — |
| white-1000 | `#ffffff` | 100% | primary text/icon on dark |

## Black Ramp (opacity-based, for light surfaces)

| Token | Hex | Alpha | Role |
|-------|-----|-------|------|
| black-100 | `#0000000d` | 5% | transparent bg |
| black-200 | `#0000001a` | 10% | transparent-secondary, border translucent |
| black-300 | `#00000033` | 20% | hover on light canvas |
| black-400 | `#0000004d` | 30% | icon-tertiary, text-tertiary, text-disabled |
| black-500 | `#00000080` | 50% | text-secondary, icon-secondary |
| black-600 | `#000000cc` | 80% | — |
| black-700 | `#000000d9` | 85% | — |
| black-800 | `#000000e6` | 90% | text primary, icon primary |
| black-900 | `#000000f2` | 95% | — |
| black-1000 | `#000000` | 100% | pure black |

## Desktop App Surface Hierarchy (dark mode)

Figma distinguishes 3 desktop contexts:

### desktopFullscreen (darkest)
| Element | Token | Hex |
|---------|-------|-----|
| bg | `black-1000` | `#000000` |
| bg-hover | `grey-900` | `#1e1e1e` |
| bg-secondary | `grey-700` | `#383838` |
| bg-tertiary | `grey-600` | `#444444` |
| border | `grey-900` | `#1e1e1e` |
| text | `white-1000` | `#ffffff` |
| text-secondary | `white-500` | `#ffffffb3` (70%) |
| text-tertiary | `white-400` | `#ffffff66` (40%) |

### desktopForeground (panels)
| Element | Token | Hex |
|---------|-------|-----|
| bg | `grey-900` | `#1e1e1e` |
| bg-hover | `grey-800` | `#2c2c2c` |
| bg-secondary | `grey-700` | `#383838` |
| bg-tertiary | `grey-600` | `#444444` |
| border | `grey-700` | `#383838` |
| text | `white-1000` | `#ffffff` |
| text-secondary | `white-500` | `#ffffffb3` (70%) |
| text-tertiary | `white-400` | `#ffffff66` (40%) |

### desktopBackgrounded (unfocused/background window)
| Element | Token | Hex |
|---------|-------|-----|
| bg | `grey-700` | `#383838` |
| bg-hover | `grey-600` | `#444444` |
| bg-secondary | `grey-700` | `#383838` |
| bg-tertiary | `grey-600` | `#444444` |
| border | `grey-600` | `#444444` |
| text | `white-500` | `#ffffffb3` (70%) |
| text-secondary | `white-500` | `#ffffffb3` (70%) |
| text-tertiary | `white-400` | `#ffffff66` (40%) |

## Context-Specific Surfaces

### Menu (dropdowns, context menus)
| Element | Token | Hex |
|---------|-------|-----|
| bg | `grey-900` | `#1e1e1e` |
| bg-hover | `grey-800` | `#2c2c2c` |
| bg-secondary | `grey-700` | `#383838` |
| bg-tertiary | `grey-600` | `#444444` |
| bg-selected | `blue-500` | `#0d99ff` |
| border | `grey-700` | `#383838` |
| text | `white-1000` | `#ffffff` |
| text-secondary | `white-500` | 70% |
| text-tertiary | `white-400` | 40% |

### Toolbar (bottom floating bar)
| Element | Token | Hex |
|---------|-------|-----|
| bg | `grey-800` | `#2c2c2c` |
| bg-hover | `grey-1000` | `#111111` |
| bg-secondary | `grey-700` | `#383838` |
| bg-tertiary | `grey-600` | `#444444` |
| bg-selected | `blue-500` | `#0d99ff` |
| border | `grey-600` | `#444444` |
| text | `white-1000` | `#ffffff` |
| text-secondary | `white-500` | 70% |

### Tooltip
| Element | Token | Hex |
|---------|-------|-----|
| bg | `grey-900` | `#1e1e1e` |
| bg-hover | `grey-800` | `#2c2c2c` |
| border | `grey-700` | `#383838` |

## Key Contrast Steps (hex deltas)

```
#000000  (black-1000)     — fullscreen bg
   +30 → #1e1e1e  (grey-900)  — canvas/panel bg, menu bg
   +14 → #2c2c2c  (grey-800)  — toolbar bg, hover states
   +12 → #383838  (grey-700)  — borders, secondary bg
   +12 → #444444  (grey-600)  — tertiary bg, toolbar border
   +49 → #757575  (grey-500)  — (gap — unused in surfaces)
   +62 → #b3b3b3  (grey-400)  — (gap)
   +38 → #d9d9d9  (grey-300)  — light mode disabled
   +13 → #e6e6e6  (grey-200)  — light mode border
   +15 → #f5f5f5  (grey-100)  — light mode secondary
   +10 → #ffffff  (white)     — light mode bg
```

The dark mode UI lives in just 5 steps: 900→800→700→600 + 1000.
Steps are tiny (12-14 hex values apart) — very compressed contrast.

## Text on Dark Surfaces — 3 Levels

| Level | Token | Opacity | Use |
|-------|-------|---------|-----|
| Primary | white-1000 | 100% | Values, active text |
| Secondary | white-500 | 70% | Labels, descriptions |
| Tertiary | white-400 | 40% | Hints, disabled, placeholders |

## Inspect Overlays (spacing visualization)

| Overlay | bg token | border token |
|---------|----------|--------------|
| Padding | `blue-500` (#0d99ff) | `blue-500` |
| Spacing (gap) | `pink-500` (#ff24bd) | `pink-500` |

Also in dev handoff mode:
- `fsDevHandoffAutolayoutPadding`: `blue-400` (#80caff)
- `fsDevHandoffAutolayoutSpacing`: `pink-400` (#ff99e0)

## Typography

| Style | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| body-small | 9px (0.5625rem) | 450 | 14px | +0.003rem |
| body-medium | 11px (0.6875rem) | 450 | 16px | +0.003rem |
| body-large | 13px (0.8125rem) | 450 | 22px | -0.002rem |
| heading-small | 13px | 550 | 22px | -0.002rem |
| heading-medium | 15px | 550 | 25px | -0.005rem |
| heading-large | 24px | 550 | 32px | -0.026rem |

Font: Inter (450 default, 550 strong)

## Spacing Scale

| Token | Value |
|-------|-------|
| spacer-0 | 0 |
| spacer-1 | 4px (0.25rem) |
| spacer-2 | 8px (0.5rem) |
| spacer-2-5 | 12px (0.75rem) |
| spacer-3 | 16px (1rem) |
| spacer-4 | 24px (1.5rem) |
| spacer-5 | 32px (2rem) |
| spacer-6 | 40px (2.5rem) |

## Border Radius

| Token | Value |
|-------|-------|
| radius-none | 0 |
| radius-small | 2px |
| radius-medium | 5px |
| radius-large | 13px |
| radius-full | 9999px |

## Elevation (shadows)

| Level | Use |
|-------|-----|
| 100 | Subtle cards |
| 200 | Dropdowns |
| 300 | Tooltips |
| 400 | Menus, panels |
| 500 | Modals, windows |

## Accent Color

Primary accent: `blue-500` = `#0d99ff`
- hover: `blue-600` = `#007be5`
- pressed: `blue-700` = `#0768cf`
- selected bg: `blue-200` = `#e5f4ff` (light) or `blue-500` with opacity (dark)
