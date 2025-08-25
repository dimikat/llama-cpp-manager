import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

// DOM Elements
const serverPathInput = document.getElementById('serverPath');
const modelPathSelect = document.getElementById('modelPath');
const nglInput = document.getElementById('ngl');
const threadsInput = document.getElementById('threads');
const tempInput = document.getElementById('temp');
const topKInput = document.getElementById('topK');
const topPInput = document.getElementById('topP');
const repeatPenaltyInput = document.getElementById('repeatPenalty');
const mlockCheckbox = document.getElementById('mlock');
const swaFullCheckbox = document.getElementById('swaFull');
const contextSizeInput = document.getElementById('contextSize');
const nCpuMoeInput = document.getElementById('nCpuMoe');
const cpuMoeCheckbox = document.getElementById('cpuMoe');
const ctkEnableCheckbox = document.getElementById('ctkEnable');
const contextTokenKeySelect = document.getElementById('contextTokenKey');
const contextTokenValueSelect = document.getElementById('contextTokenValue');
const fastAttentionCheckbox = document.getElementById('fastAttention');
const jinjaCheckbox = document.getElementById('jinja');

// New Multi-GPU elements
const tensorSplitInput = document.getElementById('tensorSplit');
const mainGpuSelect = document.getElementById('mainGpu');
const splitModeSelect = document.getElementById('splitMode');

// New Performance elements
const batchSizeInput = document.getElementById('batchSize');
const ubatchSizeInput = document.getElementById('ubatchSize');
const contBatchingCheckbox = document.getElementById('contBatching');
const noMmapCheckbox = document.getElementById('noMmap');
const numaSelect = document.getElementById('numa');

// New Advanced Memory elements
const cacheTypeKSelect = document.getElementById('cacheTypeK');
const cacheTypeVSelect = document.getElementById('cacheTypeV');
const keepModelsInput = document.getElementById('keepModels');
const memoryTestCheckbox = document.getElementById('memoryTest');

// New Server Network elements
const serverHostInput = document.getElementById('serverHost');
const serverPortInput = document.getElementById('serverPort');
const readTimeoutInput = document.getElementById('readTimeout');
const writeTimeoutInput = document.getElementById('writeTimeout');
const apiKeyInput = document.getElementById('apiKey');

// Preset buttons
const presetHighPerfBtn = document.getElementById('presetHighPerf');
const presetBalancedDualBtn = document.getElementById('presetBalancedDual');
const presetLargeModelBtn = document.getElementById('presetLargeModel');
const presetCpuOffloadBtn = document.getElementById('presetCpuOffload');

// Draft Model (Speculative Decoding) elements
const draftModelEnableCheckbox = document.getElementById('draftModelEnable');
const draftModelPathSelect = document.getElementById('draftModelPath');
const draftGpuLayersInput = document.getElementById('draftGpuLayers');
const draftContextSizeInput = document.getElementById('draftContextSize');
const draftMaxTokensInput = document.getElementById('draftMaxTokens');
const draftMinTokensInput = document.getElementById('draftMinTokens');
const draftPMinInput = document.getElementById('draftPMin');

const launchBtn = document.getElementById('launchBtn');
const stopBtn = document.getElementById('stopBtn');
const modelStatusMessage = document.getElementById('modelStatusMessage');
const modelProcessInfo = document.getElementById('modelProcessInfo');
const modelOutput = document.getElementById('modelOutput');

// Configuration management elements
const configList = document.getElementById('configList');
const addConfigBtn = document.getElementById('addConfigBtn');
const configFormContainer = document.getElementById('configFormContainer');
const configFormTitle = document.getElementById('configFormTitle');
const configNameInput = document.getElementById('configName');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');

// Theme toggle elements
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

// Store WebSocket connection
let socket = null;

// Configuration management state
let currentConfigId = null;
let configurations = {};

// Theme management
const THEME_STORAGE_KEY = 'llamaCppManagerTheme';
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

let currentTheme = THEMES.LIGHT;

// Chart variables
let cpuCtx, ramCtx, gpuCtx, vramCtx;
let chartData = {
    cpu: [],
    ram: [],
    gpu: [],
    vram: []
};

// Theme management functions
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    currentTheme = savedTheme || THEMES.LIGHT;
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    const body = document.body;
    
    if (theme === THEMES.DARK) {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
    }
    
    currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
    const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    applyTheme(newTheme);
}

// Tooltip positioning system with absolute containment
function initTooltips() {
    const tooltips = document.querySelectorAll('.tooltip');
    
    tooltips.forEach(tooltip => {
        const helpIcon = tooltip.parentElement;
        
        helpIcon.addEventListener('mouseenter', () => {
            positionTooltipAbsolute(tooltip);
        });
    });
}

function positionTooltipAbsolute(tooltip) {
    // Reset positioning classes and styles
    tooltip.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-constrained');
    tooltip.style.left = '';
    tooltip.style.right = '';
    tooltip.style.transform = '';
    tooltip.style.maxWidth = '';
    
    // Get the main content container
    const mainContent = tooltip.closest('.main-content');
    const helpIcon = tooltip.parentElement;
    
    if (!mainContent || !helpIcon) return;
    
    // Force tooltip to be visible for measurement
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    
    // Get precise measurements
    const mainContentRect = mainContent.getBoundingClientRect();
    const iconRect = helpIcon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    const padding = 15;
    const availableWidth = mainContentRect.width - (padding * 2);
    const iconCenterRelative = iconRect.left - mainContentRect.left + (iconRect.width / 2);
    
    // Calculate tooltip positioning
    let leftPosition;
    let maxWidth = Math.min(450, availableWidth);
    
    // If tooltip is wider than available space, constrain it
    if (tooltipRect.width > availableWidth) {
        tooltip.style.maxWidth = availableWidth + 'px';
        leftPosition = padding;
        tooltip.classList.add('tooltip-constrained');
    } else {
        // Try to center on icon
        const idealLeft = iconCenterRelative - (tooltipRect.width / 2);
        
        if (idealLeft < padding) {
            // Too far left, align to left edge
            leftPosition = padding;
        } else if (idealLeft + tooltipRect.width > mainContentRect.width - padding) {
            // Too far right, align to right edge
            leftPosition = mainContentRect.width - tooltipRect.width - padding;
        } else {
            // Center on icon
            leftPosition = idealLeft;
        }
    }
    
    // Apply positioning
    tooltip.style.left = leftPosition + 'px';
    tooltip.style.transform = 'translateX(0)';
    
    // Position arrow relative to icon
    const arrowPosition = Math.max(20, Math.min(iconCenterRelative - leftPosition, tooltipRect.width - 20));
    tooltip.style.setProperty('--arrow-left', arrowPosition + 'px');
    
    // Reset visibility
    tooltip.style.visibility = '';
    tooltip.style.opacity = '';
}

// Disable/enable buttons based on status
function updateButtonStates(isRunning) {
    launchBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
}

// Update status display
function updateStatus(isRunning) {
    if (isRunning) {
        modelStatusMessage.textContent = 'Running';
        modelStatusMessage.style.color = 'green';
    } else {
        modelStatusMessage.textContent = 'Not running';
        modelStatusMessage.style.color = 'red';
    }
}

// Show output in the pre element
function showOutput(message) {
    const timestamp = new Date().toISOString();
    modelOutput.textContent += `[${timestamp}] ${message}\n`;
    modelOutput.scrollTop = modelOutput.scrollHeight;
}

// Fetch current status
async function fetchStatus() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        updateButtonStates(data.running);
        updateStatus(data.running);
        return data.running;
    } catch (error) {
        console.error('Error fetching status:', error);
        showOutput('Error checking status: ' + error.message);
        return false;
    }
}

// Fetch and populate models dropdown
async function fetchModels() {
    try {
        const response = await fetch('/models');
        const data = await response.json();
        
        if (data.success) {
            // Clear existing options except the placeholder
            modelPathSelect.innerHTML = '<option value="">-- Select a Model --</option>';
            
            // Add models to dropdown
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.path;  // Use full path for the value
                option.textContent = model.relativePath || model.name;  // Show relative path or just name
                modelPathSelect.appendChild(option);
            });
            
            // Also populate draft models
            populateDraftModels(data.models);
        } else {
            console.error('Failed to fetch models:', data.error);
            showOutput('Error fetching models: ' + data.error);
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        showOutput('Error fetching models: ' + error.message);
    }
}

// Populate draft models dropdown with potential draft models
function populateDraftModels(allModels) {
    // Clear existing options except the placeholder
    draftModelPathSelect.innerHTML = '<option value="">-- Select a Draft Model --</option>';
    
    // Filter models that could be draft models (typically smaller models)
    const draftModels = allModels.filter(model => {
        const name = model.name.toLowerCase();
        const relativePath = (model.relativePath || '').toLowerCase();
        
        // Look for indicators of small/draft models
        return name.includes('draft') || 
               name.includes('1b') || 
               name.includes('0.6b') || 
               name.includes('small') ||
               relativePath.includes('draft') ||
               relativePath.includes('1b') ||
               relativePath.includes('0.6b') ||
               relativePath.includes('small');
    });
    
    // Add draft models to dropdown
    draftModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.path;
        option.textContent = model.relativePath || model.name;
        draftModelPathSelect.appendChild(option);
    });
    
    // If no dedicated draft models found, add all smaller models (heuristic)
    if (draftModels.length === 0) {
        const smallerModels = allModels.filter(model => {
            const name = model.name.toLowerCase();
            return name.includes('1b') || name.includes('3b') || name.includes('7b');
        });
        
        smallerModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.path;
            option.textContent = `${model.relativePath || model.name} (potential draft)`;
            draftModelPathSelect.appendChild(option);
        });
    }
}

// Load configurations from localStorage
function loadConfigurations() {
    const savedConfigs = localStorage.getItem('llamaCppConfigs');
    if (savedConfigs) {
        configurations = JSON.parse(savedConfigs);
    } else {
        configurations = {};
    }
    return configurations;
}

// Save configurations to localStorage
function saveConfigurations() {
    localStorage.setItem('llamaCppConfigs', JSON.stringify(configurations));
}

// Get all configuration names
function getConfigNames() {
    return Object.keys(configurations);
}

// Create a new configuration with default name based on model
function createDefaultConfigName() {
    const modelName = modelPathSelect.options[modelPathSelect.selectedIndex]?.text || 'Default';
    // Extract just the model name without path and extension
    const cleanName = modelName.split('/').pop().split('\\').pop().replace(/\.[^/.]+$/, "") || 'Configuration';
    return cleanName;
}

// Save current values to configurations
function saveCurrentValues(configId) {
    if (!configId) return;
    
    const config = {
        serverPath: serverPathInput.value,
        modelPath: modelPathSelect.value,  // Use select value instead of input value
        ngl: parseInt(nglInput.value) || 0,
        threads: parseInt(threadsInput.value) || 1,
        temp: parseFloat(tempInput.value) || 0,
        topK: parseInt(topKInput.value) || 0,
        topP: parseFloat(topPInput.value) || 0,
        repeatPenalty: parseFloat(repeatPenaltyInput.value) || 0,
        mlock: mlockCheckbox.checked,
        swaFull: swaFullCheckbox.checked,
        contextSize: parseInt(contextSizeInput.value) || 1,
        nCpuMoe: parseInt(nCpuMoeInput.value) || 0,
        cpuMoe: cpuMoeCheckbox.checked,
        ctkEnable: ctkEnableCheckbox.checked,
        contextTokenKey: contextTokenKeySelect.value,
        contextTokenValue: contextTokenValueSelect.value,
        fastAttention: fastAttentionCheckbox.checked,
        jinja: jinjaCheckbox.checked,
        // New Multi-GPU parameters
        tensorSplit: tensorSplitInput.value,
        mainGpu: mainGpuSelect.value,
        splitMode: splitModeSelect.value,
        // New Performance parameters
        batchSize: parseInt(batchSizeInput.value) || 0,
        ubatchSize: parseInt(ubatchSizeInput.value) || 0,
        contBatching: contBatchingCheckbox.checked,
        noMmap: noMmapCheckbox.checked,
        numa: numaSelect.value,
        // New Advanced Memory parameters
        cacheTypeK: cacheTypeKSelect.value,
        cacheTypeV: cacheTypeVSelect.value,
        keepModels: parseInt(keepModelsInput.value) || 0,
        memoryTest: memoryTestCheckbox.checked,
        // New Server Network parameters
        serverHost: serverHostInput.value,
        serverPort: parseInt(serverPortInput.value) || 0,
        readTimeout: parseInt(readTimeoutInput.value) || 0,
        writeTimeout: parseInt(writeTimeoutInput.value) || 0,
        apiKey: apiKeyInput.value,
        // Draft Model parameters
        draftModelEnable: draftModelEnableCheckbox.checked,
        draftModelPath: draftModelPathSelect.value,
        draftGpuLayers: parseInt(draftGpuLayersInput.value) || 0,
        draftContextSize: parseInt(draftContextSizeInput.value) || 0,
        draftMaxTokens: parseInt(draftMaxTokensInput.value) || 0,
        draftMinTokens: parseInt(draftMinTokensInput.value) || 0,
        draftPMin: parseFloat(draftPMinInput.value) || 0
    };
    
    configurations[configId] = config;
    saveConfigurations();
}

// Load configuration values into form
function loadConfiguration(configId) {
    if (!configId || !configurations[configId]) return;
    
    const config = configurations[configId];
    currentConfigId = configId;
    
    // Load values into form fields
    if (config.serverPath) serverPathInput.value = config.serverPath;
    if (config.modelPath) modelPathSelect.value = config.modelPath;
    if (config.ngl !== undefined) nglInput.value = config.ngl;
    if (config.threads !== undefined) threadsInput.value = config.threads;
    if (config.temp !== undefined) tempInput.value = config.temp;
    if (config.topK !== undefined) topKInput.value = config.topK;
    if (config.topP !== undefined) topPInput.value = config.topP;
    if (config.repeatPenalty !== undefined) repeatPenaltyInput.value = config.repeatPenalty;
    if (config.mlock !== undefined) mlockCheckbox.checked = config.mlock;
    if (config.swaFull !== undefined) swaFullCheckbox.checked = config.swaFull;
    if (config.contextSize !== undefined) contextSizeInput.value = config.contextSize;
    if (config.nCpuMoe !== undefined) nCpuMoeInput.value = config.nCpuMoe;
    if (config.cpuMoe !== undefined) cpuMoeCheckbox.checked = config.cpuMoe;
    if (config.ctkEnable !== undefined) ctkEnableCheckbox.checked = config.ctkEnable;
    if (config.contextTokenKey !== undefined) contextTokenKeySelect.value = config.contextTokenKey;
    if (config.contextTokenValue !== undefined) contextTokenValueSelect.value = config.contextTokenValue;
    if (config.fastAttention !== undefined) fastAttentionCheckbox.checked = config.fastAttention;
    if (config.jinja !== undefined) jinjaCheckbox.checked = config.jinja;
    
    // Load new Multi-GPU parameters
    if (config.tensorSplit !== undefined) tensorSplitInput.value = config.tensorSplit;
    if (config.mainGpu !== undefined) mainGpuSelect.value = config.mainGpu;
    if (config.splitMode !== undefined) splitModeSelect.value = config.splitMode;
    
    // Load new Performance parameters
    if (config.batchSize !== undefined) batchSizeInput.value = config.batchSize;
    if (config.ubatchSize !== undefined) ubatchSizeInput.value = config.ubatchSize;
    if (config.contBatching !== undefined) contBatchingCheckbox.checked = config.contBatching;
    if (config.noMmap !== undefined) noMmapCheckbox.checked = config.noMmap;
    if (config.numa !== undefined) numaSelect.value = config.numa;
    
    // Load new Advanced Memory parameters
    if (config.cacheTypeK !== undefined) cacheTypeKSelect.value = config.cacheTypeK;
    if (config.cacheTypeV !== undefined) cacheTypeVSelect.value = config.cacheTypeV;
    if (config.keepModels !== undefined) keepModelsInput.value = config.keepModels;
    if (config.memoryTest !== undefined) memoryTestCheckbox.checked = config.memoryTest;
    
    // Load new Server Network parameters
    if (config.serverHost !== undefined) serverHostInput.value = config.serverHost;
    if (config.serverPort !== undefined) serverPortInput.value = config.serverPort;
    if (config.readTimeout !== undefined) readTimeoutInput.value = config.readTimeout;
    if (config.writeTimeout !== undefined) writeTimeoutInput.value = config.writeTimeout;
    if (config.apiKey !== undefined) apiKeyInput.value = config.apiKey;
    
    // Load Draft Model parameters
    if (config.draftModelEnable !== undefined) draftModelEnableCheckbox.checked = config.draftModelEnable;
    if (config.draftModelPath !== undefined) draftModelPathSelect.value = config.draftModelPath;
    if (config.draftGpuLayers !== undefined) draftGpuLayersInput.value = config.draftGpuLayers;
    if (config.draftContextSize !== undefined) draftContextSizeInput.value = config.draftContextSize;
    if (config.draftMaxTokens !== undefined) draftMaxTokensInput.value = config.draftMaxTokens;
    if (config.draftMinTokens !== undefined) draftMinTokensInput.value = config.draftMinTokens;
    if (config.draftPMin !== undefined) draftPMinInput.value = config.draftPMin;
    
    // Update draft model enable state
    updateDraftModelEnableState();
}

// Update enable/disable state for context token parameters
function updateContextTokenEnableState() {
    const isEnabled = ctkEnableCheckbox.checked;
    contextTokenKeySelect.disabled = !isEnabled;
    contextTokenValueSelect.disabled = !isEnabled;
}

// Update enable/disable state for draft model parameters
function updateDraftModelEnableState() {
    const isEnabled = draftModelEnableCheckbox.checked;
    draftModelPathSelect.disabled = !isEnabled;
    draftGpuLayersInput.disabled = !isEnabled;
    draftContextSizeInput.disabled = !isEnabled;
    draftMaxTokensInput.disabled = !isEnabled;
    draftMinTokensInput.disabled = !isEnabled;
    draftPMinInput.disabled = !isEnabled;
}

// Launch the server with all parameters
async function launchServer() {
    const serverPath = serverPathInput.value.trim();
    
    if (!serverPath) {
        alert('Please enter the path to llama-server.exe');
        return;
    }
    
    // Check if model is selected
    if (!modelPathSelect.value.trim()) {
        alert('Please select a model from the dropdown');
        return;
    }
    
    // Collect all configuration values
    const config = {
        modelPath: modelPathSelect.value.trim(),  // Use select value instead of input value
        ngl: parseInt(nglInput.value) || 0,
        threads: parseInt(threadsInput.value) || 1,
        temp: parseFloat(tempInput.value) || 0,
        topK: parseInt(topKInput.value) || 0,
        topP: parseFloat(topPInput.value) || 0,
        repeatPenalty: parseFloat(repeatPenaltyInput.value) || 0,
        mlock: mlockCheckbox.checked,
        swaFull: swaFullCheckbox.checked,
        contextSize: parseInt(contextSizeInput.value) || 1,
        nCpuMoe: parseInt(nCpuMoeInput.value) || 0,
        cpuMoe: cpuMoeCheckbox.checked,
        ctkEnable: ctkEnableCheckbox.checked,
        contextTokenKey: contextTokenKeySelect.value,
        contextTokenValue: contextTokenValueSelect.value,
        fastAttention: fastAttentionCheckbox.checked,
        jinja: jinjaCheckbox.checked,
        // New Multi-GPU parameters
        tensorSplit: tensorSplitInput.value,
        mainGpu: mainGpuSelect.value,
        splitMode: splitModeSelect.value,
        // New Performance parameters
        batchSize: parseInt(batchSizeInput.value) || 0,
        ubatchSize: parseInt(ubatchSizeInput.value) || 0,
        contBatching: contBatchingCheckbox.checked,
        noMmap: noMmapCheckbox.checked,
        numa: numaSelect.value,
        // New Advanced Memory parameters
        cacheTypeK: cacheTypeKSelect.value,
        cacheTypeV: cacheTypeVSelect.value,
        keepModels: parseInt(keepModelsInput.value) || 0,
        memoryTest: memoryTestCheckbox.checked,
        // New Server Network parameters
        serverHost: serverHostInput.value,
        serverPort: parseInt(serverPortInput.value) || 0,
        readTimeout: parseInt(readTimeoutInput.value) || 0,
        writeTimeout: parseInt(writeTimeoutInput.value) || 0,
        apiKey: apiKeyInput.value,
        // Draft Model parameters
        draftModelEnable: draftModelEnableCheckbox.checked,
        draftModelPath: draftModelPathSelect.value,
        draftGpuLayers: parseInt(draftGpuLayersInput.value) || 0,
        draftContextSize: parseInt(draftContextSizeInput.value) || 0,
        draftMaxTokens: parseInt(draftMaxTokensInput.value) || 0,
        draftMinTokens: parseInt(draftMinTokensInput.value) || 0,
        draftPMin: parseFloat(draftPMinInput.value) || 0
    };
    
    // Save current values to localStorage (if we have a config ID)
    if (currentConfigId) {
        saveCurrentValues(currentConfigId);
    }
    
    try {
        showOutput(`Starting server: ${serverPath}`);
        showOutput('Connecting to server for real-time logging...');
        
        // Build command arguments
        const args = [];
        
        if (config.modelPath) {
            args.push('-m', config.modelPath);
        }
        
        if (config.ngl > 0) {
            args.push('-ngl', config.ngl.toString());
        }
        
        if (config.threads > 0) {
            args.push('-t', config.threads.toString());
        }
        
        if (config.temp >= 0) {
            args.push('--temp', config.temp.toString());
        }
        
        if (config.topK > 0) {
            args.push('--top-k', config.topK.toString());
        }
        
        if (config.topP >= 0) {
            args.push('--top-p', config.topP.toString());
        }
        
        if (config.repeatPenalty > 0) {
            args.push('--repeat-penalty', config.repeatPenalty.toString());
        }
        
        if (config.mlock) {
            args.push('--mlock');
        }
        
        if (config.swaFull) {
            args.push('--swa-full');
        }
        
        if (config.contextSize > 0) {
            args.push('-c', config.contextSize.toString());
        }
        
        if (config.nCpuMoe > 0) {
            args.push('--n-cpu-moe', config.nCpuMoe.toString());
        }
        
        if (config.cpuMoe) {
            args.push('--cpu-moe');
        }
        
        // Add context token parameters if enabled
        if (config.ctkEnable && config.contextTokenKey && config.contextTokenValue) {
            args.push('-ctk', config.contextTokenKey);
            args.push('-ctv', config.contextTokenValue);
        }
        
        // Add fast attention flag if checked
        if (config.fastAttention) {
            args.push('-fa');
        }
        
        // Add jinja flag if checked
        if (config.jinja) {
            args.push('--jinja');
        }
        
        // Add Multi-GPU parameters
        if (config.tensorSplit && config.tensorSplit.trim()) {
            args.push('--tensor-split', config.tensorSplit.trim());
        }
        
        if (config.mainGpu && config.mainGpu !== '0') {
            args.push('--main-gpu', config.mainGpu);
        }
        
        if (config.splitMode && config.splitMode !== 'none') {
            args.push('--split-mode', config.splitMode);
        }
        
        // Add Performance parameters
        if (config.batchSize > 0) {
            args.push('--batch-size', config.batchSize.toString());
        }
        
        if (config.ubatchSize > 0) {
            args.push('--ubatch-size', config.ubatchSize.toString());
        }
        
        if (config.contBatching) {
            args.push('--cont-batching');
        }
        
        if (config.noMmap) {
            args.push('--no-mmap');
        }
        
        if (config.numa && config.numa.trim()) {
            args.push('--numa', config.numa);
        }
        
        // Add Advanced Memory parameters
        if (config.cacheTypeK && config.cacheTypeK !== 'f16') {
            args.push('--cache-type-k', config.cacheTypeK);
        }
        
        if (config.cacheTypeV && config.cacheTypeV !== 'f16') {
            args.push('--cache-type-v', config.cacheTypeV);
        }
        
        if (config.keepModels > 0) {
            args.push('--keep', config.keepModels.toString());
        }
        
        if (config.memoryTest) {
            args.push('--memory-test');
        }
        
        // Add Server Network parameters
        if (config.serverHost && config.serverHost !== '127.0.0.1') {
            args.push('--host', config.serverHost);
        }
        
        if (config.serverPort > 0 && config.serverPort !== 8080) {
            args.push('--port', config.serverPort.toString());
        }
        
        if (config.readTimeout > 0 && config.readTimeout !== 600) {
            args.push('--timeout-read', config.readTimeout.toString());
        }
        
        if (config.writeTimeout > 0 && config.writeTimeout !== 600) {
            args.push('--timeout-write', config.writeTimeout.toString());
        }
        
        if (config.apiKey && config.apiKey.trim()) {
            args.push('--api-key', config.apiKey.trim());
        }
        
        // Add Draft Model parameters (Speculative Decoding)
        if (config.draftModelEnable && config.draftModelPath && config.draftModelPath.trim()) {
            args.push('--model-draft', config.draftModelPath.trim());
            
            if (config.draftGpuLayers > 0) {
                args.push('--gpu-layers-draft', config.draftGpuLayers.toString());
            }
            
            if (config.draftContextSize > 0 && config.draftContextSize !== parseInt(contextSizeInput.value)) {
                args.push('--ctx-size-draft', config.draftContextSize.toString());
            }
            
            if (config.draftMaxTokens > 0 && config.draftMaxTokens !== 16) {
                args.push('--draft-max', config.draftMaxTokens.toString());
            }
            
            if (config.draftMinTokens > 0 && config.draftMinTokens !== 5) {
                args.push('--draft-min', config.draftMinTokens.toString());
            }
            
            if (config.draftPMin > 0 && config.draftPMin !== 0.9) {
                args.push('--draft-p-min', config.draftPMin.toString());
            }
        }
        
        showOutput(`Command arguments: ${args.join(' ')}`);
        
        const response = await fetch('/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                serverPath, 
                args 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showOutput('Server started successfully');
            updateStatus(true);
            updateButtonStates(true);
            // Initialize WebSocket connection for log streaming
            initWebSocket();
        } else {
            showOutput('Error starting server: ' + data.error);
        }
    } catch (error) {
        console.error('Error launching server:', error);
        showOutput('Error launching server: ' + error.message);
    }
}

// Initialize WebSocket connection for log streaming
function initWebSocket() {
    // Only initialize if not already connected
    if (socket) return;
    
    try {
        // Connect to the server's WebSocket endpoint
        socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to WebSocket server for log streaming');
            showOutput('Connected to server for real-time logging');
        });
        
        socket.on('log-stream', (data) => {
            // Stream logs to output box
            if (data && data.data) {
                showOutput(data.data.trim());
            }
        });
        
        socket.on('server-ended', (data) => {
            console.log('Server process ended:', data.message);
            showOutput('Server process has ended');
            updateStatus(false);
            updateButtonStates(false);
        });
        
        socket.on('server-error', (data) => {
            console.error('Server error:', data.message);
            showOutput('Server error: ' + data.message);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            showOutput('Disconnected from server for real-time logging');
        });
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        showOutput('Failed to connect to server for real-time logging: ' + error.message);
    }
}

// Stop the server
async function stopServer() {
    try {
        showOutput('Stopping server...');
        const response = await fetch('/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });
        const data = await response.json();
        
        if (data.success) {
            showOutput('Server stopped successfully');
            updateStatus(false);
            updateButtonStates(false);
            // Close WebSocket connection
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        } else {
            showOutput('Error stopping server: ' + data.error);
        }
    } catch (error) {
        console.error('Error stopping server:', error);
        showOutput('Error stopping server: ' + error.message);
    }
}

// Configuration management functions
function renderConfigList() {
    configList.innerHTML = '';
    
    const configNames = getConfigNames();
    if (configNames.length === 0) {
        configList.innerHTML = '<div class="empty-configs">No configurations saved</div>';
        return;
    }
    
    // Sort configurations by name for consistent display
    configNames.sort().forEach(name => {
        const configItem = document.createElement('div');
        configItem.className = 'config-item';
        if (currentConfigId === name) {
            configItem.classList.add('active');
        }
        
        configItem.innerHTML = `
            <span class="config-item-name">${name}</span>
            <div class="config-item-actions">
                <button class="config-item-btn edit-btn" data-name="${name}">✏️</button>
                <button class="config-item-btn delete-btn" data-name="${name}">🗑️</button>
            </div>
        `;
        
        configList.appendChild(configItem);
    });
    
    // Add event listeners for config items
    document.querySelectorAll('.config-item-btn.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const configName = btn.dataset.name;
            editConfiguration(configName);
        });
    });
    
    document.querySelectorAll('.config-item-btn.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const configName = btn.dataset.name;
            deleteConfiguration(configName);
        });
    });
    
    // Add click event for selecting configurations
    document.querySelectorAll('.config-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('config-item-btn')) return;
            const configName = e.currentTarget.querySelector('.config-item-name').textContent;
            selectConfiguration(configName);
        });
    });
}

// Select a configuration to use
function selectConfiguration(configName) {
    if (configurations[configName]) {
        loadConfiguration(configName);
        currentConfigId = configName;
        renderConfigList();
    }
}

// Edit a configuration
function editConfiguration(configName) {
    const config = configurations[configName];
    if (config) {
        // Show the form with the configuration name
        configFormTitle.textContent = 'Edit Configuration';
        configNameInput.value = configName || '';
        configFormContainer.showModal();
        currentConfigId = configName;
    }
}

// Save a new or edited configuration
function saveConfiguration() {
    const configName = configNameInput.value.trim();
    
    if (!configName) {
        alert('Please enter a configuration name');
        return;
    }
    
    // Save the current form values to this configuration
    saveCurrentValues(configName);
    
    // Close the form and refresh the list
    configFormContainer.close();
    renderConfigList();
    
    // Clear the form
    configNameInput.value = '';
    configFormTitle.textContent = 'Create New Configuration';
}

// Cancel configuration editing
function cancelConfiguration() {
    configFormContainer.close();
    configNameInput.value = '';
    configFormTitle.textContent = 'Create New Configuration';
}

// Delete a configuration
function deleteConfiguration(configName) {
    if (confirm(`Are you sure you want to delete the configuration "${configName}"?`)) {
        delete configurations[configName];
        saveConfigurations();
        renderConfigList();
        
        // If we just deleted the current config, clear the form
        if (currentConfigId === configName) {
            currentConfigId = null;
            // Clear all fields
            serverPathInput.value = '';
            modelPathSelect.value = '';
            nglInput.value = '99';
            threadsInput.value = '12';
            tempInput.value = '0.7';
            topKInput.value = '20';
            topPInput.value = '0.00';
            repeatPenaltyInput.value = '1.05';
            mlockCheckbox.checked = false;
            swaFullCheckbox.checked = false;
            contextSizeInput.value = '16384';
            nCpuMoeInput.value = '8';
            cpuMoeCheckbox.checked = false;
            ctkEnableCheckbox.checked = false;
            contextTokenKeySelect.value = 'f16';
            contextTokenValueSelect.value = 'f16';
            fastAttentionCheckbox.checked = false;
        }
    }
}

// Add a new configuration
function addNewConfiguration() {
    configFormTitle.textContent = 'Create New Configuration';
    configNameInput.value = '';
    configFormContainer.showModal();
    currentConfigId = null;
}

// Preset configuration functions
function applyHighPerformanceSingleGPU() {
    nglInput.value = '99';
    batchSizeInput.value = '2048';
    ubatchSizeInput.value = '512';
    fastAttentionCheckbox.checked = true;
    mainGpuSelect.value = '0';
    tensorSplitInput.value = '';
    splitModeSelect.value = 'none';
    contBatchingCheckbox.checked = true;
    noMmapCheckbox.checked = false;
    mlockCheckbox.checked = true;
    // Enable draft model for maximum performance
    draftModelEnableCheckbox.checked = true;
    draftGpuLayersInput.value = '99';
    draftMaxTokensInput.value = '16';
    draftMinTokensInput.value = '5';
    updateDraftModelEnableState();
    showMultiGpuWarning(false);
}

function applyBalancedDualGPU() {
    nglInput.value = '99';
    tensorSplitInput.value = '0.5,0.5';
    splitModeSelect.value = 'layer';
    batchSizeInput.value = '2048';
    ubatchSizeInput.value = '512';
    fastAttentionCheckbox.checked = true;
    mainGpuSelect.value = '0';
    contBatchingCheckbox.checked = true;
    // Enable draft model with balanced settings
    draftModelEnableCheckbox.checked = true;
    draftGpuLayersInput.value = '99';
    draftMaxTokensInput.value = '12';
    draftMinTokensInput.value = '4';
    updateDraftModelEnableState();
    showMultiGpuWarning(true);
}

function applyLargeModelDualGPU() {
    nglInput.value = '99';
    tensorSplitInput.value = '0.6,0.4';
    splitModeSelect.value = 'layer';
    batchSizeInput.value = '1024';
    ubatchSizeInput.value = '256';
    fastAttentionCheckbox.checked = true;
    mainGpuSelect.value = '0';
    contextSizeInput.value = '8192';
    cacheTypeKSelect.value = 'q4_0';
    cacheTypeVSelect.value = 'q4_0';
    showMultiGpuWarning(true);
}

function applyCpuOffloadHybrid() {
    nglInput.value = '40';
    tensorSplitInput.value = '0.7,0.3';
    splitModeSelect.value = 'layer';
    batchSizeInput.value = '512';
    ubatchSizeInput.value = '128';
    threadsInput.value = '16';
    noMmapCheckbox.checked = true;
    mlockCheckbox.checked = false;
    showMultiGpuWarning(true);
}

function showMultiGpuWarning(show) {
    const warningBanner = document.getElementById('multiGpuWarning');
    if (warningBanner) {
        warningBanner.style.display = show ? 'block' : 'none';
    }
}

// Auto-recommendation based on model selection
function analyzeModelAndRecommendSettings() {
    const selectedModel = modelPathSelect.value;
    if (!selectedModel) return;
    
    const modelName = selectedModel.toLowerCase();
    const output = [];
    
    // Model size recommendations
    if (modelName.includes('7b') || modelName.includes('8b')) {
        output.push('💡 Detected small model (7B-8B): High Performance Single GPU preset recommended');
        if (parseInt(batchSizeInput.value) < 2048) batchSizeInput.value = '2048';
        if (parseInt(ubatchSizeInput.value) < 512) ubatchSizeInput.value = '512';
    } else if (modelName.includes('13b') || modelName.includes('14b') || modelName.includes('15b')) {
        output.push('💡 Detected medium model (13B-15B): Consider Balanced Dual GPU for better performance');
    } else if (modelName.includes('30b') || modelName.includes('34b') || modelName.includes('70b') || modelName.includes('72b')) {
        output.push('💡 Detected large model (30B+): Large Model Dual GPU preset strongly recommended');
        if (parseInt(contextSizeInput.value) > 8192) {
            output.push('⚠️ Large context with big model may require CPU offloading');
        }
    }
    
    // Quantization recommendations
    if (modelName.includes('q2_k') || modelName.includes('q3_k')) {
        output.push('📊 Low quantization detected: Consider higher batch sizes for better throughput');
    } else if (modelName.includes('q8_0') || modelName.includes('f16') || modelName.includes('f32')) {
        output.push('📊 High precision model: May require reduced batch size or CPU offloading');
    }
    
    // Display recommendations
    if (output.length > 0) {
        showOutput('=== Model Analysis & Recommendations ===');
        output.forEach(msg => showOutput(msg));
        showOutput('=====================================');
    }
}

// Initialize the application
async function init() {
    // Load theme first
    loadTheme();
    
    // Load configurations
    loadConfigurations();
    
    await fetchModels();
    
    // Set up event listeners for configuration management
    addConfigBtn.addEventListener('click', addNewConfiguration);
    saveConfigBtn.addEventListener('click', saveConfiguration);
    cancelConfigBtn.addEventListener('click', cancelConfiguration);
    
    // Set up event listeners for context token parameters
    ctkEnableCheckbox.addEventListener('change', updateContextTokenEnableState);
    
    // Set up event listeners for draft model parameters
    draftModelEnableCheckbox.addEventListener('change', updateDraftModelEnableState);
    
    // Set up event listeners for launching and stopping
    launchBtn.addEventListener('click', launchServer);
    stopBtn.addEventListener('click', stopServer);
    
    // Set up event listeners for preset buttons
    presetHighPerfBtn.addEventListener('click', applyHighPerformanceSingleGPU);
    presetBalancedDualBtn.addEventListener('click', applyBalancedDualGPU);
    presetLargeModelBtn.addEventListener('click', applyLargeModelDualGPU);
    presetCpuOffloadBtn.addEventListener('click', applyCpuOffloadHybrid);
    
    // Set up theme toggle event listener
    themeToggle.addEventListener('click', toggleTheme);
    
    // Initialize tooltips
    initTooltips();
    
    // Set up tensor split change handler to show/hide warning
    tensorSplitInput.addEventListener('input', function() {
        const hasTensorSplit = this.value && this.value.trim().includes(',');
        showMultiGpuWarning(hasTensorSplit);
    });
    
    // Set up model change handler for automatic recommendations
    modelPathSelect.addEventListener('change', analyzeModelAndRecommendSettings);
    
    // Check initial status
    await fetchStatus();
    
    // Periodically check status (every 5 seconds)
    setInterval(fetchStatus, 5000);
    
    // Render the configuration list
    renderConfigList();
}

// Initialize chart contexts and set canvas dimensions
function initCharts() {
    const cpuCanvas = document.getElementById('cpuGraph');
    const ramCanvas = document.getElementById('ramGraph');
    const gpuCanvas = document.getElementById('gpuGraph');
    const vramCanvas = document.getElementById('vramGraph');
    
    // Set canvas dimensions to match their CSS dimensions
    function setCanvasSize(canvas) {
        if (canvas) {
            const style = window.getComputedStyle(canvas);
            const width = parseInt(style.width) || canvas.offsetWidth;
            const height = parseInt(style.height) || canvas.offsetHeight;
            
            // Set the actual canvas dimensions (this is important for proper rendering)
            canvas.width = width;
            canvas.height = height;
        }
    }
    
    if (cpuCanvas) {
        setCanvasSize(cpuCanvas);
        cpuCtx = cpuCanvas.getContext('2d');
    }
    if (ramCanvas) {
        setCanvasSize(ramCanvas);
        ramCtx = ramCanvas.getContext('2d');
    }
    if (gpuCanvas) {
        setCanvasSize(gpuCanvas);
        gpuCtx = gpuCanvas.getContext('2d');
    }
    if (vramCanvas) {
        setCanvasSize(vramCanvas);
        vramCtx = vramCanvas.getContext('2d');
    }
}

// Draw CPU usage chart
function drawCpuChart() {
    if (!cpuCtx || chartData.cpu.length === 0) return;
    
    const canvas = cpuCtx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    cpuCtx.clearRect(0, 0, width, height);
    
    // Draw grid lines
    cpuCtx.strokeStyle = '#444';
    cpuCtx.lineWidth = 1;
    cpuCtx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        cpuCtx.moveTo(x, 0);
        cpuCtx.lineTo(x, height);
    }
    cpuCtx.stroke();
    
    // Draw data line
    cpuCtx.strokeStyle = '#4CAF50';
    cpuCtx.lineWidth = 2;
    cpuCtx.beginPath();
    
    const maxDataPoints = Math.min(chartData.cpu.length, 50); // Limit to last 50 points
    const stepX = width / (maxDataPoints - 1);
    
    for (let i = 0; i < maxDataPoints; i++) {
        const x = i * stepX;
        const value = chartData.cpu[chartData.cpu.length - maxDataPoints + i];
        const y = height - (value / 100) * height;
        
        if (i === 0) {
            cpuCtx.moveTo(x, y);
        } else {
            cpuCtx.lineTo(x, y);
        }
    }
    cpuCtx.stroke();
}

// Draw RAM usage chart
function drawRamChart() {
    if (!ramCtx || chartData.ram.length === 0) return;
    
    const canvas = ramCtx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ramCtx.clearRect(0, 0, width, height);
    
    // Draw grid lines
    ramCtx.strokeStyle = '#444';
    ramCtx.lineWidth = 1;
    ramCtx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        ramCtx.moveTo(x, 0);
        ramCtx.lineTo(x, height);
    }
    ramCtx.stroke();
    
    // Draw data line
    ramCtx.strokeStyle = '#2196F3';
    ramCtx.lineWidth = 2;
    ramCtx.beginPath();
    
    const maxDataPoints = Math.min(chartData.ram.length, 50); // Limit to last 50 points
    const stepX = width / (maxDataPoints - 1);
    
    for (let i = 0; i < maxDataPoints; i++) {
        const x = i * stepX;
        const value = chartData.ram[chartData.ram.length - maxDataPoints + i];
        const y = height - (value / 100) * height;
        
        if (i === 0) {
            ramCtx.moveTo(x, y);
        } else {
            ramCtx.lineTo(x, y);
        }
    }
    ramCtx.stroke();
}

// Draw GPU usage chart
function drawGpuChart() {
    if (!gpuCtx || chartData.gpu.length === 0) return;
    
    const canvas = gpuCtx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    gpuCtx.clearRect(0, 0, width, height);
    
    // Draw grid lines
    gpuCtx.strokeStyle = '#444';
    gpuCtx.lineWidth = 1;
    gpuCtx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        gpuCtx.moveTo(x, 0);
        gpuCtx.lineTo(x, height);
    }
    gpuCtx.stroke();
    
    // Draw data line
    gpuCtx.strokeStyle = '#FF9800';
    gpuCtx.lineWidth = 2;
    gpuCtx.beginPath();
    
    const maxDataPoints = Math.min(chartData.gpu.length, 50); // Limit to last 50 points
    const stepX = width / (maxDataPoints - 1);
    
    for (let i = 0; i < maxDataPoints; i++) {
        const x = i * stepX;
        const value = chartData.gpu[chartData.gpu.length - maxDataPoints + i];
        const y = height - (value / 100) * height;
        
        if (i === 0) {
            gpuCtx.moveTo(x, y);
        } else {
            gpuCtx.lineTo(x, y);
        }
    }
    gpuCtx.stroke();
}

// Draw VRAM usage chart
function drawVramChart() {
    if (!vramCtx || chartData.vram.length === 0) return;
    
    const canvas = vramCtx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    vramCtx.clearRect(0, 0, width, height);
    
    // Draw grid lines
    vramCtx.strokeStyle = '#444';
    vramCtx.lineWidth = 1;
    vramCtx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        vramCtx.moveTo(x, 0);
        vramCtx.lineTo(x, height);
    }
    vramCtx.stroke();
    
    // Draw data line
    vramCtx.strokeStyle = '#9C27B0';
    vramCtx.lineWidth = 2;
    vramCtx.beginPath();
    
    const maxDataPoints = Math.min(chartData.vram.length, 50); // Limit to last 50 points
    const stepX = width / (maxDataPoints - 1);
    
    for (let i = 0; i < maxDataPoints; i++) {
        const x = i * stepX;
        const value = chartData.vram[chartData.vram.length - maxDataPoints + i];
        const y = height - (value / 100) * height;
        
        if (i === 0) {
            vramCtx.moveTo(x, y);
        } else {
            vramCtx.lineTo(x, y);
        }
    }
    vramCtx.stroke();
}

// Update all charts with new data
function updateCharts() {
    drawCpuChart();
    drawRamChart();
    drawGpuChart();
    drawVramChart();
}

// Fetch system metrics and update charts
async function fetchSystemMetrics() {
    try {
        const response = await fetch('/metrics');
        const data = await response.json();
        
        if (data.cpu !== undefined) {
            chartData.cpu.push(data.cpu);
            if (chartData.cpu.length > 50) {
                chartData.cpu.shift(); // Remove oldest point
            }
            document.getElementById('cpuValue').textContent = `${Math.round(data.cpu)}%`;
        }
        
        if (data.ram !== undefined) {
            chartData.ram.push(data.ram);
            if (chartData.ram.length > 50) {
                chartData.ram.shift(); // Remove oldest point
            }
            document.getElementById('ramValue').textContent = `${Math.round(data.ram)}%`;
        }
        
        if (data.gpu !== undefined) {
            chartData.gpu.push(data.gpu);
            if (chartData.gpu.length > 50) {
                chartData.gpu.shift(); // Remove oldest point
            }
            document.getElementById('gpuValue').textContent = `${Math.round(data.gpu)}%`;
        }
        
        if (data.vram !== undefined) {
            chartData.vram.push(data.vram);
            if (chartData.vram.length > 50) {
                chartData.vram.shift(); // Remove oldest point
            }
            document.getElementById('vramValue').textContent = `${data.vramUsage}`;
        }
        
        updateCharts();
    } catch (error) {
        console.error('Error fetching system metrics:', error);
    }
}

// Start periodic metric updates
function startMetricUpdates() {
    // Update every second
    setInterval(fetchSystemMetrics, 1000);
    
    // Initial fetch
    fetchSystemMetrics();
}

// Handle window resize for charts
function handleResize() {
    // Reinitialize charts when window is resized to ensure proper canvas dimensions
    setTimeout(() => {
        initCharts();
        updateCharts();
    }, 100); // Small delay to ensure DOM is updated
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
    initCharts(); // Initialize chart contexts
    startMetricUpdates(); // Start periodic metric updates
    
    // Add resize listener for charts
    window.addEventListener('resize', handleResize);
});
