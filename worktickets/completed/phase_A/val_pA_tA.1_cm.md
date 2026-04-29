# Validation: wt_pA_tA.1_cm

**Ticket:** Define Runtime Adapter Interface & Instance Data Structures
**Date:** 2026-04-27

---

## Validation Steps

### 1. Verify files exist
```
dir runtimes\adapter-interface.js
dir runtimes\instance-types.js
dir runtimes\index.js
```
**Expected:** All three files exist in the `runtimes/` directory.

### 2. Verify RuntimeAdapter exports as a class
```
node -e "const { RuntimeAdapter } = require('./runtimes'); console.log(typeof RuntimeAdapter)"
```
**Expected:** Prints `function`

### 3. Verify InstanceStatus has all 6 states
```
node -e "const { InstanceStatus } = require('./runtimes'); console.log(Object.keys(InstanceStatus).join(','))"
```
**Expected:** Prints `IDLE,LOADING,RUNNING,STOPPING,ERROR,STOPPED`

### 4. Verify all 6 methods throw "Not implemented"
```
node -e "const { RuntimeAdapter } = require('./runtimes'); const a = new RuntimeAdapter(); const methods = ['spawn','stop','logs','waitForReady','buildArgs','cleanup']; (async () => { for (const m of methods) { try { await a[m]('test', {}); console.log(m + ': FAIL'); } catch(e) { console.log(m + ': ' + (e.message === 'Not implemented' ? 'PASS' : 'FAIL')); } } })();"
```
**Expected:** All 6 methods print `PASS`

### 5. Verify server.js was NOT modified
```
git diff server.js
```
**Expected:** No output (no changes)

### 6. Review the interface contract
Open `runtimes/adapter-interface.js` and `runtimes/instance-types.js`. Verify:
- 6 methods match ADR-001: spawn, stop, logs, waitForReady, buildArgs, cleanup
- InstanceStatus enum has 6 states with correct transitions documented
- InstanceMapEntry JSDoc matches ADR-001 schema
- InstanceConfig documents both llama.cpp and vLLM extension fields
