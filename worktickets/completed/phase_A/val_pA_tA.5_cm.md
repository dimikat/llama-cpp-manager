# Validation: wt_pA_tA.5_cm

**Ticket:** Wire Existing HTTP API Endpoints Through Instance Manager
**Date:** 2026-04-27

---

## Validation Steps

### 1. Start the application
```
npm start
```
**Expected:** Server starts on `http://localhost:7112` with no errors

### 2. Status endpoint (no model running)
```
Open http://localhost:7112/status
```
**Expected:** Returns `{"running":false}`

### 3. Metrics endpoint
```
Open http://localhost:7112/metrics
```
**Expected:** Returns JSON with `cpu`, `ram`, `gpu`, `vram`, `history` fields

### 4. Full lifecycle via existing UI
- Open `http://localhost:7112` in browser
- Select a GGUF model and click Start
- **Expected:** Model loads, logs stream, metrics appear
- Verify `http://localhost:7112/status` now returns `{"running":true}`
- Click Stop
- **Expected:** Process terminates cleanly, status returns to `{"running":false}`

### 5. Error handling
- Start with an invalid model path
- **Expected:** Error is returned, instance transitions cleanly

### 6. Updater block
- While a model is running, send `POST /api/updater/apply` with `{}`
- **Expected:** Returns 400 "Cannot apply update while llama-server is running"

### 7. Verify no stale globals
```
node -e "const fs = require('fs'); const code = fs.readFileSync('server.js', 'utf8'); ['runningProcess','connectedClients','parsePerformanceMetrics','broadcastContextUpdate'].forEach(term => { if (code.includes(term)) console.log('FAIL: found', term); }); console.log('DONE');"
```
**Expected:** Only prints `DONE` — no stale references found

### 8. PM confirms the entire existing workflow works identically to before
