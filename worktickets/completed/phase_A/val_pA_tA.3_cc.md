# Validation: wt_pA_tA.3_cc

**Ticket:** Instance Manager Module
**Date:** 2026-04-27

---

## Validation Steps

### 1. Create an instance
```
node -e "const im = require('./instance-manager'); im.createInstance('test-123', 'llamacpp'); const inst = im.getInstance('test-123'); console.log('status:', inst.status, inst.status === 'IDLE' ? 'PASS' : 'FAIL');"
```
**Expected:** `status: IDLE PASS`

### 2. List instances
```
node -e "const im = require('./instance-manager'); im.createInstance('a', 'llamacpp'); im.createInstance('b', 'llamacpp'); const list = im.listInstances(); console.log('count:', list.length, list.length === 2 ? 'PASS' : 'FAIL');"
```
**Expected:** `count: 2 PASS`

### 3. State machine enforcement — invalid transitions throw
```
node -e "const im = require('./instance-manager'); im.createInstance('test-123', 'llamacpp'); try { im.stopInstance('test-123'); console.log('FAIL'); } catch(e) { console.log(e.message.includes('Invalid state transition') ? 'PASS' : 'FAIL'); }"
```
**Expected:** `PASS`

### 4. Error path — start with invalid config transitions to ERROR
```
node -e "const im = require('./instance-manager'); im.createInstance('test-123', 'llamacpp'); im.on('error', () => {}); (async () => { try { await im.startInstance('test-123', { port: 9999 }); } catch(e) {} const inst = im.getInstance('test-123'); console.log(inst.status === 'ERROR' && inst.errorMessage ? 'PASS' : 'FAIL'); })();"
```
**Expected:** `PASS`

### 5. Dismiss error — transitions ERROR → IDLE
```
node -e "const im = require('./instance-manager'); im.createInstance('test-123', 'llamacpp'); im.on('error', () => {}); (async () => { try { await im.startInstance('test-123', { port: 9999 }); } catch(e) {} im.dismissError('test-123'); const inst = im.getInstance('test-123'); console.log(inst.status === 'IDLE' && inst.errorMessage === null ? 'PASS' : 'FAIL'); })();"
```
**Expected:** `PASS`

### 6. Server still starts without regression
```
npm start
```
**Expected:** Server starts on `http://localhost:7112` with no errors

### 7. PM review — confirm API matches ADR-001
Review the exported methods: createInstance, startInstance, stopInstance, dismissError, getInstance, listInstances, removeInstance. Confirm event signatures match: status-changed, log, error, ready.
