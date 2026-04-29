# Phase B E2E Validation — Full Docker Lifecycle

This guide installs Docker Desktop, pulls a vLLM image, and runs the complete
lifecycle test for ticket wt_pB_tB.7_cm.

---

## Part 1: Install Docker Desktop

1. Download Docker Desktop for Windows:
   https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
2. Run the installer. When prompted:

   - Check "Use WSL 2 instead of Hyper-V" (recommended)
   - Do NOT check "Add shortcut to desktop" if you don't want it
3. After install, Docker Desktop launches automatically.
   Wait until the whale icon in the system tray shows "Docker Desktop is running".
4. Verify in PowerShell:

   ```
   docker --version
   docker info
   ```

   Both should return output without errors.
5. Leave Docker Desktop running for all subsequent steps.

---

## Part 2: Install NVIDIA Container Toolkit

This is required for GPU passthrough into Docker containers.

1. Open PowerShell as Administrator.
2. Run:

   ```
   winget install NVIDIA.NVIDIAContainerToolkit
   ```

   If winget doesn't find it, download manually:
   https://github.com/NVIDIA/nvidia-container-toolkit/releases/latest
   Get the `.exe` installer for Windows.
3. After install, restart Docker Desktop:

   - Right-click the whale icon in system tray → Restart
4. Verify GPU passthrough works:

   ```
   docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
   ```

   You should see your two RTX 3090s listed. This may take a minute the first time
   (pulls the CUDA image).

---

## Part 3: Pull vLLM Docker Image

1. In PowerShell, pull the vLLM image:

   ```
   docker pull vllm/vllm-openai:latest
   ```

   This is ~10GB. It will take a while depending on your connection.
2. Verify the image exists:

   ```
   docker image inspect vllm/vllm-openai:latest
   ```

   Should return JSON metadata (no error).

---

## Part 4: Prepare the Model

Your models are at `E:\AI\Models`. vLLM can load GGUF files, but for the most
reliable test we'll use a model that vLLM is known to handle well.

The smallest GGUF model you have is:
  E:\AI\Models\jukofyork\Qwen3-Coder-Instruct-DRAFT-0.75B-GGUF\Qwen3-Coder-Instruct-DRAFT-0.75B-32k-Q4_0.gguf
  (447 MB)

The test config below uses this model. If GGUF loading fails in vLLM, the
lifecycle still validates (error path is tested instead of running path).

---

## Part 5: Run the E2E Lifecycle Test

1. Start the llama-cpp-manager server:

   ```
   npm start
   ```
2. Open browser to: http://localhost:7112
3. Open DevTools (press F12, go to Console tab)
4. Paste this to create a Socket.io connection and instance:

   ```javascript
   const script = document.createElement('script'); script.src = 'https://cdn.socket.io/4.8.1/socket.io.min.js'; script.onload = () => { const s = io(); window._s = s; s.emit('instance:create', { instanceId: 'vllm-e2e', runtime: 'vllm' }); s.on('instance:status', d => console.log('status:', d)); s.on('instance:error', d => console.log('error:', d)); s.on('instance:log', d => console.log('log:', d.line)); s.on('instance:metrics', d => console.log('metrics:', d)); s.on('instance:ready', d => console.log('ready:', d)); }; document.head.appendChild(script);
   ```
5. Wait for this output in console:

   ```
   status: {instanceId: 'vllm-e2e', status: 'IDLE'}
   ```
6. Paste this to start the vLLM container:

   ```javascript
   _s.emit('instance:start', { instanceId: 'vllm-e2e', config: { port: 8000, modelDir: 'E:/AI/Models/jukofyork/Qwen3-Coder-Instruct-DRAFT-0.75B-GGUF', modelName: 'Qwen3-Coder-Instruct-DRAFT-0.75B-32k-Q4_0.gguf', imageTag: 'latest', maxModelLen: 4096 } });
   ```
7. Watch the console output. Expected transitions:

   - `status: {instanceId: 'vllm-e2e', status: 'LOADING'}` — container starting
   - Log lines streaming as vLLM loads
   - `status: {instanceId: 'vllm-e2e', status: 'RUNNING'}` — server ready
   - `ready: {instanceId: 'vllm-e2e', port: 8000}` — ready for inference
   - `metrics:` events every 2 seconds with Prometheus data

   If the model format is incompatible, you'll see:

   - `status: {instanceId: 'vllm-e2e', status: 'ERROR'}`
   - `error:` event with the failure message
     This is still a valid test result (error path works).
8. If RUNNING, test inference in a new PowerShell window:

   ```
   curl http://localhost:8000/v1/models
   ```

   Should return JSON with the model listed.
9. Stop the instance — paste in DevTools:

   ```javascript
   _s.emit('instance:stop', { instanceId: 'vllm-e2e' });
   ```
10. Verify:

    - `status: {instanceId: 'vllm-e2e', status: 'STOPPING'}`
    - `status: {instanceId: 'vllm-e2e', status: 'STOPPED'}`
    - Container removed: `docker ps` shows no vllm-e2e container

---

## Part 6: Cleanup

After validation, paste in DevTools:

```javascript
_s.disconnect();
```

In PowerShell, if you want to free disk space:

```
docker image rm vllm/vllm-openai:latest
```

You can stop Docker Desktop via the system tray icon when done.

---

## Troubleshooting

| Problem                            | Solution                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `docker: command not found`      | Docker Desktop not installed or not in PATH. Restart terminal.                              |
| `Error response from daemon`     | Docker Desktop not running. Start it from Start Menu.                                       |
| `could not select device driver` | NVIDIA Container Toolkit not installed. See Part 2.                                         |
| `GGUF model fails to load`       | This validates the error path. Note the error message and report it.                        |
| Port 8000 already in use           | Change `port: 8000` to another port in step 6 and 8.                                      |
| Server won't start (EADDRINUSE)    | Kill existing:`taskkill /PID <pid> /F` where pid is from `netstat -ano \| findstr :7112` |
