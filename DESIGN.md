---
name: llama-cpp-manager
description: Multi-runtime LLM inference manager with real-time system monitoring
colors:
  accent: "#C89038"
  accent-hover: "#D4A04C"
  surface-base: "#1A1917"
  surface-raised: "#222120"
  surface-overlay: "#2A2928"
  surface-hover: "#343332"
  border: "#3A3937"
  border-strong: "#4A4946"
  text-primary: "#E8E4DC"
  text-secondary: "#A09A8E"
  text-muted: "#706B62"
  status-ok: "#5FA868"
  status-warn: "#D4943A"
  status-error: "#CC4F4F"
typography:
  headline:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono:
    fontFamily: "'IBM Plex Mono', 'Cascadia Code', 'Consolas', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#1A1917"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  input-field:
    backgroundColor: "{colors.surface-base}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "0"
    padding: "10px 16px"
---

# Design System: llama-cpp-manager

## 1. Overview

**Creative North Star: "The Instrument Panel"**

A precision tool that recedes when you are working and surfaces when you need it. Every gauge, indicator, and control has a clear purpose. The interface rewards a glance: system health, instance status, and resource metrics are legible from across a room on a second monitor, without reading a single word.

This system rejects decoration as a value. The amber accent exists to signal interactivity and state, not to decorate. Surfaces are flat and tonally layered. Motion is reserved for state transitions: a tab switch, a process starting, a GPU crossing a temperature threshold. Nothing bounces, pulses, or shimmers unless it carries information.

The visual language is warm-neutral dark. Surfaces carry a subtle warm tint (chroma 0.005 in the amber direction) that prevents the cold, sterile feel of pure-gray dark themes while staying professional. The single accent color (a restrained amber-gold) appears on less than 10% of any screen, making it meaningful when it appears.

**Key Characteristics:**
- Dark theme as default. This is a background tool used while coding on a second monitor in a dim room.
- Flat surfaces with tonal layering for depth. No decorative shadows.
- One accent color (amber-gold) used sparingly for interactive elements and status indicators.
- Information-dense but hierarchically clear. Group related controls, collapse advanced options.
- Status indicators that communicate through position, size, and color without requiring reading.

## 2. Colors

The palette is a warm-neutral dark foundation with a single amber-gold accent. The accent is rare by design: when it appears, it signals something you can interact with or something that needs your attention.

### Primary
- **Refined Amber** (#C89038 / oklch(65% 0.12 80)): The sole accent. Used for primary buttons, active tab indicators, selected items, focus rings, and status highlights. Never used as a background fill for large areas. Its rarity makes it a signal, not decoration.
- **Refined Amber Hover** (#D4A04C / oklch(70% 0.13 80)): Brighter variant for hover states only. The shift is subtle but perceptible.

### Neutral
- **Surface Base** (#1A1917 / oklch(13% 0.005 80)): Darkest surface. Main background. What your eye sees most.
- **Surface Raised** (#222120 / oklch(17% 0.005 80)): Sidebar, navigation rail. One step above base.
- **Surface Overlay** (#2A2928 / oklch(21% 0.005 80)): Cards, dropdowns, panels that sit above the raised surface.
- **Surface Hover** (#343332 / oklch(26% 0.005 80)): Hover state for interactive surfaces. The lightest neutral before you hit borders.
- **Border** (#3A3937 / oklch(29% 0.005 80)): Default borders and dividers. Visible but not demanding.
- **Border Strong** (#4A4946 / oklch(35% 0.005 80)): Emphasized borders for active states, focused containers, or section dividers.
- **Text Primary** (#E8E4DC / oklch(90% 0.005 80)): Warm off-white for all readable text. Tinted toward amber to sit comfortably on warm surfaces.
- **Text Secondary** (#A09A8E / oklch(65% 0.005 80)): Supporting text, descriptions, secondary labels. Readable but recedes.
- **Text Muted** (#706B62 / oklch(48% 0.005 80)): Disabled states, timestamps, de-emphasized metadata. Present but ignorable.

### Status
- **Status OK** (#5FA868 / oklch(62% 0.12 145)): Healthy state. GPU temp normal, instance running, system nominal.
- **Status Warn** (#D4943A / oklch(68% 0.13 75)): Elevated state. GPU warming, context usage high, approaching limits.
- **Status Error** (#CC4F4F / oklch(55% 0.15 20)): Critical state. GPU overheating, instance crashed, OOM risk.

### Named Rules

**The 10% Rule.** The amber accent occupies less than 10% of any screen's pixel area. If more than 10% of a screen is amber, something is wrong. Its power comes from restraint.

**The Warm Tint Rule.** Every neutral surface and text color carries chroma 0.005 in the amber hue direction (oklch hue 80). Pure grays (#808080, #333333) are prohibited. The warmth is subtle but it prevents the clinical coldness of untinted dark themes.

## 3. Typography

**UI Font:** Plus Jakarta Sans (with system-ui, -apple-system, sans-serif fallback)
**Mono Font:** IBM Plex Mono (with Cascadia Code, Consolas, monospace fallback)

**Character:** A geometric sans-serif that is slightly warmer and more rounded than Inter without being playful. Paired with IBM Plex Mono for file paths, token counts, and log output. The pairing feels technical but approachable, like reading a well-typeset manual.

### Hierarchy
- **Headline** (weight 600, 18px, line-height 1.25): Page titles, section headers like "System Resources" or "Model Configuration". Used sparingly.
- **Title** (weight 600, 15px, line-height 1.3): Sub-section headers, accordion group titles, tab panel headings.
- **Body** (weight 400, 13px, line-height 1.5): Form labels, descriptions, table cells, general reading text. Maximum line length 65ch.
- **Label** (weight 500, 12px, line-height 1.4, letter-spacing 0.02em): Small UI labels, status indicators, badge text, metric names. Slightly tracked for readability at small sizes.
- **Mono** (weight 400, 12px, line-height 1.5): File paths, model names, CLI flags, token counts, log output, any machine-readable text.

### Named Rules

**The 13px Body Rule.** Body text is 13px, not 14px or 16px. This is an information-dense tool where vertical space matters. The smaller size allows more controls visible without scrolling while remaining readable at typical monitor distance.

**The Mono Context Rule.** IBM Plex Mono is used exclusively for values that are machine-readable or user-unfriendly: file paths, CLI flags, token counts, memory values, port numbers. Any text the user would copy-paste rather than read.

## 4. Elevation

This system is flat by default. Depth is conveyed through tonal layering, not shadows.

The surface hierarchy (Base, Raised, Overlay, Hover) provides four distinct tonal steps. Each step is lightened by approximately oklch 4% from the previous, creating a perceptible but not jarring separation. An element's position in the hierarchy communicates its spatial relationship: base is the floor, raised is the furniture, overlay is the thing sitting on the furniture.

Shadows are used only for one purpose: floating elements that break out of the layout (tooltips, dropdown menus, modals). Even then, the shadow is diffuse and low-spread (0 4px 16px rgba(0,0,0,0.4)), not a sharp lift.

### Named Rules

**The Flat-By-Default Rule.** Cards, panels, tabs, list items, and buttons are flat. Their background color alone communicates elevation. If you are reaching for box-shadow on a non-floating element, use a tonal step instead.

**The Shadow-Is-Floating Rule.** box-shadow is reserved for elements that physically detach from the layout surface: tooltips, dropdowns, popovers, and the runtime picker modal. Everything else uses tonal layering.

## 5. Components

### Buttons
- **Shape:** Gently rounded corners (6px radius)
- **Primary:** Amber background (#C89038), dark text (#1A1917), 8px 16px padding. Reserved for the primary action on any view (Launch, Save, Apply). Weight 500.
- **Primary Hover:** Background shifts to #D4A04C. No translate-y, no scale.
- **Secondary:** Transparent background, primary text color (#E8E4DC), 1px border in border color (#3A3937). For secondary actions (Cancel, Reset, Refresh).
- **Ghost:** Transparent background, secondary text color (#A09A8E), no border. For tertiary actions, toolbar buttons, icon-only buttons.
- **Danger:** Transparent background, status error text (#CC4F4F), 1px border in status error at 30% opacity. For destructive actions (Stop, Delete, Kill).
- **Focus:** 2px offset focus ring in accent color. Visible on keyboard navigation.
- **Disabled:** Opacity 0.4, cursor not-allowed. No color shift.

### Instance Tabs
- **Shape:** No rounded corners. Full-width horizontal tabs flush to the tab bar.
- **Active:** Text primary color (#E8E4DC), 2px bottom border in accent (#C89038). Background transparent.
- **Inactive:** Text secondary color (#A09A8E), no bottom border. Background transparent.
- **Hover:** Text brightens to text primary, subtle surface-hover (#343332) background.
- **Tab content:** Status dot (8px circle) left of tab label. Green for running, amber for starting, gray for stopped. Runtime badge as a small label-text chip after the model name.

### Accordion Groups
- **Shape:** No border on collapsed state. Full-width.
- **Header:** Title typography (15px, weight 600), chevron icon on the right that rotates 90 degrees on expand. Background transparent.
- **Expanded:** 1px top border in border color (#3A3937) separating header from content. Content padding 16px top, 4px sides.
- **Hover on header:** Background shifts to surface-hover (#343332).

### Inputs and Fields
- **Style:** Surface-base background (#1A1917), 1px border in border color (#3A3937), 6px radius.
- **Focus:** Border shifts to accent (#C89038). No glow, no box-shadow. A clean, confident border change.
- **Error:** Border shifts to status error (#CC4F4F). Error text appears below in status error color at label size.
- **Disabled:** Background shifts to surface-raised (#222120), text shifts to text-muted (#706B62), opacity 0.6.

### Status Indicators
- **Status dots:** 8px circles. Solid fill, no border. Color maps to status-ok, status-warn, or status-error.
- **Progress bars:** 6px height, surface-base background, filled portion uses the corresponding status color. No gradient; a single solid color that shifts through the status scale (green to amber to red) based on threshold.
- **Token speed:** Mono font, label size. Value in status-ok color when performing normally.

### Cards and Containers
- **Corner style:** 8px radius for top-level containers, 6px for nested elements.
- **Background:** Surface-overlay (#2A2928).
- **Border:** 1px border in border color (#3A3937) only when the card needs visual separation from adjacent surfaces. Cards flush against the same tonal layer omit borders.
- **Internal padding:** 16px (lg spacing scale).

### Navigation Sidebar
- **Style:** Full-height, fixed-width left rail on surface-raised (#222120). 1px right border in border color.
- **Items:** Ghost button style when inactive, surface-hover background + text-primary when active. No left border indicator.
- **Section dividers:** 1px line in border color with 8px top and bottom margin.

### Tooltips
- **Style:** Surface-overlay background (#2A2928), text-primary text, 6px radius, 8px 12px padding.
- **Shadow:** 0 4px 16px rgba(0,0,0,0.4) (the one exception to the flat rule, because tooltips float).
- **Arrow:** 6px CSS triangle matching background color.
- **Typography:** Body size (13px), max-width 320px.

### Toast Notifications
- **Style:** Surface-overlay background, full-width within the main content area, 6px radius top corners when appearing at top, or bottom corners when at bottom.
- **Variants:** A 3px left border indicates type (status-ok, status-warn, status-error). Default informational has no border.
- **Duration:** Auto-dismiss after 4 seconds for success/info, persist for errors until dismissed.

## 6. Do's and Don'ts

### Do:
- **Do** use the amber accent exclusively for interactive elements, active states, and focus indicators. Its scarcity is its strength.
- **Do** use IBM Plex Mono for any value the user would copy: file paths, CLI flags, port numbers, memory sizes.
- **Do** make status dots 8px minimum so they are visible at a glance from across a desk on a second monitor.
- **Do** use tonal surface steps (Base, Raised, Overlay, Hover) instead of shadows for depth hierarchy.
- **Do** collapse advanced configuration into accordion groups. Density with progressive disclosure.
- **Do** use the full surface hierarchy to separate the sidebar (raised), main content (base), and panels/containers (overlay).
- **Do** keep body text at 13px. The density allows more controls visible without scrolling, and the tool is used at arm's length on a monitor, not on a phone held at reading distance.
- **Do** use 65ch max line length for body text in config descriptions and tooltips.

### Don't:
- **Don't** use pure grays (#000, #fff, #333, #808080, #ccc). Every neutral must carry the warm amber tint. If a color looks clinical or cold, it needs more warmth.
- **Don't** use side-stripe borders (border-left or border-right greater than 1px) as colored accents on cards or list items. This is the "Ollama WebUI" look the system explicitly rejects.
- **Don't** add box-shadow to buttons, cards, tabs, or any element that sits in the layout flow. Shadows are for floating elements only.
- **Don't** animate CSS layout properties. No animating width, height, top, left. Use opacity and transform only for state transitions.
- **Don't** use bounce, elastic, or spring easing curves. All transitions use ease-out-quart (cubic-bezier(0.25, 1, 0.5, 1)) or ease-out-expo.
- **Don't** make the interface look like a generic admin dashboard with identical card grids, hero metrics, or template layouts. Every surface should feel purpose-built for managing inference instances.
- **Don't** use emojis as UI icons in buttons, tabs, or navigation. Use SVG icons with consistent 16px or 20px sizing.
- **Don't** apply the accent color as a background fill for areas larger than a button. If an entire panel or card is amber, the signal is diluted.
- **Don't** add decorative animations: no gradient shimmer, no pulse effects on idle elements, no particle effects. If a user glances at the screen and sees movement, it must mean something changed in the system.
