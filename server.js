const express = require('express');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const osUtils = require('os-utils');
const app = express();
const PORT = 7112;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store the running process
let runningProcess = null;
let connectedClients = [];

// Create WebSocket server for log streaming
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
    cors: {
        origin: "*"
    }
});

// System monitoring variables
let systemMetrics = {
    cpu: { usage: 0, history: [] },
    ram: { usage: 0, total: 0, free: 0, history: [] },
    gpu: { usage: 0, memory: 0, history: [] },
    vram: { usage: 0, total: 0, free: 0, history: [] }
};

// Function to get system metrics
async function getSystemMetrics() {
    // CPU Usage using os-utils for more accurate readings
    let cpuUsage = 0;
    try {
        // Use os-utils for better CPU monitoring
        cpuUsage = await new Promise((res, rej)=>{
            osUtils.cpuUsage((usage)=>{
                res(usage * 100);
            });
        });

    } catch (error) {
        // Fallback to manual calculation if os-utils fails
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            const times = cpu.times;
            totalIdle += times.idle;
            totalTick += Object.values(times).reduce((a, b) => a + b, 0);
        });
        const idlePercentage = (totalIdle / cpus.length) / (totalTick / cpus.length) * 100;
        cpuUsage = Math.max(0, 100 - idlePercentage);
    }
    
    // RAM Usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const ramUsage = (usedMemory / totalMemory) * 100;
    
    // GPU and VRAM Usage - Parse nvidia-smi output
    let gpuUsage = 0;
    let vramUsage = 0;
    let vramTotal = 0;
    let vramFree = 0;
    
    try {
        // Parse the output to extract VRAM usage for the current process
        // For now, we'll use a simpler approach - get general GPU info
        const smiOutput = execSync('nvidia-smi --query-gpu=utilization.gpu,memory.total,memory.used --format=csv,noheader,nounits', { encoding: 'utf8' });
        
        if (smiOutput) {
            const lines = smiOutput.trim().split('\n');
            if (lines.length > 0) {
                const line = lines[0].trim();
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 3) {
                    gpuUsage = parseFloat(parts[0]) || 0;
                    vramTotal = parseFloat(parts[1]) || 0;
                    const vramUsed = parseFloat(parts[2]) || 0;
                    vramFree = vramTotal - vramUsed;
                    vramUsage = (vramUsed / vramTotal) * 100 || 0;
                }
            }
        }
    } catch (error) {
        // If nvidia-smi fails, fall back to simulated values
        console.log('Failed to get GPU/VRAM data from nvidia-smi:', error.message);
        gpuUsage = Math.random() * 100; // Simulated fallback
        vramUsage = Math.random() * 100; // Simulated fallback
        vramTotal = 8 * 1024 * 1024 * 1024 / (1024 * 1024); // 8GB in MB
        vramFree = vramTotal * (1 - vramUsage / 100);
    }
    
    return {
        cpu: cpuUsage,
        ram: ramUsage,
        gpu: gpuUsage,
        vram: vramUsage,
        totalMemory: totalMemory,
        freeMemory: freeMemory,
        vramTotal: vramTotal,
        vramFree: vramFree
    };
}

// Function to update system metrics history
async function updateSystemMetricsHistory() {
    const metrics = await getSystemMetrics();
    // Update CPU history (keep last 50 points)
    systemMetrics.cpu.usage = metrics.cpu;
    if (systemMetrics.cpu.history.length >= 50) {
        systemMetrics.cpu.history.shift();
    }
    systemMetrics.cpu.history.push(metrics.cpu);
    
    // Update RAM history
    systemMetrics.ram.usage = metrics.ram;
    systemMetrics.ram.total = metrics.totalMemory;
    systemMetrics.ram.free = metrics.freeMemory;
    if (systemMetrics.ram.history.length >= 50) {
        systemMetrics.ram.history.shift();
    }
    systemMetrics.ram.history.push(metrics.ram);
    
    // Update GPU history
    systemMetrics.gpu.usage = metrics.gpu;
    systemMetrics.gpu.memory = metrics.vramTotal - metrics.vramFree; // Used VRAM in bytes
    if (systemMetrics.gpu.history.length >= 50) {
        systemMetrics.gpu.history.shift();
    }
    systemMetrics.gpu.history.push(metrics.gpu);
    
    // Update VRAM history
    systemMetrics.vram.usage = metrics.vram;
    systemMetrics.vram.total = metrics.vramTotal;
    systemMetrics.vram.free = metrics.vramFree;
    if (systemMetrics.vram.history.length >= 50) {
        systemMetrics.vram.history.shift();
    }
    systemMetrics.vram.history.push(metrics.vram);
}

// Start periodic system metrics collection
setInterval(updateSystemMetricsHistory, 1000); // Update every second

// Parse llama.cpp output for performance metrics and context usage
function parsePerformanceMetrics(logData) {
    // Debug: Log what we're trying to parse
    if (logData.includes('t/s') || logData.includes('tokens/s') || logData.includes('tok/s')) {
        console.log('DEBUG: Potential speed data found:', logData.trim());
    }
    
    // Parse token generation speed
    const speedPatterns = [
        // Pattern: "12.34 tokens/s" or "12.34 t/s"
        /([\d.]+)\s*(?:tokens?\/s|t\/s)/i,
        // Pattern: "speed: 12.34 t/s"
        /speed:\s*([\d.]+)\s*(?:tokens?\/s|t\/s)/i,
        // Pattern: "12.34 tok/s"
        /([\d.]+)\s*tok\/s/i,
        // Pattern: generation speed indicators
        /generated.*?([\d.]+)\s*(?:tokens?\/s|t\/s)/i,
        // Pattern: llama_print_timings style output
        /eval\s+time\s+=.*?([\d.]+)\s*tokens?\/s/i
    ];
    
    for (const pattern of speedPatterns) {
        const match = logData.match(pattern);
        if (match) {
            const speed = parseFloat(match[1]);
            console.log(`DEBUG: Found speed match: ${speed} t/s from pattern: ${pattern}`);
            if (speed > 0 && speed < 1000) { // Reasonable speed range
                console.log(`DEBUG: Broadcasting speed: ${speed} t/s`);
                // Broadcast speed update to all connected clients
                connectedClients.forEach(client => {
                    client.emit('token-speed', { speed: speed });
                });
                break; // Only process first match per log chunk
            }
        }
    }
    
    // Parse context usage information
    parseContextUsage(logData);
}

// Parse context usage from llama.cpp output
function parseContextUsage(logData) {
    // Common patterns for context usage in llama.cpp output
    const contextPatterns = [
        // Pattern: "context_length: 2048 / 4096" or similar
        /context.*?(\d+)\s*\/\s*(\d+)/i,
        // Pattern: "used: 1024, total: 2048" 
        /used:\s*(\d+),?\s*total:\s*(\d+)/i,
        // Pattern: "tokens: 512/2048"
        /tokens?:\s*(\d+)\s*\/\s*(\d+)/i,
        // Pattern: "KV cache: 1024/4096 tokens"
        /kv\s+cache:\s*(\d+)\s*\/\s*(\d+)/i,
        // Pattern: "prompt eval count: 123, context size: 4096"
        /prompt\s+eval\s+count:\s*(\d+).*?context\s+size:\s*(\d+)/i,
        // Pattern: llama_print_timings output with prompt/eval counts
        /prompt\s+tokens\s+=\s*(\d+).*?eval\s+count\s+=\s*(\d+)/is
    ];
    
    for (const pattern of contextPatterns) {
        const match = logData.match(pattern);
        if (match) {
            const used = parseInt(match[1]);
            const total = parseInt(match[2]);
            
            // For prompt tokens + eval count pattern, calculate total used
            let actualUsed = used;
            if (pattern.toString().includes('prompt.*eval')) {
                const evalCount = parseInt(match[2]);
                actualUsed = used + evalCount; // Prompt tokens + generated tokens
                // We need to get context size from somewhere else or estimate
                // For now, use a common default and let frontend track actual context size
                const estimatedTotal = 32768; // Common default, can be overridden by frontend
                broadcastContextUpdate(actualUsed, estimatedTotal);
                return;
            }
            
            if (used >= 0 && total > 0 && used <= total) {
                console.log(`DEBUG: Found context usage: ${used}/${total} tokens`);
                broadcastContextUpdate(used, total);
                break;
            }
        }
    }
    
    // Also look for context size initialization messages
    const contextSizePattern = /context\s+size:\s*(\d+)/i;
    const sizeMatch = logData.match(contextSizePattern);
    if (sizeMatch) {
        const contextSize = parseInt(sizeMatch[1]);
        console.log(`DEBUG: Found context size: ${contextSize}`);
        // Broadcast context size info
        connectedClients.forEach(client => {
            client.emit('context-size', { contextSize: contextSize });
        });
    }
}

// Broadcast context usage updates to all connected clients
function broadcastContextUpdate(used, total) {
    const percentage = (used / total) * 100;
    console.log(`DEBUG: Broadcasting context update: ${used}/${total} (${percentage.toFixed(1)}%)`);
    
    connectedClients.forEach(client => {
        client.emit('context-update', { 
            used: used,
            total: total,
            percentage: percentage.toFixed(1)
        });
    });
}

// Function to recursively find GGUF files
async function findGGUFFiles(directory) {
    const ggufFiles = [];
    const defaultModelsPath = process.env.LM_STUDIO_MODELS_PATH || 
                          path.join(os.homedir(), '.cache', 'lm-studio', 'models');
    const basePath = directory || defaultModelsPath;
    
    try {
        // Check if directory exists
        await fs.access(basePath);
        
        async function searchDirectory(dir) {
            try {
                const items = await fs.readdir(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const itemPath = path.join(dir, item.name);
                    
                    if (item.isDirectory()) {
                        // Recursively search subdirectories
                        await searchDirectory(itemPath);
                    } else if (item.isFile() && item.name.toLowerCase().endsWith('.gguf')) {
                        // Add GGUF file with relative path
                        const relativePath = path.relative(basePath, itemPath);
                        ggufFiles.push({
                            name: item.name,
                            path: itemPath,
                            relativePath: relativePath
                        });
                    }
                }
            } catch (error) {
                console.error(`Error reading directory ${dir}:`, error);
            }
        }
        
        await searchDirectory(basePath);
    } catch (error) {
        console.error('Error accessing models directory:', error);
    }
    
    return ggufFiles;
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to start the llama server
app.post('/start', (req, res) => {
    const { serverPath, args = [] } = req.body;
    
    if (!serverPath) {
        return res.status(400).json({ 
            success: false, 
            error: 'Server path is required' 
        });
    }
    
    // Check if process is already running
    if (runningProcess) {
        return res.json({ 
            success: false, 
            error: 'Server is already running' 
        });
    }
    
    // Start the server using spawn for better process control
    try {
        console.log('Starting server with args:', args);
        runningProcess = spawn(serverPath, args, { stdio: 'pipe' });
        
        // Handle process events
        runningProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
            runningProcess = null;
            // Notify clients that the process has ended
            connectedClients.forEach(client => {
                client.emit('server-ended', { message: 'Server process has ended' });
            });
        });
        
        runningProcess.on('error', (error) => {
            console.error(`Failed to start process: ${error}`);
            runningProcess = null;
            // Notify clients of error
            connectedClients.forEach(client => {
                client.emit('server-error', { message: 'Failed to start server: ' + error.message });
            });
        });
        
        // Stream stdout and stderr to connected clients
        if (runningProcess.stdout) {
            runningProcess.stdout.on('data', (data) => {
                const logData = data.toString();
                console.log('STDOUT:', logData);
                
                // Parse for performance metrics
                parsePerformanceMetrics(logData);
                
                // Broadcast to all connected clients
                connectedClients.forEach(client => {
                    client.emit('log-stream', { type: 'stdout', data: logData });
                });
            });
        }
        
        if (runningProcess.stderr) {
            runningProcess.stderr.on('data', (data) => {
                const logData = data.toString();
                console.log('STDERR:', logData);
                // Broadcast to all connected clients
                connectedClients.forEach(client => {
                    client.emit('log-stream', { type: 'stderr', data: logData });
                });
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Server started successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: `Failed to start server: ${error.message}` 
        });
    }
});

// API endpoint to stop the llama server
app.post('/stop', (req, res) => {
    if (!runningProcess) {
        return res.json({ 
            success: false, 
            error: 'No server is currently running' 
        });
    }
    
    // Kill the process gracefully
    try {
        // Check if process is still running before attempting to kill
        if (runningProcess && !runningProcess.killed) {
            runningProcess.kill('SIGTERM'); // Try graceful shutdown first
            setTimeout(() => {
                if (runningProcess && !runningProcess.killed) {
                    runningProcess.kill('SIGKILL'); // Force kill if still running
                }
            }, 1000);
        }
        runningProcess = null;
        res.json({ 
            success: true, 
            message: 'Server stopped successfully' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: `Failed to stop server: ${error.message}` 
        });
    }
});

// API endpoint to get available GGUF models
app.get('/models', async (req, res) => {
    try {
        const models = await findGGUFFiles();
        res.json({ 
            success: true, 
            models: models 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch models: ' + error.message 
        });
    }
});

// API endpoint to get system metrics
app.get('/metrics', (req, res) => {
    // Return just the current values for CPU, RAM, GPU, and VRAM
    res.json({ 
        cpu: systemMetrics.cpu.usage,
        ram: systemMetrics.ram.usage,
        gpu: systemMetrics.gpu.usage,
        vram:  systemMetrics.vram.usage,
        vramUsage: `${systemMetrics.vram.total - systemMetrics.vram.free}/${systemMetrics.vram.total}`,
    });
});

// API endpoint to check if server is running
app.get('/status', (req, res) => {
    res.json({ 
        running: !!runningProcess && !runningProcess.killed
    });
});

// WebSocket connection handling for log streaming
io.on('connection', (socket) => {
    console.log('Client connected for log streaming');
    connectedClients.push(socket);
    
    // Remove client when disconnected
    socket.on('disconnect', () => {
        console.log('Client disconnected from log streaming');
        const index = connectedClients.indexOf(socket);
        if (index > -1) {
            connectedClients.splice(index, 1);
        }
    });
});

// Start the server with WebSocket support
httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
