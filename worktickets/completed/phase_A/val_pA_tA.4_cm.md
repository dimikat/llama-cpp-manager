# Validation: wt_pA_tA.4_cm

**Ticket:** Socket.io Event Bridge — Instance-Scoped Events
**Date:** 2026-04-27

---

## Validation Steps

### 1. Start the application
```
npm start
```
**Expected:** Server starts on `http://localhost:7112` with no errors

### 2. Verify /status endpoint works
```
Open http://localhost:7112/status in browser
```
**Expected:** Returns `{"running":false}`

### 3. Use existing UI to load a model
- Open `http://localhost:7112` in browser
- Select a GGUF model and click Start
- **Expected:** Logs stream in the UI log panel as before (`log-stream` events work)

### 4. Check new instance events in browser console
- Open browser DevTools (F12) → Console tab
- Run: `socket = io(); socket.on('instance:log', d => console.log('instance:log', d)); socket.on('instance:status', d => console.log('instance:status', d));`
- Join the default instance room: `socket.emit('instance:join', 'default-llamacpp');`
- **Expected:** `instance:log` and `instance:status` events appear with `instanceId` field

### 5. Stop the model
- Click Stop in the UI
- **Expected:** Both old `server-ended` event fires (UI works) and new `instance:status` event fires with status `STOPPED`

### 6. Verify backward compatibility
- **Expected:** The entire existing UI works identically to before — log streaming, metrics, start/stop all function without any changes to the frontend
