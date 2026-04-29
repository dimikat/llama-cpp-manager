# Validation: Tab Bar with Instance Tabs

**Ticket:** `wt_pC_tC.4_cm`
**Validator:** PM (Dimitri)

---

## Validation Steps

### 1. Tab Bar Renders Correctly
1. Run `npm start`
2. Open `http://localhost:7112` in a browser
3. **Verify:** A horizontal tab bar appears at the top of the main content area with one default tab showing `[gray dot] [llama.cpp] Untitled`
4. **Verify:** No rounded corners on tabs (flush to bar)
5. **Verify:** The `[+ New Instance]` button is visible on the right side of the tab bar

### 2. Runtime Picker Modal Opens and Closes
1. Click `[+ New Instance]`
2. **Verify:** A modal overlay appears with two cards: "llama.cpp" and "vLLM"
3. Click outside the modal (on the dark overlay)
4. **Verify:** Modal closes without creating a tab
5. Click `[+ New Instance]` again, then press Escape
6. **Verify:** Modal closes

### 3. New Instance Tab Creation
1. Click `[+ New Instance]`
2. Click the "llama.cpp" card
3. **Verify:** A new tab appears in the tab bar with `[gray dot] [llama.cpp] Untitled`
4. **Verify:** The new tab is now active (has accent bottom border)
5. **Verify:** The new tab's content panel is visible (placeholder text)
6. **Verify:** The default tab's content panel is hidden

### 4. Tab Switching
1. Click the default tab (first tab)
2. **Verify:** Default tab becomes active, shows its config form content
3. **Verify:** The new instance's content panel is hidden
4. Click back to the new tab
5. **Verify:** Switches correctly

### 5. Tab Close Button
1. Hover over the new (non-default) tab
2. **Verify:** A `×` close button appears
3. Click the `×`
4. **Verify:** Tab is removed and the default tab becomes active
5. **Verify:** The default tab does NOT have a `×` close button

### 6. Status Dot Color (Manual Launch Test)
1. With a valid llama-server path and model configured, click Launch
2. **Verify:** The default tab's status dot changes from gray to amber (loading) then green (running)
3. Click Stop
4. **Verify:** Status dot returns to gray (stopped)

### 7. Hover States
1. Hover over an inactive tab
2. **Verify:** Text color brightens to `--text-primary` (#E8E4DC)
3. **Verify:** Subtle `--surface-hover` background appears
4. **Verify:** No bottom border on inactive tabs

### 8. Active Tab Styling
1. Click any tab to make it active
2. **Verify:** Text color is `--text-primary`
3. **Verify:** 2px bottom border in accent color (#C89038)
4. **Verify:** Background is transparent (not raised)

---

## Files Modified
- `public/index.html` — Replaced config-tab navigation with instance tab bar + runtime picker modal
- `public/styles.css` — Added instance tab bar, runtime picker, status dot, and badge CSS
- `public/script.js` — Added instance tab management, runtime picker logic, socket.io status listeners
