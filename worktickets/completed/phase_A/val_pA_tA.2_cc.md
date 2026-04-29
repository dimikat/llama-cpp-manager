# Validation: wt_pA_tA.2_cc

**Ticket:** Extract LlamaCppAdapter from server.js
**Date:** 2026-04-27

---

## Validation Steps

### 1. Verify the adapter file exists and extends RuntimeAdapter
```
node -e "const { LlamaCppAdapter, RuntimeAdapter } = require('./runtimes'); const a = new LlamaCppAdapter(); console.log('extends RuntimeAdapter:', a instanceof RuntimeAdapter); console.log('methods:', ['spawn','stop','logs','waitForReady','buildArgs','cleanup'].every(m => typeof a[m] === 'function'));"
```
**Expected:** `extends RuntimeAdapter: true` and `methods: true`

### 2. Start the application
```
npm start
```
**Expected:** Server starts on `http://localhost:7112` with no errors

### 3. Load a model via existing UI
- Open `http://localhost:7112` in browser
- Select a GGUF model from the list
- Configure basic params (or use defaults)
- Click Start
- **Expected:** Model loads successfully, logs stream in the UI log panel

### 4. Verify performance metrics
- Send a prompt to the loaded model
- **Expected:** Token/s speed metrics and context usage appear in the UI

### 5. Stop the model
- Click Stop
- **Expected:** Process terminates cleanly, status returns to stopped

### 6. Test error handling
- Start with an invalid model path (type a nonsense path)
- **Expected:** Error is shown in UI, server handles it gracefully

### 7. Verify no behavioral regression
- PM confirms every feature works identically to the pre-refactor version
