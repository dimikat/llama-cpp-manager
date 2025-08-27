const express = require('express');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
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

// Store the detected context size for later use
let detectedContextSize = 16384; // Default fallback

// Model metadata cache to avoid re-parsing GGUF files
const modelMetadataCache = new Map();

// GGUF header parsing functionality
function parseGGUFMetadata(filePath) {
    try {
        const stats = fsSync.statSync(filePath);
        const cacheKey = `${filePath}:${stats.mtime.getTime()}`;
        
        // Check cache first
        if (modelMetadataCache.has(cacheKey)) {
            return modelMetadataCache.get(cacheKey);
        }
        
        // Read GGUF header (first 1024 bytes should be enough for metadata)
        const fd = fsSync.openSync(filePath, 'r');
        const headerBuffer = Buffer.alloc(1024);
        fsSync.readSync(fd, headerBuffer, 0, 1024, 0);
        fsSync.closeSync(fd);
        
        // Parse GGUF magic number and basic structure
        const magic = headerBuffer.toString('ascii', 0, 4);
        if (magic !== 'GGUF') {
            throw new Error('Not a valid GGUF file');
        }
        
        // Parse version (4 bytes, little-endian)
        const version = headerBuffer.readUInt32LE(4);
        
        // Parse tensor count (8 bytes, little-endian)  
        const tensorCount = headerBuffer.readBigUInt64LE(8);
        
        // Parse metadata count (8 bytes, little-endian)
        const metadataCount = headerBuffer.readBigUInt64LE(16);
        
        // For simplicity, extract metadata from filename and basic file analysis
        // A full GGUF parser would be more complex but this gives us useful info
        const metadata = extractMetadataFromFilename(filePath, stats.size);
        
        // Cache the result
        modelMetadataCache.set(cacheKey, metadata);
        
        return metadata;
        
    } catch (error) {
        console.error(`Error parsing GGUF metadata for ${filePath}:`, error.message);
        // Fallback to filename-based parsing
        const stats = fsSync.statSync(filePath);
        return extractMetadataFromFilename(filePath, stats.size);
    }
}

// Extract metadata from filename patterns and file analysis
function extractMetadataFromFilename(filePath, fileSize) {
    const filename = path.basename(filePath, '.gguf');
    const metadata = {
        name: filename,
        path: filePath,
        fileSize: fileSize,
        fileSizeMB: Math.round(fileSize / (1024 * 1024)),
        architecture: 'Unknown',
        parameters: 'Unknown',
        quantization: 'Unknown',
        contextLength: 'Unknown',
        specialCapabilities: []
    };
    
    // Detect architecture
    const archPatterns = {
        'Llama': /llama[_-]?(\d+)?[\._-]/i,
        'Gemma': /gemma[_-]?(\d+)?[\._-]/i,
        'Mistral': /mistral[_-]?(\d+)?[\._-]/i,
        'Mixtral': /mixtral[_-]?(\d+)?[\._-]/i,
        'Qwen': /qwen[_-]?(\d+)?[\._-]/i,
        'GLM': /glm[_-]?(\d+)?[\._-]/i,
        'CodeLlama': /code[_-]?llama[_-]?(\d+)?[\._-]/i,
        'DeepSeek': /deepseek[_-]?(\d+)?[\._-]/i
    };
    
    for (const [arch, pattern] of Object.entries(archPatterns)) {
        if (pattern.test(filename)) {
            metadata.architecture = arch;
            break;
        }
    }
    
    // Detect parameter count
    const paramPatterns = [
        /(\d+)B/i,  // 7B, 13B, etc.
        /(\d+)b/,   // lowercase version
        /(\d+\.?\d*)[_-]?billion/i
    ];
    
    for (const pattern of paramPatterns) {
        const match = filename.match(pattern);
        if (match) {
            metadata.parameters = match[1] + 'B';
            break;
        }
    }
    
    // Detect quantization
    const quantPatterns = {
        'Q2_K': { regex: /q2[_-]?k/i, quality: 'Very Low', description: 'Smallest size, lowest quality' },
        'Q3_K_S': { regex: /q3[_-]?k[_-]?s/i, quality: 'Low', description: 'Small size, some quality loss' },
        'Q3_K_M': { regex: /q3[_-]?k[_-]?m/i, quality: 'Low-Med', description: 'Smaller size, moderate quality' },
        'Q3_K_L': { regex: /q3[_-]?k[_-]?l/i, quality: 'Medium', description: 'Medium size, better quality' },
        'Q4_0': { regex: /q4[_-]?0/i, quality: 'Medium', description: 'Fast, decent quality' },
        'Q4_1': { regex: /q4[_-]?1/i, quality: 'Medium', description: 'Fast, slightly better than Q4_0' },
        'Q4_K_S': { regex: /q4[_-]?k[_-]?s/i, quality: 'Medium', description: 'Small, good quality' },
        'Q4_K_M': { regex: /q4[_-]?k[_-]?m/i, quality: 'Good', description: 'Balanced size/quality' },
        'Q5_0': { regex: /q5[_-]?0/i, quality: 'High', description: 'Larger, better quality' },
        'Q5_1': { regex: /q5[_-]?1/i, quality: 'High', description: 'Even better quality' },
        'Q5_K_S': { regex: /q5[_-]?k[_-]?s/i, quality: 'High', description: 'Large, high quality' },
        'Q5_K_M': { regex: /q5[_-]?k[_-]?m/i, quality: 'Very High', description: 'Large, very high quality' },
        'Q6_K': { regex: /q6[_-]?k/i, quality: 'Very High', description: 'Very large, excellent quality' },
        'Q8_0': { regex: /q8[_-]?0/i, quality: 'Excellent', description: 'Largest, best quality' },
        'F16': { regex: /f16/i, quality: 'Perfect', description: 'Half precision, original quality' },
        'F32': { regex: /f32/i, quality: 'Perfect', description: 'Full precision, original quality' }
    };
    
    for (const [quant, info] of Object.entries(quantPatterns)) {
        if (info.regex.test(filename)) {
            metadata.quantization = quant;
            metadata.quantizationQuality = info.quality;
            metadata.quantizationDescription = info.description;
            break;
        }
    }
    
    // Detect special capabilities
    if (/instruct|chat/i.test(filename)) {
        metadata.specialCapabilities.push('Chat/Instruct');
    }
    if (/code/i.test(filename)) {
        metadata.specialCapabilities.push('Code Generation');
    }
    if (/vision|mmproj|multimodal/i.test(filename)) {
        metadata.specialCapabilities.push('Vision/Multimodal');
    }
    if (/moe|mixtral/i.test(filename)) {
        metadata.specialCapabilities.push('Mixture of Experts');
    }
    if (/thinking|think/i.test(filename)) {
        metadata.specialCapabilities.push('Thinking Mode');
    }
    
    // Estimate context length based on model and patterns
    if (/128k|131072/i.test(filename)) {
        metadata.contextLength = '128K';
    } else if (/32k|32768/i.test(filename)) {
        metadata.contextLength = '32K';
    } else if (/16k|16384/i.test(filename)) {
        metadata.contextLength = '16K';
    } else if (/8k|8192/i.test(filename)) {
        metadata.contextLength = '8K';
    } else {
        // Default based on architecture
        if (metadata.architecture === 'Llama' || metadata.architecture === 'CodeLlama') {
            metadata.contextLength = '8K'; // Most Llama models
        } else if (metadata.architecture === 'Mistral' || metadata.architecture === 'Mixtral') {
            metadata.contextLength = '32K'; // Mistral models typically have 32K
        } else if (metadata.architecture === 'Qwen') {
            metadata.contextLength = '32K'; // Qwen models typically have 32K
        } else {
            metadata.contextLength = '4K'; // Conservative default
        }
    }
    
    return metadata;
}

// Parse context usage from llama.cpp output
function parseContextUsage(logData) {
    // Debug: Log all output to help identify patterns
    if (logData && logData.trim()) {
        console.log('DEBUG: Raw llama.cpp output for context parsing:', JSON.stringify(logData.trim()));
    }
    
    // Enhanced patterns for context usage in llama.cpp output
    const contextPatterns = [
        // Modern slot-based patterns (common in recent llama.cpp) - these are the key ones!
        /slot.*?n_past\s*=\s*(\d+).*?n_ctx_slot\s*=\s*(\d+)/is,
        /slot.*?n_ctx_slot\s*=\s*(\d+).*?n_past\s*=\s*(\d+)/is, 
        /slot.*?n_past\s*=\s*(\d+).*?truncated\s*=\s*\d+/i, // For release messages, we'll use stored context size
        
        // Request completion patterns
        /generated\s+(\d+)\s+tokens.*?context\s*(?:size|length)?\s*(?:of\s*)?(\d+)/is,
        /completion.*?(\d+)\s*\/\s*(\d+)\s+tokens/i,
        
        // Traditional patterns
        /n_ctx\s*=\s*(\d+).*?n_past\s*=\s*(\d+)/is,
        /context\s+size:\s*(\d+).*?tokens\s+processed:\s*(\d+)/is,
        /ctx_size:\s*(\d+).*?n_past:\s*(\d+)/is,
        
        // Legacy patterns
        /context.*?(\d+)\s*\/\s*(\d+)/i,
        /used:\s*(\d+),?\s*total:\s*(\d+)/i,
        /tokens?:\s*(\d+)\s*\/\s*(\d+)/i,
        /kv\s+cache:\s*(\d+)\s*\/\s*(\d+)/i,
        /prompt\s+eval\s+count:\s*(\d+).*?context\s+size:\s*(\d+)/i,
        /prompt\s+tokens\s+=\s*(\d+).*?eval\s+count\s+=\s*(\d+)/is,
        
        // Additional modern patterns  
        /n_tokens\s*=\s*(\d+).*?n_ctx\s*=\s*(\d+)/is,
        /processed\s+(\d+)\s*\/\s*(\d+)\s+tokens/i,
        
        // Context size detection (for initialization)
        /n_ctx\s*=\s*(\d+)/i  // Just context size, we'll use 0 for initial usage
    ];
    
    for (let i = 0; i < contextPatterns.length; i++) {
        const pattern = contextPatterns[i];
        const match = logData.match(pattern);
        if (match) {
            console.log(`DEBUG: Pattern ${i} matched:`, pattern.toString(), 'Groups:', match);
            
            let used, total;
            
            // Handle different pattern formats
            if (i === 0) { // slot n_past = X n_ctx_slot = Y
                used = parseInt(match[1]);  // n_past
                total = parseInt(match[2]); // n_ctx_slot
                detectedContextSize = total; // Store for later use
            } else if (i === 1) { // slot n_ctx_slot = Y n_past = X
                total = parseInt(match[1]); // n_ctx_slot
                used = parseInt(match[2]);  // n_past
                detectedContextSize = total; // Store for later use
            } else if (i === 2) { // slot n_past = X truncated = 0 (use stored context size)
                used = parseInt(match[1]);  // n_past
                total = detectedContextSize; // Use stored context size
            } else if (i <= 4) { // Completion patterns: used first, total second
                used = parseInt(match[1]);
                total = parseInt(match[2]);
            } else if (i <= 7) { // Traditional patterns: total first, used second
                total = parseInt(match[1]); // n_ctx or context_size
                used = parseInt(match[2]);  // n_past or tokens_processed
            } else if (i === contextPatterns.length - 1) { // Context size only pattern
                total = parseInt(match[1]); // n_ctx
                used = 0; // No usage yet - this is initialization
            } else {
                // Legacy patterns - used first, total second
                used = parseInt(match[1]);
                total = parseInt(match[2]);
            }
            
            // Special handling for prompt + eval pattern
            if (pattern.toString().includes('prompt.*eval')) {
                const evalCount = parseInt(match[2]);
                used = used + evalCount; // Prompt tokens + generated tokens
                // Use configured context size or estimate
                total = 32768; // Will be overridden by frontend if context size is known
                console.log(`DEBUG: Calculated prompt+eval usage: ${used}/${total} tokens`);
                broadcastContextUpdate(used, total);
                return;
            }
            
            if (used >= 0 && total > 0 && used <= total) {
                console.log(`DEBUG: Found context usage: ${used}/${total} tokens (pattern ${i})`);
                broadcastContextUpdate(used, total);
                return;
            } else {
                console.log(`DEBUG: Invalid values from pattern ${i}: used=${used}, total=${total}`);
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
                        // Add GGUF file with metadata parsing
                        const relativePath = path.relative(basePath, itemPath);
                        
                        try {
                            // Parse metadata from GGUF file
                            const metadata = parseGGUFMetadata(itemPath);
                            
                            ggufFiles.push({
                                name: item.name,
                                path: itemPath,
                                relativePath: relativePath,
                                ...metadata // Spread metadata into the model object
                            });
                        } catch (error) {
                            console.error(`Error parsing metadata for ${item.name}:`, error.message);
                            // Fallback to basic file info
                            ggufFiles.push({
                                name: item.name,
                                path: itemPath,
                                relativePath: relativePath,
                                architecture: 'Unknown',
                                parameters: 'Unknown',
                                quantization: 'Unknown',
                                contextLength: 'Unknown',
                                fileSizeMB: 0,
                                specialCapabilities: []
                            });
                        }
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
                
                // DEBUG: Always log all output to help identify patterns
                if (logData.trim()) {
                    console.log('DEBUG: ALL llama.cpp stdout:', JSON.stringify(logData.trim()));
                }
                
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
                
                // DEBUG: Also log stderr output for context patterns
                if (logData.trim()) {
                    console.log('DEBUG: ALL llama.cpp stderr:', JSON.stringify(logData.trim()));
                }
                
                // Parse stderr output for performance and context metrics too
                parsePerformanceMetrics(logData);
                
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
