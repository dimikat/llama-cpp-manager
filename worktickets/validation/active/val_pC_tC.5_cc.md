# Validation: Per-Instance Single-Page Layout

**Ticket:** `wt_pC_tC.5_cc`
**Validator:** PM
**Date:** 2026-04-29

---

## Validation Steps

### 1. Start the server
```powershell
npm start
```
Open `http://localhost:7112` in the browser.

**Expected:** Page loads with the instance tab bar at top and a single-page layout below — no 3-column absolute positioning.

---

### 2. Verify layout structure
Look at the default instance tab body.

**Expected:**
- Left side: outline sidebar (200px wide, darker surface-raised background, 1px right border)
- Right side: main content area filling remaining width (darker surface-base background)
- Top of tab body: instance header bar with model name "Untitled", status dot, "llama.cpp" badge, and Launch/Stop/Open Server buttons
- Below config form area: metrics panel placeholder ("System Resources") and log stream placeholder ("Process & Logs")

---

### 3. Sidebar toggle
Click the sidebar toggle button (square icon with vertical line, top-left of instance header).

**Expected:** Outline sidebar collapses to zero width. Click again to expand. Smooth transition.

---

### 4. Scroll-spy
Scroll down through the config form sections (Model, Performance, Memory, etc.) in the main content area.

**Expected:** The active outline item in the left sidebar highlights (accent left border + surface-hover background) as you scroll past each section. Clicking a sidebar item scrolls to that section.

---

### 5. Instance header
Look at the top of the tab body.

**Expected:** Shows status dot (gray=idle), "llama.cpp" runtime badge, model name "Untitled", Launch button (active), Stop button (disabled), Open Server button (disabled), and "Not running" status message.

---

### 6. Tab switching
Click "+ New Instance", pick "llama.cpp". Verify a second tab appears.

**Expected:** Second instance tab renders with its own independent sidebar + main content layout. Switching between tabs shows different panels. Each panel's sidebar toggle and scroll-spy work independently.

---

### 7. Responsive behavior
Open browser DevTools. Resize viewport width below 1200px.

**Expected:** Outline sidebar disappears. Main content fills full width. Resize back above 1200px — sidebar reappears.

---

### 8. No console errors
Open browser DevTools Console tab.

**Expected:** No errors related to missing DOM elements (`.config-panel`, `.system-panel`, `.main-content`, `.config-list`, etc.). No JS errors on page load or tab switching.

---

## Result

- [ ] PASS
- [ ] FAIL (details below)

**Notes:**
