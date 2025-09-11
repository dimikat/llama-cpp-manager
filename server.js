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

// Enhanced system monitoring variables
let systemMetrics = {
    cpu: { 
        usage: 0, 
        cores: [],
        temperature: 0,
        history: [] 
    },
    ram: { 
        usage: 0, 
        total: 0, 
        free: 0, 
        history: [] 
    },
    gpus: [], // Array of per-GPU metrics
    vram: { 
        usage: 0, 
        total: 0, 
        free: 0, 
        history: [] 
    } // Keep for backwards compatibility
};

// Enhanced GPU monitoring function
async function getEnhancedGPUMetrics() {
    try {
        // Query comprehensive GPU metrics including temperature, power, and memory details
        const smiOutput = execSync(
            'nvidia-smi --query-gpu=index,name,temperature.gpu,power.draw,power.limit,memory.used,memory.total,utilization.gpu,utilization.memory,clocks.current.graphics,clocks.current.memory --format=csv,noheader,nounits', 
            { encoding: 'utf8' }
        );
        
        if (smiOutput) {
            const lines = smiOutput.trim().split('\n');
            const gpus = [];
            
            for (const line of lines) {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 11) {
                    const gpu = {
                        index: parseInt(parts[0]) || 0,
                        name: parts[1] || 'Unknown GPU',
                        temperature: parseFloat(parts[2]) || 0,
                        powerDraw: parseFloat(parts[3]) || 0,
                        powerLimit: parseFloat(parts[4]) || 0,
                        memoryUsed: parseFloat(parts[5]) || 0,
                        memoryTotal: parseFloat(parts[6]) || 0,
                        utilizationGpu: parseFloat(parts[7]) || 0,
                        utilizationMemory: parseFloat(parts[8]) || 0,
                        clocksGraphics: parseFloat(parts[9]) || 0,
                        clocksMemory: parseFloat(parts[10]) || 0,
                        memoryUsage: ((parseFloat(parts[5]) || 0) / (parseFloat(parts[6]) || 1)) * 100,
                        powerUsage: ((parseFloat(parts[3]) || 0) / (parseFloat(parts[4]) || 1)) * 100,
                        thermalThrottling: (parseFloat(parts[2]) || 0) > 80 // Simple thermal throttling detection
                    };
                    gpus.push(gpu);
                }
            }
            
            return gpus;
        }
    } catch (error) {
        console.log('Failed to get enhanced GPU metrics from nvidia-smi:', error.message);
        // Return fallback single GPU data
        return [{
            index: 0,
            name: 'Simulated GPU',
            temperature: 45 + Math.random() * 20,
            powerDraw: 150 + Math.random() * 100,
            powerLimit: 300,
            memoryUsed: 4000 + Math.random() * 4000,
            memoryTotal: 8192,
            utilizationGpu: Math.random() * 100,
            utilizationMemory: Math.random() * 100,
            clocksGraphics: 1500 + Math.random() * 500,
            clocksMemory: 7000 + Math.random() * 1000,
            memoryUsage: Math.random() * 100,
            powerUsage: (150 + Math.random() * 100) / 300 * 100,
            thermalThrottling: false
        }];
    }
}

// Enhanced CPU monitoring function
function getEnhancedCPUMetrics() {
    const cpus = os.cpus();
    const cores = [];
    
    // Get per-core usage (simplified approach)
    cpus.forEach((cpu, index) => {
        const times = cpu.times;
        const total = Object.values(times).reduce((a, b) => a + b, 0);
        const idle = times.idle;
        const usage = total > 0 ? Math.max(0, 100 - (idle / total * 100)) : 0;
        
        cores.push({
            index: index,
            model: cpu.model,
            speed: cpu.speed,
            usage: usage,
            times: times
        });
    });
    
    return {
        cores: cores,
        totalCores: cpus.length,
        temperature: 45 + Math.random() * 15 // Simulated CPU temperature
    };
}

// Function to get system metrics
async function getSystemMetrics() {
    // Enhanced CPU monitoring
    let cpuUsage = 0;
    let cpuMetrics = null;
    
    try {
        // Use os-utils for overall CPU monitoring
        cpuUsage = await new Promise((res, rej)=>{
            osUtils.cpuUsage((usage)=>{
                res(usage * 100);
            });
        });
        
        // Get detailed CPU core metrics
        cpuMetrics = getEnhancedCPUMetrics();

    } catch (error) {
        // Fallback to manual calculation if os-utils fails
        cpuMetrics = getEnhancedCPUMetrics();
        cpuUsage = cpuMetrics.cores.reduce((sum, core) => sum + core.usage, 0) / cpuMetrics.cores.length;
    }
    
    // RAM Usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const ramUsage = (usedMemory / totalMemory) * 100;
    
    // Enhanced GPU monitoring - Get detailed per-GPU metrics
    const gpuMetrics = await getEnhancedGPUMetrics();
    let totalVramUsed = 0;
    let totalVramTotal = 0;
    let averageGpuUsage = 0;
    
    // Calculate totals for backwards compatibility
    if (gpuMetrics.length > 0) {
        totalVramUsed = gpuMetrics.reduce((sum, gpu) => sum + gpu.memoryUsed, 0);
        totalVramTotal = gpuMetrics.reduce((sum, gpu) => sum + gpu.memoryTotal, 0);
        averageGpuUsage = gpuMetrics.reduce((sum, gpu) => sum + gpu.utilizationGpu, 0) / gpuMetrics.length;
    }
    
    return {
        cpu: cpuUsage,
        cpuCores: cpuMetrics ? cpuMetrics.cores : [],
        cpuTemperature: cpuMetrics ? cpuMetrics.temperature : 0,
        ram: ramUsage,
        gpu: averageGpuUsage, // For backwards compatibility
        gpus: gpuMetrics, // Enhanced per-GPU metrics
        vram: totalVramTotal > 0 ? (totalVramUsed / totalVramTotal) * 100 : 0, // For backwards compatibility
        totalMemory: totalMemory,
        freeMemory: freeMemory,
        vramTotal: totalVramTotal,
        vramFree: totalVramTotal - totalVramUsed
    };
}

// Function to update system metrics history
async function updateSystemMetricsHistory() {
    const metrics = await getSystemMetrics();
    // Update enhanced CPU metrics
    systemMetrics.cpu.usage = metrics.cpu;
    systemMetrics.cpu.cores = metrics.cpuCores;
    systemMetrics.cpu.temperature = metrics.cpuTemperature;
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
    
    // Update enhanced GPU metrics
    systemMetrics.gpus = metrics.gpus || [];
    
    // Maintain per-GPU history
    systemMetrics.gpus.forEach((gpu, index) => {
        if (!gpu.history) gpu.history = [];
        if (gpu.history.length >= 50) {
            gpu.history.shift();
        }
        gpu.history.push({
            utilizationGpu: gpu.utilizationGpu,
            temperature: gpu.temperature,
            powerDraw: gpu.powerDraw,
            memoryUsage: gpu.memoryUsage
        });
    });
    
    // Update VRAM history (backwards compatibility)
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
// Group multi-part models together and return primary parts only
function groupMultiPartModels(ggufFiles) {
    console.log(`Processing ${ggufFiles.length} GGUF files for multi-part grouping...`);
    const groupedModels = new Map();
    const standaloneModels = [];
    
    // Pattern to detect multi-part models: ends with -00001-of-00002, -00002-of-00002, etc.
    const multiPartPattern = /^(.*?)-(\d{1,5})-of-(\d{1,5})$/i;
    
    for (const model of ggufFiles) {
        const match = model.name.match(multiPartPattern);
        
        if (match) {
            console.log(`Found multi-part model: ${model.name}`);
            const [, baseName, partNum, totalParts] = match;
            const partNumber = parseInt(partNum);
            const totalPartCount = parseInt(totalParts);
            
            // Create a group key based on the base name and total parts
            const groupKey = `${baseName}-${totalParts}parts`;
            
            if (!groupedModels.has(groupKey)) {
                groupedModels.set(groupKey, {
                    baseName,
                    totalParts: totalPartCount,
                    parts: new Map(),
                    combinedSize: 0
                });
            }
            
            const group = groupedModels.get(groupKey);
            group.parts.set(partNumber, model);
            group.combinedSize += model.fileSizeMB || 0;
        } else {
            // Single-part model, add directly
            standaloneModels.push(model);
        }
    }
    
    // Process grouped models
    const processedModels = [];
    
    for (const [groupKey, group] of groupedModels) {
        // Check if we have all parts
        const expectedParts = Array.from({length: group.totalParts}, (_, i) => i + 1);
        const availableParts = Array.from(group.parts.keys()).sort((a, b) => a - b);
        const hasAllParts = expectedParts.every(part => group.parts.has(part));
        
        if (hasAllParts && group.parts.has(1)) {
            // Use the first part as the primary model but modify its display info
            const primaryPart = group.parts.get(1);
            const multiPartModel = {
                ...primaryPart,
                name: `${group.baseName}.gguf`, // Clean name without part numbers
                displayName: `${group.baseName} (${group.totalParts} parts)`, // Show it's multi-part
                fileSizeMB: group.combinedSize, // Combined size
                isMultiPart: true,
                totalParts: group.totalParts,
                availableParts: availableParts.length,
                allPartsPresent: true
            };
            
            processedModels.push(multiPartModel);
            console.log(`Grouped multi-part model: ${group.baseName} (${group.totalParts} parts, ${group.combinedSize}MB total)`);
        } else {
            // Missing parts - add individual parts with warnings
            console.warn(`Incomplete multi-part model: ${group.baseName} - missing parts`);
            for (const [partNum, model] of group.parts) {
                processedModels.push({
                    ...model,
                    displayName: `${model.name} (⚠️ INCOMPLETE - ${availableParts.length}/${group.totalParts} parts)`,
                    isMultiPart: true,
                    totalParts: group.totalParts,
                    availableParts: availableParts.length,
                    allPartsPresent: false
                });
            }
        }
    }
    
    // Add standalone models
    processedModels.push(...standaloneModels.map(model => ({
        ...model,
        isMultiPart: false,
        allPartsPresent: true
    })));
    
    return processedModels;
}

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
    
    // Group multi-part models and return processed list
    return groupMultiPartModels(ggufFiles);
}

// Configuration management
const CONFIGS_FILE = path.join(__dirname, 'data', 'user_configs.json');

// Load configurations from file
async function loadConfigurationsFromFile() {
    try {
        await fs.access(CONFIGS_FILE);
        const data = await fs.readFile(CONFIGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is corrupted, return default structure
        const defaultData = {
            configurations: {},
            metadata: {
                version: "1.0",
                total_configs: 0,
                created: new Date().toISOString(),
                last_backup: null
            }
        };
        await saveConfigurationsToFile(defaultData);
        return defaultData;
    }
}

// Save configurations to file with atomic write
async function saveConfigurationsToFile(data) {
    try {
        // Create backup first
        try {
            await fs.access(CONFIGS_FILE);
            const backupFile = CONFIGS_FILE + '.backup';
            await fs.copyFile(CONFIGS_FILE, backupFile);
            data.metadata.last_backup = new Date().toISOString();
        } catch (error) {
            // Ignore if original file doesn't exist
        }
        
        // Write to temporary file first, then rename (atomic operation)
        const tempFile = CONFIGS_FILE + '.tmp';
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempFile, CONFIGS_FILE);
        
        return true;
    } catch (error) {
        console.error('Error saving configurations:', error);
        return false;
    }
}

// Validate configuration parameters
function validateConfiguration(config) {
    const errors = [];
    
    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
        errors.push('Configuration name is required');
    }
    
    if (config.parameters) {
        // Validate numeric parameters
        const numericFields = ['ngl', 'threads', 'contextSize', 'batchSize', 'ubatchSize', 'nCpuMoe', 'keepModels'];
        numericFields.forEach(field => {
            if (config.parameters[field] !== undefined && isNaN(Number(config.parameters[field]))) {
                errors.push(`${field} must be a number`);
            }
        });
        
        // Validate float parameters
        const floatFields = ['temp', 'topP', 'repeatPenalty', 'draftPMin'];
        floatFields.forEach(field => {
            if (config.parameters[field] !== undefined && isNaN(parseFloat(config.parameters[field]))) {
                errors.push(`${field} must be a valid number`);
            }
        });
        
        // Validate ranges
        if (config.parameters.temp !== undefined && (config.parameters.temp < 0 || config.parameters.temp > 2)) {
            errors.push('Temperature must be between 0 and 2');
        }
        
        if (config.parameters.topP !== undefined && (config.parameters.topP < 0 || config.parameters.topP > 1)) {
            errors.push('Top P must be between 0 and 1');
        }
    }
    
    return errors;
}

// Generate unique ID for configurations
function generateConfigId() {
    return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// API endpoint to get all configurations
app.get('/api/configs', async (req, res) => {
    try {
        const data = await loadConfigurationsFromFile();
        res.json({
            configurations: Object.values(data.configurations),
            metadata: data.metadata
        });
    } catch (error) {
        console.error('Error loading configurations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load configurations'
        });
    }
});

// API endpoint to create a new configuration
app.post('/api/configs', async (req, res) => {
    try {
        const { name, description, parameters } = req.body;
        
        // Validate input
        const errors = validateConfiguration({ name, parameters });
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors
            });
        }
        
        // Load existing configurations
        const data = await loadConfigurationsFromFile();
        
        // Check if name already exists
        const existingConfig = Object.values(data.configurations).find(config => config.name === name);
        if (existingConfig) {
            return res.status(400).json({
                success: false,
                error: 'Configuration name already exists'
            });
        }
        
        // Create new configuration
        const configId = generateConfigId();
        const newConfig = {
            id: configId,
            name: name.trim(),
            description: description || '',
            parameters: parameters || {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        // Add to data
        data.configurations[configId] = newConfig;
        data.metadata.total_configs = Object.keys(data.configurations).length;
        
        // Save to file
        const saved = await saveConfigurationsToFile(data);
        if (!saved) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save configuration'
            });
        }
        
        res.json({
            success: true,
            configuration: newConfig
        });
        
    } catch (error) {
        console.error('Error creating configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint to update an existing configuration
app.put('/api/configs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, parameters } = req.body;
        
        // Load existing configurations
        const data = await loadConfigurationsFromFile();
        
        // Check if configuration exists
        if (!data.configurations[id]) {
            return res.status(404).json({
                success: false,
                error: 'Configuration not found'
            });
        }
        
        // Validate input if provided
        const updateData = { name: name || data.configurations[id].name, parameters: parameters || data.configurations[id].parameters };
        const errors = validateConfiguration(updateData);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors
            });
        }
        
        // Check if name already exists (and it's not the current config)
        if (name && name !== data.configurations[id].name) {
            const existingConfig = Object.values(data.configurations).find(config => config.name === name && config.id !== id);
            if (existingConfig) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration name already exists'
                });
            }
        }
        
        // Update configuration
        if (name !== undefined) data.configurations[id].name = name.trim();
        if (description !== undefined) data.configurations[id].description = description;
        if (parameters !== undefined) data.configurations[id].parameters = parameters;
        data.configurations[id].modified = new Date().toISOString();
        
        // Save to file
        const saved = await saveConfigurationsToFile(data);
        if (!saved) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save configuration'
            });
        }
        
        res.json({
            success: true,
            configuration: data.configurations[id]
        });
        
    } catch (error) {
        console.error('Error updating configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint to delete a configuration
app.delete('/api/configs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Load existing configurations
        const data = await loadConfigurationsFromFile();
        
        // Check if configuration exists
        if (!data.configurations[id]) {
            return res.status(404).json({
                success: false,
                error: 'Configuration not found'
            });
        }
        
        // Delete configuration
        delete data.configurations[id];
        data.metadata.total_configs = Object.keys(data.configurations).length;
        
        // Save to file
        const saved = await saveConfigurationsToFile(data);
        if (!saved) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save configurations'
            });
        }
        
        res.json({
            success: true,
            message: 'Configuration deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// API endpoint to migrate configurations from localStorage
app.post('/api/configs/migrate', async (req, res) => {
    try {
        const { configurations: localConfigs } = req.body;
        
        if (!localConfigs || typeof localConfigs !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid configurations data'
            });
        }
        
        // Load existing configurations
        const data = await loadConfigurationsFromFile();
        let migratedCount = 0;
        const errors = [];
        
        // Migrate each configuration
        for (const [localId, config] of Object.entries(localConfigs)) {
            try {
                // Validate configuration
                const validationErrors = validateConfiguration(config);
                if (validationErrors.length > 0) {
                    errors.push(`Configuration '${config.name || localId}': ${validationErrors.join(', ')}`);
                    continue;
                }
                
                // Check if name already exists
                const existingConfig = Object.values(data.configurations).find(existing => existing.name === config.name);
                if (existingConfig) {
                    errors.push(`Configuration '${config.name}' already exists, skipped`);
                    continue;
                }
                
                // Create new configuration with server ID
                const configId = generateConfigId();
                const migratedConfig = {
                    id: configId,
                    name: config.name || `Migrated Config ${migratedCount + 1}`,
                    description: config.description || 'Migrated from localStorage',
                    parameters: config.parameters || config, // Handle both old and new format
                    created: new Date().toISOString(),
                    modified: new Date().toISOString()
                };
                
                data.configurations[configId] = migratedConfig;
                migratedCount++;
                
            } catch (error) {
                errors.push(`Configuration '${config.name || localId}': ${error.message}`);
            }
        }
        
        // Update metadata
        data.metadata.total_configs = Object.keys(data.configurations).length;
        
        // Save to file
        const saved = await saveConfigurationsToFile(data);
        if (!saved) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save migrated configurations'
            });
        }
        
        res.json({
            success: true,
            migrated_count: migratedCount,
            total_configs: data.metadata.total_configs,
            errors: errors
        });
        
    } catch (error) {
        console.error('Error migrating configurations:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

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
    
    // Process args to handle multi-part models
    const processedArgs = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-m' && i + 1 < args.length) {
            let modelPath = args[i + 1];
            
            // Check if this is a multi-part model path
            const multiPartPattern = /^(.*)-\d{1,5}-of-\d{1,5}\.gguf$/i;
            const match = modelPath.match(multiPartPattern);
            
            if (match) {
                // Extract base path without the part number
                const basePath = match[1] + '.gguf';
                console.log(`Multi-part model detected: ${modelPath} -> ${basePath}`);
                processedArgs.push(args[i], basePath);
                i++; // Skip the next argument since we processed it
            } else {
                processedArgs.push(args[i], modelPath);
                i++; // Skip the next argument since we processed it
            }
        } else {
            processedArgs.push(args[i]);
        }
    }
    
    // Start the server using spawn for better process control
    try {
        console.log('Starting server with processed args:', processedArgs);
        runningProcess = spawn(serverPath, processedArgs, { stdio: 'pipe' });
        
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
    // Return enhanced metrics with backwards compatibility
    res.json({ 
        // Basic metrics (backwards compatibility)
        cpu: systemMetrics.cpu.usage,
        ram: systemMetrics.ram.usage,
        gpu: systemMetrics.gpus.length > 0 ? systemMetrics.gpus.reduce((sum, gpu) => sum + gpu.utilizationGpu, 0) / systemMetrics.gpus.length : 0,
        vram: systemMetrics.vram.usage,
        vramUsage: `${systemMetrics.vram.total - systemMetrics.vram.free}/${systemMetrics.vram.total}`,
        
        // Enhanced metrics
        cpuCores: systemMetrics.cpu.cores || [],
        cpuTemperature: systemMetrics.cpu.temperature || 0,
        gpus: systemMetrics.gpus || [],
        
        // Historical data for charts
        history: {
            cpu: systemMetrics.cpu.history || [],
            ram: systemMetrics.ram.history || [],
            vram: systemMetrics.vram.history || []
        }
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
