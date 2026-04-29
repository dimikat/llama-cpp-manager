import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
import { icon, iconSpan } from "./icons.js";
import { computePosition, offset, flip, shift, arrow } from "@floating-ui/dom";

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
const noContextShiftCheckbox = document.getElementById('noContextShift');
const nPredictInput = document.getElementById('nPredict');
const nParallelInput = document.getElementById('nParallel');
const slotPromptSimilarityInput = document.getElementById('slotPromptSimilarity');
const slotSavePathInput = document.getElementById('slotSavePath');
const noMmapCheckbox = document.getElementById('noMmap');
const numaSelect = document.getElementById('numa');

// New Advanced Memory elements
const cacheTypeKSelect = document.getElementById('cacheTypeK');
const cacheTypeVSelect = document.getElementById('cacheTypeV');
const keepModelsInput = document.getElementById('keepModels');
const memoryTestCheckbox = document.getElementById('memoryTest');
const kvOffloadCheckbox = document.getElementById('kvOffload');

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
const presetHighRamHybridBtn = document.getElementById('presetHighRamHybrid');
const presetQwen35Btn = document.getElementById('presetQwen35');
const presetGemma4Btn = document.getElementById('presetGemma4');
const presetAgenticCodingBtn = document.getElementById('presetAgenticCoding');

// Extended Context & Vision elements
const ropeScalingSelect = document.getElementById('ropeScaling');
const ropeScaleInput = document.getElementById('ropeScale');
const yarnOrigCtxInput = document.getElementById('yarnOrigCtx');
const imageMinTokensInput = document.getElementById('imageMinTokens');
const imageMaxTokensInput = document.getElementById('imageMaxTokens');

// Draft Model (Speculative Decoding) elements
const draftModelEnableCheckbox = document.getElementById('draftModelEnable');
const draftModelPathSelect = document.getElementById('draftModelPath');
const draftGpuLayersInput = document.getElementById('draftGpuLayers');
const draftContextSizeInput = document.getElementById('draftContextSize');
const draftMaxTokensInput = document.getElementById('draftMaxTokens');
const draftMinTokensInput = document.getElementById('draftMinTokens');
const draftPMinInput = document.getElementById('draftPMin');

// Models Directory elements
const modelsSourceSelect = document.getElementById('modelsSource');
const customPathGroup = document.getElementById('customPathGroup');
const customModelsPathInput = document.getElementById('customModelsPath');
const activeModelsPathSpan = document.getElementById('activeModelsPath');
const refreshModelsBtn = document.getElementById('refreshModelsBtn');

const modelStatusMessage = document.getElementById('modelStatusMessage');
const modelProcessInfo = document.getElementById('modelProcessInfo');
const modelOutput = document.getElementById('modelOutput');

const configFormContainer = document.getElementById('configFormContainer');
const configFormTitle = document.getElementById('configFormTitle');
const configNameInput = document.getElementById('configName');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');
const configElementsExist = !!configFormContainer;

const launchBtn = document.getElementById('launchBtn');
const stopBtn = document.getElementById('stopBtn');
const openServerBtn = document.getElementById('openServerBtn');
const testContextBtn = document.getElementById('testContextBtn');

const tokenSpeedDiv = document.getElementById('tokenSpeed');
const speedValueSpan = document.getElementById('speedValue');

// Updater elements
const updaterCurrentVersion = document.getElementById('updaterCurrentVersion');
const updaterLatestVersion = document.getElementById('updaterLatestVersion');
const updaterPlatform = document.getElementById('updaterPlatform');
const updaterStatus = document.getElementById('updaterStatus');
const updateAvailableBanner = document.getElementById('updateAvailableBanner');
const updateBannerInfo = document.getElementById('updateBannerInfo');
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
const downloadUpdateBtn = document.getElementById('downloadUpdateBtn');
const applyUpdateBtn = document.getElementById('applyUpdateBtn');
const downloadProgressSection = document.getElementById('downloadProgressSection');
const downloadProgressBar = document.getElementById('downloadProgressBar');
const downloadProgressPercent = document.getElementById('downloadProgressPercent');
const downloadProgressBytes = document.getElementById('downloadProgressBytes');
const updaterMessages = document.getElementById('updaterMessages');
const updaterInstallPath = document.getElementById('updaterInstallPath');
const detectInstallPathBtn = document.getElementById('detectInstallPathBtn');

const ACCORDION_STATE_KEY = 'llamaCppAccordionState';

const RUNTIME_GROUPS = {
    llamacpp: ['model', 'performance', 'memory', 'concurrency', 'speculative', 'networking', 'advanced'],
    vllm: ['model', 'performance', 'memory', 'concurrency', 'speculative', 'kv-transfer', 'networking', 'advanced'],
};

const DEFAULT_EXPANDED = { model: true };

function initAccordion() {
    const accordion = document.getElementById('configAccordion');
    if (!accordion) return;

    const savedState = loadAccordionState();
    const runtime = getCurrentRuntime();

    accordion.querySelectorAll('.accordion-group').forEach(group => {
        const groupName = group.dataset.group;
        const header = group.querySelector('.accordion-header');
        const content = group.querySelector('.accordion-content');
        if (!header || !content) return;

        const isVisible = isGroupVisible(groupName, runtime);
        if (!isVisible) {
            group.setAttribute('data-hidden', 'true');
        } else {
            group.removeAttribute('data-hidden');
        }

        const isExpanded = savedState[groupName] !== undefined
            ? savedState[groupName]
            : !!DEFAULT_EXPANDED[groupName];

        header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        content.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');

        header.addEventListener('click', () => {
            toggleAccordionGroup(group);
        });
    });
}

function toggleAccordionGroup(group) {
    const header = group.querySelector('.accordion-header');
    const content = group.querySelector('.accordion-content');
    if (!header || !content) return;

    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    content.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');

    saveAccordionState();
}

function isGroupVisible(groupName, runtime) {
    const group = document.querySelector(`.accordion-group[data-group="${groupName}"]`);
    if (!group) return false;
    const runtimeAttr = group.dataset.runtime;
    if (runtimeAttr === 'both') return true;
    if (runtimeAttr === runtime) return true;
    return false;
}

function updateAccordionRuntimeVisibility(runtime) {
    const accordion = document.getElementById('configAccordion');
    if (!accordion) return;

    accordion.querySelectorAll('.accordion-group').forEach(group => {
        const groupName = group.dataset.group;
        const isVisible = isGroupVisible(groupName, runtime);
        if (isVisible) {
            group.removeAttribute('data-hidden');
        } else {
            group.setAttribute('data-hidden', 'true');
        }
    });

    updateOutlineForRuntime(runtime);
    updatePresetsForRuntime(runtime);
}

function updateOutlineForRuntime(runtime) {
    const panel = document.querySelector('.instance-panel.active');
    if (!panel) return;

    const groups = RUNTIME_GROUPS[runtime] || RUNTIME_GROUPS.llamacpp;
    panel.querySelectorAll('.outline-nav .outline-item').forEach(item => {
        const sectionId = item.getAttribute('data-section');
        const groupName = sectionId.replace('section-', '');
        if (groups.includes(groupName) || groupName === 'updates') {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function updatePresetsForRuntime(runtime) {
    const presetBar = document.getElementById('presetBar');
    if (!presetBar) return;

    const llamacppPresets = ['presetHighPerf', 'presetBalancedDual', 'presetLargeModel', 'presetCpuOffload', 'presetHighRamHybrid', 'presetQwen35', 'presetGemma4', 'presetAgenticCoding'];

    presetBar.querySelectorAll('.preset-btn').forEach(btn => {
        if (runtime === 'vllm') {
            if (btn.id === 'presetAgenticCoding') {
                btn.style.display = '';
            } else {
                btn.style.display = 'none';
            }
        } else {
            btn.style.display = '';
        }
    });
}

function getCurrentRuntime() {
    const instance = instanceTabs.find(t => t.id === activeInstanceId);
    return instance?.runtime || 'llamacpp';
}

function loadAccordionState() {
    try {
        const raw = localStorage.getItem(ACCORDION_STATE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveAccordionState() {
    const state = {};
    document.querySelectorAll('.accordion-group').forEach(group => {
        const header = group.querySelector('.accordion-header');
        if (header) {
            state[group.dataset.group] = header.getAttribute('aria-expanded') === 'true';
        }
    });
    localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(state));
}

// Store WebSocket connection
let socket = null;

// Configuration management state
let currentConfigId = null;
let configurations = {};

const SERVER_PATH_KEY = 'llamaCppServerPath';

// Tab management
let currentTab = 'model';

// Instance tab management
let instanceTabs = [];
let activeInstanceId = null;
let instanceCounter = 0;

const STATUS_COLORS = {
    IDLE: 'status-idle',
    LOADING: 'status-loading',
    RUNNING: 'status-running',
    STOPPING: 'status-stopping',
    ERROR: 'status-error',
    STOPPED: 'status-stopped',
};

const RUNTIME_LABELS = {
    llamacpp: 'llama.cpp',
    vllm: 'vLLM',
};

// Context visualization variables
let contextSize = 0;
let currentContextUsage = { used: 0, total: 0, percentage: 0 };

// Chart variables
let cpuCtx, ramCtx, gpuCtx, vramCtx;
let chartData = {
    cpu: [],
    ram: [],
    gpu: [],
    vram: []
};

let tooltipEl = null;
let tooltipArrowEl = null;
let currentTooltipTrigger = null;

function createTooltipElement() {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'floating-tooltip';
    const textSpan = document.createElement('span');
    textSpan.className = 'floating-tooltip-text';
    tooltipEl.appendChild(textSpan);
    tooltipArrowEl = document.createElement('div');
    tooltipArrowEl.className = 'floating-tooltip-arrow';
    tooltipEl.appendChild(tooltipArrowEl);
    document.body.appendChild(tooltipEl);
}

function updateTooltipPosition(triggerEl) {
    computePosition(triggerEl, tooltipEl, {
        placement: 'top',
        middleware: [
            offset(6),
            flip(),
            shift({ padding: 8 }),
            arrow({ element: tooltipArrowEl })
        ]
    }).then(({ x, y, placement, middlewareData }) => {
        Object.assign(tooltipEl.style, {
            left: `${x}px`,
            top: `${y}px`
        });

        const { x: arrowX, y: arrowY } = middlewareData.arrow;
        const side = placement.split('-')[0];
        const staticSide = {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right'
        }[side];

        Object.assign(tooltipArrowEl.style, {
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            right: '',
            bottom: '',
            [staticSide]: '-3px'
        });
    });
}

function showTooltip(triggerEl) {
    const text = triggerEl.getAttribute('data-tooltip');
    if (!text) return;

    if (!tooltipEl) createTooltipElement();

    const textSpan = tooltipEl.querySelector('.floating-tooltip-text');
    textSpan.textContent = text;
    tooltipEl.setAttribute('data-visible', 'true');
    currentTooltipTrigger = triggerEl;

    updateTooltipPosition(triggerEl);
}

function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.setAttribute('data-visible', 'false');
    }
    currentTooltipTrigger = null;
}

function initTooltips() {
    const triggers = document.querySelectorAll('[data-tooltip]');

    triggers.forEach(trigger => {
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'button');
        trigger.addEventListener('mouseenter', () => showTooltip(trigger));
        trigger.addEventListener('mouseleave', hideTooltip);
        trigger.addEventListener('focus', () => showTooltip(trigger));
        trigger.addEventListener('blur', hideTooltip);
    });
}

// Server path management functions
function saveServerPath(path) {
    if (path && path.trim()) {
        localStorage.setItem(SERVER_PATH_KEY, path.trim());
    }
}

function loadServerPath() {
    return localStorage.getItem(SERVER_PATH_KEY) || '';
}

function clearServerPath() {
    localStorage.removeItem(SERVER_PATH_KEY);
}

// ============================================
// Models Directory Settings Management
// ============================================

// Cached detected paths for UI display
let detectedPaths = null;

// Load app settings and update UI
async function loadModelsDirectorySettings() {
    try {
        const response = await fetch('/api/settings/detect-paths');
        const data = await response.json();

        if (data.success) {
            detectedPaths = data.paths;

            // Update source dropdown with detected status
            updateModelsSourceOptions(data.paths);

            // Set current selection
            if (modelsSourceSelect) {
                modelsSourceSelect.value = data.currentSource || 'lmstudio';
            }

            // Show/hide custom path input
            updateCustomPathVisibility(data.currentSource);

            // Set custom path if applicable
            if (customModelsPathInput && data.customPath) {
                customModelsPathInput.value = data.customPath;
            }

            // Update active path display
            updateActivePathDisplay(data.activePath);
        }
    } catch (error) {
        console.error('Error loading models directory settings:', error);
        if (activeModelsPathSpan) {
            activeModelsPathSpan.textContent = 'Error loading settings';
        }
    }
}

// Update the source dropdown options to show detection status
function updateModelsSourceOptions(paths) {
    if (!modelsSourceSelect) return;

    const sources = [
        { value: 'lmstudio', label: 'LM Studio', detected: paths.lmstudio?.found },
        { value: 'ollama', label: 'Ollama', detected: paths.ollama?.found },
        { value: 'gpt4all', label: 'GPT4All', detected: paths.gpt4all?.found },
        { value: 'jan', label: 'Jan.ai', detected: paths.jan?.found },
        { value: 'custom', label: 'Custom Path', detected: true }
    ];

    // Clear and rebuild options
    modelsSourceSelect.innerHTML = '';

    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.value;

        if (source.value === 'custom') {
            option.textContent = source.label;
        } else {
            const status = source.detected ? '✓' : '✗';
            option.textContent = `${source.label} (${status} ${source.detected ? 'detected' : 'not found'})`;
        }

        // Disable options where path not found (except custom)
        if (!source.detected && source.value !== 'custom') {
            option.disabled = true;
        }

        modelsSourceSelect.appendChild(option);
    });
}

// Show/hide custom path input based on selection
function updateCustomPathVisibility(source) {
    if (!customPathGroup) return;

    if (source === 'custom') {
        customPathGroup.style.display = 'block';
    } else {
        customPathGroup.style.display = 'none';
    }
}

// Update the active path display
function updateActivePathDisplay(path) {
    if (!activeModelsPathSpan) return;

    if (path) {
        activeModelsPathSpan.textContent = path;
        activeModelsPathSpan.title = path; // Full path on hover
    } else {
        activeModelsPathSpan.textContent = 'No path configured';
    }
}

// Handle source selection change
async function onModelsSourceChange() {
    const source = modelsSourceSelect?.value || 'lmstudio';

    // Update custom path visibility
    updateCustomPathVisibility(source);

    // Save settings
    await saveModelsDirectorySettings();
}

// Handle custom path change
async function onCustomPathChange() {
    // Debounce - only save after user stops typing
    if (customModelsPathInput._debounceTimer) {
        clearTimeout(customModelsPathInput._debounceTimer);
    }

    customModelsPathInput._debounceTimer = setTimeout(async () => {
        await saveModelsDirectorySettings();
    }, 500);
}

// Save models directory settings
async function saveModelsDirectorySettings() {
    const source = modelsSourceSelect?.value || 'lmstudio';
    const customPath = customModelsPathInput?.value || '';

    try {
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modelsPath: {
                    source: source,
                    customPath: customPath
                }
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update active path display
            updateActivePathDisplay(data.activePath);

            // Refresh models list
            await fetchModels();
        } else {
            console.error('Error saving settings:', data.error);
            showOutput('Error saving settings: ' + data.error);
        }
    } catch (error) {
        console.error('Error saving models directory settings:', error);
        showOutput('Error saving settings: ' + error.message);
    }
}

// Refresh models button handler
async function refreshModelsHandler() {
    if (refreshModelsBtn) {
        refreshModelsBtn.disabled = true;
        refreshModelsBtn.textContent = 'Refreshing...';
    }

    try {
        // Reload settings to get fresh path detection
        await loadModelsDirectorySettings();

        // Refresh models list
        await fetchModels();

        showOutput('Models list refreshed successfully');
    } catch (error) {
        console.error('Error refreshing models:', error);
        showOutput('Error refreshing models: ' + error.message);
    } finally {
        if (refreshModelsBtn) {
            refreshModelsBtn.disabled = false;
            refreshModelsBtn.textContent = 'Refresh Models';
        }
    }
}

// Disable/enable buttons based on status
function updateButtonStates(isRunning) {
    launchBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
    openServerBtn.disabled = !isRunning;
    
    // Show/hide token speed display based on running status
    if (isRunning) {
        tokenSpeedDiv.style.display = 'flex';
    } else {
        tokenSpeedDiv.style.display = 'none';
        // Reset speed display when stopping
        speedValueSpan.textContent = '0.0 t/s';
    }
}

// Update token generation speed display
function updateTokenSpeed(speed) {
    if (speed && speed > 0) {
        speedValueSpan.textContent = speed.toFixed(1) + ' t/s';
        tokenSpeedDiv.style.display = 'flex';
    }
}

// Context visualization functions
function showContextVisualization() {
    console.log('DEBUG: showContextVisualization called');
    const contextViz = document.getElementById('contextVisualization');
    if (contextViz) {
        contextViz.style.display = 'block';
        console.log('DEBUG: Context visualization shown');
        // Initialize with default values
        updateContextVisualization(0, 0, 0);
    } else {
        console.log('DEBUG: contextVisualization element not found');
    }
}

function hideContextVisualization() {
    const contextViz = document.getElementById('contextVisualization');
    if (contextViz) {
        contextViz.style.display = 'none';
    }
}

function updateContextVisualization(used, total, percentage) {
    try {
        currentContextUsage = { used, total, percentage };
        
        const contextInfo = document.getElementById('contextInfo');
        const contextUsed = document.getElementById('contextUsed');
        const contextWarning = document.getElementById('contextWarning');
        const turnsEstimate = document.getElementById('turnsEstimate');
        
        if (!contextInfo || !contextUsed) {
            console.log('DEBUG: Context visualization elements not found');
            return;
        }
    
    // Update text information
    contextInfo.textContent = `${used.toLocaleString()} / ${total.toLocaleString()} tokens (${percentage.toFixed(1)}%)`;
    
    // Update progress bar
    contextUsed.style.width = `${percentage}%`;
    
    // Update styling based on usage level
    contextUsed.classList.remove('warning', 'critical');
    if (contextWarning) {
        contextWarning.classList.remove('critical');
        contextWarning.style.display = 'none';
    }
    
    if (percentage >= 95) {
        contextUsed.classList.add('critical');
        if (contextWarning) {
            contextWarning.classList.add('critical');
            contextWarning.style.display = 'block';
            contextWarning.innerHTML = iconSpan('siren', 14) + ' Context Almost Full - Consider increasing context size or clearing history';
        }
    } else if (percentage >= 80) {
        contextUsed.classList.add('warning');
        if (contextWarning) {
            contextWarning.style.display = 'block';
            contextWarning.innerHTML = iconSpan('warning', 14) + ' Context usage is high - consider using a larger context size or clearing conversation history';
        }
    }
    
    // Calculate estimated turns remaining
    if (turnsEstimate) {
        turnsEstimate.style.display = 'block';
        const remaining = total - used;
        const averageTokensPerTurn = estimateTokensPerTurn(used, total);
        const turnsCountSpan = turnsEstimate.querySelector('.turns-count');
        
        if (remaining <= 0) {
            if (turnsCountSpan) turnsCountSpan.textContent = '0';
        } else if (averageTokensPerTurn > 0) {
            const estimatedTurns = Math.floor(remaining / averageTokensPerTurn);
            if (turnsCountSpan) turnsCountSpan.textContent = estimatedTurns.toString();
        } else {
            if (turnsCountSpan) turnsCountSpan.textContent = '∞';
        }
    }
    } catch (error) {
        console.log('DEBUG: Error updating context visualization:', error.message);
    }
}

function estimateTokensPerTurn(used, total) {
    // Simple heuristic: assume average turn is about 50-100 tokens
    // This is a rough estimate and could be improved with actual conversation tracking
    const defaultTokensPerTurn = 75;
    
    // If we have significant usage, try to estimate based on usage pattern
    if (used > 200) {
        // Assume this represents several turns, estimate average
        const estimatedTurns = Math.max(1, Math.floor(used / 100)); // Rough turn count estimate
        return Math.max(defaultTokensPerTurn, used / estimatedTurns);
    }
    
    return defaultTokensPerTurn;
}

// Open llama.cpp server in browser
function openServerInBrowser() {
    const host = serverHostInput.value || '127.0.0.1';
    const port = serverPortInput.value || '8080';
    const url = `http://${host}:${port}`;
    
    // Open in new tab/window
    window.open(url, '_blank');
    
    // Show feedback
    showOutput(`Opening server at ${url}`);
}

// Tab management functions
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const targetButton = document.querySelector(`[data-tab="${tabId}"]`);
    const targetPanel = document.getElementById(`tab-${tabId}`);
    
    if (targetButton && targetPanel) {
        targetButton.classList.add('active');
        targetPanel.classList.add('active');
        currentTab = tabId;
    }
}

// Instance tab management
function initInstanceTabs() {
    const newInstanceBtn = document.getElementById('newInstanceBtn');
    const runtimePickerOverlay = document.getElementById('runtimePickerOverlay');

    if (newInstanceBtn) {
        newInstanceBtn.addEventListener('click', () => {
            openRuntimePicker();
        });
    }

    if (runtimePickerOverlay) {
        runtimePickerOverlay.addEventListener('click', (e) => {
            if (e.target === runtimePickerOverlay) {
                closeRuntimePicker();
            }
        });

        runtimePickerOverlay.querySelectorAll('.runtime-picker-card').forEach(card => {
            card.addEventListener('click', () => {
                const runtime = card.getAttribute('data-runtime');
                createInstanceTab(runtime);
                closeRuntimePicker();
            });
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('runtimePickerOverlay');
            if (overlay && overlay.classList.contains('visible')) {
                closeRuntimePicker();
            }
        }
    });

    const defaultInstance = {
        id: 'default-llamacpp',
        runtime: 'llamacpp',
        modelName: 'Untitled',
        status: 'IDLE',
    };
    instanceTabs = [defaultInstance];
    activeInstanceId = defaultInstance.id;
    renderInstanceTabs();
}

function openRuntimePicker() {
    const overlay = document.getElementById('runtimePickerOverlay');
    if (overlay) {
        overlay.classList.add('visible');
        overlay.querySelectorAll('.runtime-picker-card').forEach(c => c.classList.remove('selected'));
    }
}

function closeRuntimePicker() {
    const overlay = document.getElementById('runtimePickerOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

function createInstanceTab(runtime) {
    instanceCounter++;
    const instanceId = `instance-${Date.now()}-${instanceCounter}`;

    const newInstance = {
        id: instanceId,
        runtime: runtime,
        modelName: 'Untitled',
        status: 'IDLE',
    };

    instanceTabs.push(newInstance);

    if (socket && socket.connected) {
        socket.emit('instance:create', { instanceId, runtime });
        socket.emit('instance:join', instanceId);
    }

    createInstancePanel(instanceId);
    switchInstanceTab(instanceId);
    renderInstanceTabs();
}

function createInstancePanel(instanceId) {
    const instanceContent = document.getElementById('instanceContent');
    if (!instanceContent) return;

    const runtime = instanceTabs.find(t => t.id === instanceId)?.runtime || 'llamacpp';
    const runtimeLabel = RUNTIME_LABELS[runtime] || runtime;

    const panel = document.createElement('div');
    panel.className = 'instance-panel';
    panel.setAttribute('data-instance-id', instanceId);
    panel.id = `instancePanel-${instanceId}`;
    panel.innerHTML = `
        <div class="instance-header">
            <div class="instance-header-left">
                <button class="sidebar-toggle btn btn-ghost" title="Toggle sidebar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                </button>
                <span class="instance-header-dot status-idle"></span>
                <span class="instance-header-runtime-badge">${runtimeLabel}</span>
                <span class="instance-header-model">Untitled</span>
            </div>
            <div class="instance-header-right">
                <button class="btn btn-primary instance-launch-btn">Launch</button>
                <button class="btn btn-danger instance-stop-btn" disabled>Stop</button>
                <button class="btn btn-secondary instance-open-server-btn" disabled title="Open server in browser">
                    ${icon('globe', 14)} Open Server
                </button>
                <div class="model-status-inline">
                    <div class="status-message">Not running</div>
                    <div class="token-speed" style="display: none;">
                        <span class="speed-label">Speed:</span>
                        <span class="speed-value">0.0 t/s</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="instance-body">
            <div class="outline-sidebar">
                <nav class="outline-nav">
                    <a class="outline-item active" data-section="section-model">Model</a>
                    <a class="outline-item" data-section="section-performance">Performance</a>
                    <a class="outline-item" data-section="section-memory">Memory</a>
                    <a class="outline-item" data-section="section-concurrency">Concurrency</a>
                    <a class="outline-item" data-section="section-networking">Networking</a>
                    <a class="outline-item" data-section="section-speculative">Speculative</a>
                    <a class="outline-item" data-section="section-kv-transfer">KV Transfer</a>
                    <a class="outline-item" data-section="section-advanced">Advanced</a>
                </nav>
            </div>
            <div class="instance-main">
                <div class="config-form-area">
                    <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                        <p>Instance configuration will be available here.</p>
                        <p style="font-size: 12px; margin-top: 8px;">Instance ID: ${instanceId}</p>
                    </div>
                </div>
                <div class="metrics-panel-placeholder"></div>
                <div class="log-stream-placeholder"></div>
            </div>
        </div>
    `;
    instanceContent.appendChild(panel);

    const sidebarToggle = panel.querySelector('.sidebar-toggle');
    const sidebar = panel.querySelector('.outline-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    const outlineItems = panel.querySelectorAll('.outline-item');
    const instanceMain = panel.querySelector('.instance-main');
    outlineItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            const section = panel.querySelector(`#${sectionId}`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    if (instanceMain) {
        setupScrollSpy(panel, instanceMain, outlineItems);
    }
}

function removeInstanceTab(instanceId) {
    if (instanceTabs.length <= 1) return;

    instanceTabs = instanceTabs.filter(t => t.id !== instanceId);

    const panel = document.getElementById(`instancePanel-${instanceId}`);
    if (panel) panel.remove();

    if (activeInstanceId === instanceId) {
        const firstTab = instanceTabs[0];
        if (firstTab) {
            switchInstanceTab(firstTab.id);
        }
    }

    renderInstanceTabs();
}

function switchInstanceTab(instanceId) {
    activeInstanceId = instanceId;

    document.querySelectorAll('.instance-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`instancePanel-${instanceId}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    document.querySelectorAll('.instance-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-instance-id') === instanceId);
    });

    const runtime = getCurrentRuntime();
    if (typeof updateAccordionRuntimeVisibility === 'function') {
        updateAccordionRuntimeVisibility(runtime);
    }
}

function renderInstanceTabs() {
    const tabsContainer = document.getElementById('instanceTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';

    instanceTabs.forEach(instance => {
        const tab = document.createElement('button');
        tab.className = `instance-tab${instance.id === activeInstanceId ? ' active' : ''}`;
        tab.setAttribute('data-instance-id', instance.id);

        const statusClass = STATUS_COLORS[instance.status] || 'status-idle';
        const runtimeLabel = RUNTIME_LABELS[instance.runtime] || instance.runtime;

        tab.innerHTML = `
            <span class="instance-tab-status ${statusClass}"></span>
            <span class="instance-tab-runtime">${runtimeLabel}</span>
            <span class="instance-tab-name">${escapeHtml(instance.modelName)}</span>
            ${instance.id !== 'default-llamacpp' ? '<span class="instance-tab-close" title="Close instance">&times;</span>' : ''}
        `;

        tab.addEventListener('click', (e) => {
            if (e.target.closest('.instance-tab-close')) {
                e.stopPropagation();
                removeInstanceTab(instance.id);
                return;
            }
            switchInstanceTab(instance.id);
        });

        tabsContainer.appendChild(tab);
    });
}

function updateInstanceStatus(instanceId, status) {
    const tab = instanceTabs.find(t => t.id === instanceId);
    if (!tab) {
        const existingTab = instanceTabs.find(t => t.id === instanceId);
        if (!existingTab) return;
    }

    if (tab) {
        tab.status = status;
    }

    const statusDot = document.querySelector(`.instance-tab[data-instance-id="${instanceId}"] .instance-tab-status`);
    if (statusDot) {
        statusDot.className = `instance-tab-status ${STATUS_COLORS[status] || 'status-idle'}`;
    }

    const headerDot = document.querySelector(`#instancePanel-${instanceId} .instance-header-dot`);
    if (headerDot) {
        headerDot.className = `instance-header-dot ${STATUS_COLORS[status] || 'status-idle'}`;
    }

    if (instanceId === activeInstanceId) {
        const mainDot = document.getElementById('instanceHeaderDot');
        if (mainDot) {
            mainDot.className = `instance-header-dot ${STATUS_COLORS[status] || 'status-idle'}`;
        }
    }
}

function updateInstanceModelName(instanceId, modelName) {
    const tab = instanceTabs.find(t => t.id === instanceId);
    if (!tab) return;

    tab.modelName = modelName || 'Untitled';

    const nameEl = document.querySelector(`.instance-tab[data-instance-id="${instanceId}"] .instance-tab-name`);
    if (nameEl) {
        nameEl.textContent = tab.modelName;
    }

    const headerModel = document.querySelector(`#instancePanel-${instanceId} .instance-header-model`);
    if (headerModel) {
        headerModel.textContent = tab.modelName;
    }

    if (instanceId === activeInstanceId) {
        const mainHeaderModel = document.getElementById('instanceHeaderModel');
        if (mainHeaderModel) {
            mainHeaderModel.textContent = tab.modelName;
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Get architecture icon for model display
function getArchitectureIcon(architecture) {
    const icons = {
        'Llama': 'chip',
        'CodeLlama': 'codeBraces',
        'Gemma': 'diamond',
        'Mistral': 'star',
        'Mixtral': 'fire',
        'Qwen': 'bot',
        'GLM': 'brain',
        'DeepSeek': 'search',
        'Unknown': 'file'
    };
    const name = icons[architecture] || icons['Unknown'];
    return icon(name, 14);
}

// Fetch and populate models dropdown
async function fetchModels() {
    try {
        const response = await fetch('/models');
        const data = await response.json();
        
        if (data.success) {
            // Clear existing options except the placeholder
            modelPathSelect.innerHTML = '<option value="">-- Select a Model --</option>';
            
            // Add models to dropdown with rich metadata
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.path;  // Use full path for the value
                
                // Create rich display text with metadata
                let displayText = '';
                
                // Add architecture icon
                const archIcon = getArchitectureIcon(model.architecture);
                if (archIcon) {
                    displayText += archIcon + ' ';
                }
                
                // Add model name and key details - handle multi-part models
                const modelName = model.displayName || model.name.replace('.gguf', '');
                const params = model.parameters !== 'Unknown' ? model.parameters : '';
                const quant = model.quantization !== 'Unknown' ? model.quantization : '';
                const context = model.contextLength !== 'Unknown' ? model.contextLength : '';
                const sizeMB = model.fileSizeMB ? `${model.fileSizeMB}MB` : '';
                
                // Build compact description
                displayText += modelName;
                
                // Add multi-part indicator if applicable
                if (model.isMultiPart && !model.allPartsPresent) {
                    displayText = iconSpan('warning', 14) + ' ' + displayText;
                }
                
                if (params || quant || context) {
                    const details = [];
                    if (params) details.push(params);
                    if (quant) {
                        const quality = model.quantizationQuality ? `${quant} (${model.quantizationQuality})` : quant;
                        details.push(quality);
                    }
                    if (context) details.push(`${context} ctx`);
                    if (sizeMB) details.push(sizeMB);
                    
                    displayText += ` - ${details.join(', ')}`;
                }
                
                // Add special capabilities as badges
                if (model.specialCapabilities && model.specialCapabilities.length > 0) {
                    const capabilities = model.specialCapabilities.slice(0, 2); // Limit to 2 to avoid cluttering
                    displayText += ` [${capabilities.join(', ')}]`;
                }
                
                option.textContent = displayText;
                
                // Add tooltip for multi-part models
                if (model.isMultiPart) {
                    if (model.allPartsPresent) {
                        option.title = `Multi-part model: ${model.totalParts} parts combined (${sizeMB} total)`;
                    } else {
                        option.title = `Incomplete multi-part model: ${model.availableParts}/${model.totalParts} parts available`;
                    }
                }
                
                // Store metadata as data attributes for potential future use
                option.dataset.architecture = model.architecture;
                option.dataset.parameters = model.parameters;
                option.dataset.quantization = model.quantization;
                option.dataset.contextLength = model.contextLength;
                option.dataset.capabilities = JSON.stringify(model.specialCapabilities || []);
                
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
        option.textContent = model.displayName || model.relativePath || model.name;
        
        // Add tooltip for multi-part draft models
        if (model.isMultiPart) {
            const sizeMB = model.fileSizeMB ? `${model.fileSizeMB}MB` : '';
            if (model.allPartsPresent) {
                option.title = `Multi-part draft model: ${model.totalParts} parts combined (${sizeMB} total)`;
            } else {
                option.title = `Incomplete multi-part draft model: ${model.availableParts}/${model.totalParts} parts available`;
            }
        }
        
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
            const displayName = model.displayName || model.relativePath || model.name;
            option.textContent = `${displayName} (potential draft)`;
            
            // Add tooltip for potential multi-part draft models
            if (model.isMultiPart) {
                const sizeMB = model.fileSizeMB ? `${model.fileSizeMB}MB` : '';
                if (model.allPartsPresent) {
                    option.title = `Potential multi-part draft model: ${model.totalParts} parts combined (${sizeMB} total)`;
                } else {
                    option.title = `Incomplete potential multi-part draft model: ${model.availableParts}/${model.totalParts} parts available`;
                }
            }
            
            draftModelPathSelect.appendChild(option);
        });
    }
}

// Load configurations from server
async function loadConfigurations() {
    try {
        const response = await fetch('/api/configs');
        if (response.ok) {
            const data = await response.json();
            // Convert array to object format for backward compatibility
            configurations = {};
            data.configurations.forEach(config => {
                configurations[config.id] = config;
            });
            console.log(`Loaded ${data.configurations.length} configurations from server`);
        } else {
            console.error('Failed to load configurations from server, trying localStorage fallback');
            loadConfigurationsFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading configurations from server, trying localStorage fallback:', error);
        loadConfigurationsFromLocalStorage();
    }
    return configurations;
}

// Fallback: Load configurations from localStorage
function loadConfigurationsFromLocalStorage() {
    const savedConfigs = localStorage.getItem('llamaCppConfigs');
    if (savedConfigs) {
        const localConfigs = JSON.parse(savedConfigs);
        // Convert old format to new format if needed
        configurations = {};
        Object.entries(localConfigs).forEach(([id, config]) => {
            configurations[id] = {
                id: id,
                name: config.name || 'Unnamed Configuration',
                description: config.description || '',
                parameters: config.parameters || config, // Handle both old and new format
                created: config.created || new Date().toISOString(),
                modified: config.modified || new Date().toISOString()
            };
        });
        
        // Trigger migration if we found localStorage data
        if (Object.keys(configurations).length > 0) {
            console.log('Found localStorage configurations, triggering migration...');
            migrateConfigurationsToServer();
        }
    } else {
        configurations = {};
    }
}

// Save configuration to server
async function saveConfiguration(configData) {
    try {
        const method = configData.id ? 'PUT' : 'POST';
        const url = configData.id ? `/api/configs/${configData.id}` : '/api/configs';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Update local cache
                configurations[result.configuration.id] = result.configuration;
                return result.configuration;
            } else {
                throw new Error(result.error || 'Save failed');
            }
        } else {
            throw new Error(`Server error: ${response.status}`);
        }
    } catch (error) {
        console.error('Error saving configuration to server, falling back to localStorage:', error);
        // Fallback to localStorage
        return saveConfigurationToLocalStorage(configData);
    }
}

// Fallback: Save to localStorage
function saveConfigurationToLocalStorage(configData) {
    if (!configData.id) {
        configData.id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    configurations[configData.id] = configData;
    localStorage.setItem('llamaCppConfigs', JSON.stringify(configurations));
    return configData;
}

// Delete configuration from server
async function deleteConfiguration(configId) {
    try {
        const response = await fetch(`/api/configs/${configId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Remove from local cache
                delete configurations[configId];
                return true;
            } else {
                throw new Error(result.error || 'Delete failed');
            }
        } else {
            throw new Error(`Server error: ${response.status}`);
        }
    } catch (error) {
        console.error('Error deleting configuration from server:', error);
        // Still try to remove from local cache
        delete configurations[configId];
        localStorage.setItem('llamaCppConfigs', JSON.stringify(configurations));
        return false;
    }
}

// Migrate configurations from localStorage to server
async function migrateConfigurationsToServer() {
    try {
        const localConfigs = localStorage.getItem('llamaCppConfigs');
        if (!localConfigs) {
            return;
        }
        
        const response = await fetch('/api/configs/migrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                configurations: JSON.parse(localConfigs)
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`Migration completed: ${result.migrated_count} configurations migrated`);
            if (result.errors && result.errors.length > 0) {
                console.warn('Migration warnings:', result.errors);
            }
            
            // Create backup of localStorage and reload from server
            localStorage.setItem('llamaCppConfigs_backup', localConfigs);
            localStorage.setItem('llamaCppConfigs_migrated', 'true');
            
            // Reload configurations from server
            await loadConfigurations();
            
            return result;
        } else {
            throw new Error('Migration failed');
        }
    } catch (error) {
        console.error('Error migrating configurations:', error);
        return null;
    }
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


// Load configuration values into form
function loadConfiguration(configId) {
    if (!configId || !configurations[configId]) return;
    
    const configData = configurations[configId];
    currentConfigId = configId;
    
    // Handle both old and new configuration format
    const config = configData.parameters || configData; // New format has parameters object, old format is direct
    
    // Load values into form fields
    // Note: serverPath is now loaded separately via loadServerPath()
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
    if (config.noContextShift !== undefined && noContextShiftCheckbox) noContextShiftCheckbox.checked = config.noContextShift;
    if (config.nPredict !== undefined && nPredictInput) nPredictInput.value = config.nPredict || '';
    if (config.nParallel !== undefined && nParallelInput) nParallelInput.value = config.nParallel || '';
    if (config.slotPromptSimilarity !== undefined && slotPromptSimilarityInput) slotPromptSimilarityInput.value = config.slotPromptSimilarity || '';
    if (config.slotSavePath !== undefined && slotSavePathInput) slotSavePathInput.value = config.slotSavePath || '';
    if (config.noMmap !== undefined) noMmapCheckbox.checked = config.noMmap;
    if (config.numa !== undefined) numaSelect.value = config.numa;

    // Load new Advanced Memory parameters
    if (config.cacheTypeK !== undefined) cacheTypeKSelect.value = config.cacheTypeK;
    if (config.cacheTypeV !== undefined) cacheTypeVSelect.value = config.cacheTypeV;
    if (config.kvOffload !== undefined && kvOffloadCheckbox) kvOffloadCheckbox.checked = config.kvOffload;
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

    // Load Extended Context & Vision parameters
    if (config.ropeScaling !== undefined && ropeScalingSelect) ropeScalingSelect.value = config.ropeScaling;
    if (config.ropeScale !== undefined && ropeScaleInput) ropeScaleInput.value = config.ropeScale || '';
    if (config.yarnOrigCtx !== undefined && yarnOrigCtxInput) yarnOrigCtxInput.value = config.yarnOrigCtx || '';
    if (config.imageMinTokens !== undefined && imageMinTokensInput) imageMinTokensInput.value = config.imageMinTokens || '';
    if (config.imageMaxTokens !== undefined && imageMaxTokensInput) imageMaxTokensInput.value = config.imageMaxTokens || '';

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
    console.log('DEBUG: launchServer function called');
    
    const serverPath = serverPathInput.value.trim();
    console.log('DEBUG: serverPath:', serverPath);
    
    if (!serverPath) {
        alert('Please enter the path to llama-server.exe');
        return;
    }
    
    // Check if model is selected
    console.log('DEBUG: modelPathSelect.value:', modelPathSelect.value);
    if (!modelPathSelect.value.trim()) {
        alert('Please select a model from the dropdown');
        return;
    }
    
    console.log('DEBUG: Validation passed, proceeding with launch');
    
    // Declare config variable outside try-catch blocks for proper scope
    let config;
    
    try {
        // Collect all configuration values
        console.log('DEBUG: Starting configuration collection...');
        config = {
            modelPath: modelPathSelect.value.trim(),  // Use select value instead of input value
            ngl: parseInt(nglInput.value) || 0,
            threads: parseInt(threadsInput.value) || 1,
        };
        console.log('DEBUG: Basic config collected:', config);
        
        // Add sampling parameters
        console.log('DEBUG: Adding sampling parameters...');
        config.temp = parseFloat(tempInput.value) || 0;
        config.topK = parseInt(topKInput.value) || 0;
        config.topP = parseFloat(topPInput.value) || 0;
        config.repeatPenalty = parseFloat(repeatPenaltyInput.value) || 0;
        console.log('DEBUG: Sampling parameters added');
        
        // Add other parameters
        console.log('DEBUG: Adding other parameters...');
        config.mlock = mlockCheckbox.checked;
        config.swaFull = swaFullCheckbox.checked;
        config.contextSize = parseInt(contextSizeInput.value) || 1;
        config.nCpuMoe = parseInt(nCpuMoeInput.value) || 0;
        config.cpuMoe = cpuMoeCheckbox.checked;
        config.ctkEnable = ctkEnableCheckbox.checked;
        config.contextTokenKey = contextTokenKeySelect.value;
        config.contextTokenValue = contextTokenValueSelect.value;
        config.fastAttention = fastAttentionCheckbox.checked;
        config.jinja = jinjaCheckbox.checked;
        
        // New Multi-GPU parameters
        console.log('DEBUG: Adding Multi-GPU parameters...');
        config.tensorSplit = tensorSplitInput.value;
        config.mainGpu = mainGpuSelect.value;
        config.splitMode = splitModeSelect.value;
        
        // New Performance parameters
        console.log('DEBUG: Adding Performance parameters...');
        config.batchSize = parseInt(batchSizeInput.value) || 0;
        config.ubatchSize = parseInt(ubatchSizeInput.value) || 0;
        config.contBatching = contBatchingCheckbox.checked;
        config.noMmap = noMmapCheckbox.checked;
        config.numa = numaSelect.value;
        
        // New Advanced Memory parameters
        console.log('DEBUG: Adding Advanced Memory parameters...');
        config.cacheTypeK = cacheTypeKSelect.value;
        config.cacheTypeV = cacheTypeVSelect.value;
        config.keepModels = parseInt(keepModelsInput.value) || 0;
        config.memoryTest = memoryTestCheckbox.checked;
        
        // New Server Network parameters
        console.log('DEBUG: Adding Server Network parameters...');
        config.serverHost = serverHostInput.value;
        config.serverPort = parseInt(serverPortInput.value) || 0;
        config.readTimeout = parseInt(readTimeoutInput.value) || 0;
        config.writeTimeout = parseInt(writeTimeoutInput.value) || 0;
        config.apiKey = apiKeyInput.value;
        
        // Draft Model parameters
        console.log('DEBUG: Adding Draft Model parameters...');
        config.draftModelEnable = draftModelEnableCheckbox.checked;
        config.draftModelPath = draftModelPathSelect.value;
        config.draftGpuLayers = parseInt(draftGpuLayersInput.value) || 0;
        config.draftContextSize = parseInt(draftContextSizeInput.value) || 0;
        config.draftMaxTokens = parseInt(draftMaxTokensInput.value) || 0;
        config.draftMinTokens = parseInt(draftMinTokensInput.value) || 0;
        config.draftPMin = parseFloat(draftPMinInput.value) || 0;
        
        console.log('DEBUG: Configuration object completed:', config);
        
    } catch (configError) {
        console.error('DEBUG: Error collecting configuration:', configError);
        alert('Error collecting configuration: ' + configError.message);
        return;
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

        if (config.noContextShift) {
            args.push('--no-context-shift');
        }

        if (config.nPredict && config.nPredict !== 0) {
            args.push('-n', config.nPredict.toString());
        }

        if (config.nParallel > 1) {
            args.push('-np', config.nParallel.toString());
        }

        if (config.slotPromptSimilarity > 0) {
            args.push('-sps', config.slotPromptSimilarity.toString());
        }

        if (config.slotSavePath && config.slotSavePath.trim()) {
            args.push('--slot-save-path', config.slotSavePath.trim());
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

        if (config.kvOffload) {
            args.push('-nkvo');
        }

        if (config.keepModels > 0) {
            args.push('--keep', config.keepModels.toString());
        }
        
        if (config.memoryTest) {
            args.push('--memory-test');
        }

        // Extended Context & Vision parameters
        if (config.ropeScaling && config.ropeScaling.trim()) {
            args.push('--rope-scaling', config.ropeScaling.trim());
        }

        if (config.ropeScale > 0) {
            args.push('--rope-scale', config.ropeScale.toString());
        }

        if (config.yarnOrigCtx > 0) {
            args.push('--yarn-orig-ctx', config.yarnOrigCtx.toString());
        }

        if (config.imageMinTokens > 0) {
            args.push('--image-min-tokens', config.imageMinTokens.toString());
        }

        if (config.imageMaxTokens > 0) {
            args.push('--image-max-tokens', config.imageMaxTokens.toString());
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
            showContextVisualization(); // Show context visualization when server starts
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
            socket.emit('instance:join', 'default-llamacpp');
        });
        
        socket.on('log-stream', (data) => {
            // Stream logs to output box
            if (data && data.data) {
                showOutput(data.data.trim());
            }
        });
        
        socket.on('token-speed', (data) => {
            console.log('DEBUG: Received token-speed event:', data);
            // Update token generation speed display
            if (data && data.speed !== undefined) {
                updateTokenSpeed(data.speed);
            }
        });
        
        socket.on('context-update', (data) => {
            console.log('DEBUG: Received context-update event:', data);
            // Update context visualization
            if (data && data.used !== undefined && data.total !== undefined) {
                try {
                    updateContextVisualization(data.used, data.total, parseFloat(data.percentage));
                } catch (error) {
                    console.log('DEBUG: Error in context update:', error.message);
                }
            }
        });
        
        socket.on('context-size', (data) => {
            console.log('DEBUG: Received context-size event:', data);
            // Store context size for calculations
            if (data && data.contextSize !== undefined) {
                contextSize = data.contextSize;
                // Show context visualization when we know the context size
                try {
                    showContextVisualization();
                } catch (error) {
                    console.log('DEBUG: Context visualization not available:', error.message);
                }
            }
        });
        
        socket.on('server-ended', (data) => {
            console.log('Server process ended:', data.message);
            showOutput('Server process has ended');
            updateStatus(false);
            updateButtonStates(false);
            try { hideContextVisualization(); } catch(e) {} // Hide context visualization when server ends
        });
        
        socket.on('server-error', (data) => {
            console.error('Server error:', data.message);
            showOutput('Server error: ' + data.message);
        });

        socket.on('instance:status', (data) => {
            if (data && data.instanceId && data.status) {
                updateInstanceStatus(data.instanceId, data.status);
                if (data.instanceId === 'default-llamacpp') {
                    if (data.status === 'RUNNING') {
                        updateStatus(true);
                    } else if (data.status === 'STOPPED' || data.status === 'IDLE' || data.status === 'ERROR') {
                        updateStatus(false);
                    }
                }
            }
        });

        socket.on('instance:ready', (data) => {
            if (data && data.instanceId) {
                updateInstanceStatus(data.instanceId, 'RUNNING');
            }
        });

        socket.on('instance:error', (data) => {
            if (data && data.instanceId) {
                updateInstanceStatus(data.instanceId, 'ERROR');
            }
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            showOutput('Disconnected from server for real-time logging');
        });

        // Setup updater socket events
        setupUpdaterSocketEvents();
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
            try { hideContextVisualization(); } catch(e) {} // Hide context visualization when server stops
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
    if (!configList) return;
    configList.innerHTML = '';
    
    const configIds = Object.keys(configurations);
    if (configIds.length === 0) {
        configList.innerHTML = '<div class="empty-configs">No configurations saved</div>';
        return;
    }
    
    // Sort configurations by name for consistent display
    const sortedConfigs = configIds
        .map(id => configurations[id])
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    sortedConfigs.forEach(config => {
        const configItem = document.createElement('div');
        configItem.className = 'config-item';
        if (currentConfigId === config.id) {
            configItem.classList.add('active');
        }
        
        configItem.innerHTML = `
            <span class="config-item-name">${config.name || 'Unnamed Configuration'}</span>
            <div class="config-item-actions">
                <button class="config-item-btn edit-btn" data-id="${config.id}" data-name="${config.name}">${icon('edit', 14)}</button>
                <button class="config-item-btn delete-btn" data-id="${config.id}" data-name="${config.name}">${icon('trash', 14)}</button>
            </div>
        `;
        
        configList.appendChild(configItem);
    });
    
    // Add event listeners for config items
    document.querySelectorAll('.config-item-btn.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const configId = btn.dataset.id || btn.dataset.name; // Handle both old and new format
            editConfiguration(configId);
        });
    });
    
    document.querySelectorAll('.config-item-btn.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const configId = btn.dataset.id || btn.dataset.name; // Handle both old and new format
            deleteConfigurationUI(configId);
        });
    });
    
    // Add click event for selecting configurations
    document.querySelectorAll('.config-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('config-item-btn')) return;
            const configId = item.querySelector('.config-item-btn').dataset.id ||
                           item.querySelector('.config-item-name').textContent; // Handle both old and new format
            selectConfiguration(configId);
        });
    });
}

// Select a configuration to use
function selectConfiguration(configId) {
    if (configurations[configId]) {
        loadConfiguration(configId);
        currentConfigId = configId;
        renderConfigList();
    }
}

// Edit a configuration
function editConfiguration(configId) {
    if (!configElementsExist) return;
    const config = configurations[configId];
    if (config) {
        configFormTitle.textContent = 'Edit Configuration';
        configNameInput.value = config.name || '';
        configFormContainer.showModal();
        currentConfigId = configId;
    }
}

// Save a new or edited configuration (UI function)
async function saveConfigurationUI() {
    if (!configElementsExist) return;
    const configName = configNameInput.value.trim();
    
    if (!configName) {
        alert('Please enter a configuration name');
        return;
    }
    
    try {
        // Collect all parameters from the form
        const parameters = {
            modelPath: modelPathSelect.value,
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
            // Multi-GPU parameters
            tensorSplit: tensorSplitInput.value,
            mainGpu: mainGpuSelect.value,
            splitMode: splitModeSelect.value,
            // Performance parameters
            batchSize: parseInt(batchSizeInput.value) || 0,
            ubatchSize: parseInt(ubatchSizeInput.value) || 0,
            contBatching: contBatchingCheckbox.checked,
            noContextShift: noContextShiftCheckbox ? noContextShiftCheckbox.checked : false,
            nPredict: nPredictInput ? parseInt(nPredictInput.value) || 0 : 0,
            nParallel: nParallelInput ? parseInt(nParallelInput.value) || 0 : 0,
            slotPromptSimilarity: slotPromptSimilarityInput ? parseFloat(slotPromptSimilarityInput.value) || 0 : 0,
            slotSavePath: slotSavePathInput ? slotSavePathInput.value : '',
            noMmap: noMmapCheckbox.checked,
            numa: numaSelect.value,
            // Advanced Memory parameters
            cacheTypeK: cacheTypeKSelect.value,
            cacheTypeV: cacheTypeVSelect.value,
            kvOffload: kvOffloadCheckbox ? kvOffloadCheckbox.checked : false,
            keepModels: parseInt(keepModelsInput.value) || 0,
            memoryTest: memoryTestCheckbox.checked,
            // Server Network parameters
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
            draftPMin: parseFloat(draftPMinInput.value) || 0,
            // Extended Context & Vision parameters
            ropeScaling: ropeScalingSelect ? ropeScalingSelect.value : '',
            ropeScale: ropeScaleInput ? parseFloat(ropeScaleInput.value) || 0 : 0,
            yarnOrigCtx: yarnOrigCtxInput ? parseInt(yarnOrigCtxInput.value) || 0 : 0,
            imageMinTokens: imageMinTokensInput ? parseInt(imageMinTokensInput.value) || 0 : 0,
            imageMaxTokens: imageMaxTokensInput ? parseInt(imageMaxTokensInput.value) || 0 : 0
        };
        
        // Create configuration object
        // Only include ID if we're editing an existing configuration
        const configData = {
            name: configName,
            description: configurations[currentConfigId]?.description || '',
            parameters: parameters
        };
        
        // Add ID only if editing existing config
        if (currentConfigId) {
            configData.id = currentConfigId;
        }
        
        console.log('Saving configuration:', configData);
        
        // Save to server
        const savedConfig = await saveConfiguration(configData);
        if (savedConfig) {
            // Update local cache
            configurations[savedConfig.id] = savedConfig;
            currentConfigId = savedConfig.id;
            
            // Close the form and refresh the list
            configFormContainer.close();
            renderConfigList();
            
            // Clear the form and reset for next configuration
            configNameInput.value = '';
            configFormTitle.textContent = 'Create New Configuration';
            currentConfigId = null;
            
            console.log(`Configuration '${configName}' saved successfully`);
        } else {
            throw new Error('Failed to save configuration');
        }
        
    } catch (error) {
        console.error('Error saving configuration:', error);
        alert(`Error saving configuration: ${error.message}. Please try again.`);
    }
}

// Cancel configuration editing
function cancelConfiguration() {
    if (!configElementsExist) return;
    configFormContainer.close();
    configNameInput.value = '';
    configFormTitle.textContent = 'Create New Configuration';
    currentConfigId = null;
}

// Delete a configuration (UI function)
async function deleteConfigurationUI(configId) {
    const config = configurations[configId];
    const configName = config?.name || configId;
    
    if (confirm(`Are you sure you want to delete the configuration "${configName}"?`)) {
        try {
            const success = await deleteConfiguration(configId);
            if (success) {
                renderConfigList();
                
                // If we just deleted the current config, clear the form
                if (currentConfigId === configId) {
                    currentConfigId = null;
                    // Clear all fields to defaults
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
                
                console.log(`Configuration '${configName}' deleted successfully`);
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('Error deleting configuration:', error);
            alert('Error deleting configuration. Please try again.');
        }
    }
}

// Add a new configuration
function addNewConfiguration() {
    if (!configElementsExist) return;
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

function applyHighRamHybrid() {
    nglInput.value = '38';  // Conservative GPU layers for 24GB cards
    tensorSplitInput.value = '0.5,0.5';  // Even split across dual 3090s
    splitModeSelect.value = 'layer';
    threadsInput.value = '18';  // Utilize DDR5 for remaining layers
    mlockCheckbox.checked = true;  // Enable memory locking for DDR5
    contextSizeInput.value = '32768';  // Can go higher with abundant RAM
    batchSizeInput.value = '1024';
    ubatchSizeInput.value = '256';
    fastAttentionCheckbox.checked = true;
    noMmapCheckbox.checked = false;  // Use mmap with abundant RAM
    showMultiGpuWarning(true);
}

function applyQwen35Preset() {
    // Optimal settings for Qwen 3.5 models (thinking + chat mode)
    // Thinking mode temp: 0.6 | Top-K: 20 | Top-P: 0.95 per Qwen official docs
    nglInput.value = '99';
    contextSizeInput.value = '32768';
    batchSizeInput.value = '512';
    ubatchSizeInput.value = '512';
    tempInput.value = '0.6';
    topKInput.value = '20';
    topPInput.value = '0.95';
    repeatPenaltyInput.value = '1.0';
    fastAttentionCheckbox.checked = true;
    jinjaCheckbox.checked = true;  // use embedded chat template (ChatML)
    cacheTypeKSelect.value = 'bf16';
    cacheTypeVSelect.value = 'bf16';
    mainGpuSelect.value = '0';
    tensorSplitInput.value = '';
    splitModeSelect.value = 'none';
    showMultiGpuWarning(false);
}

function applyGemma4Preset() {
    // Google's recommended settings for Gemma 4 (text + vision)
    // Temp: 1.0 | Top-K: 64 | Top-P: 0.95 per Google's official defaults
    // batch/ubatch 2048 required — image tokens must fit in a single ubatch
    nglInput.value = '99';
    contextSizeInput.value = '32768';
    batchSizeInput.value = '2048';
    ubatchSizeInput.value = '2048';
    tempInput.value = '1.0';
    topKInput.value = '64';
    topPInput.value = '0.95';
    repeatPenaltyInput.value = '1.0';
    fastAttentionCheckbox.checked = true;
    jinjaCheckbox.checked = true;
    cacheTypeKSelect.value = 'q4_0';
    cacheTypeVSelect.value = 'q4_0';
    mainGpuSelect.value = '0';
    tensorSplitInput.value = '';
    splitModeSelect.value = 'none';
    // Vision: set image token budget to maximum supported value
    if (imageMinTokensInput) imageMinTokensInput.value = '1120';
    if (imageMaxTokensInput) imageMaxTokensInput.value = '1120';
    showMultiGpuWarning(false);
}

function applyAgenticCodingPreset() {
    // Optimized for coding agents (OpenCode, Cline, Continue.dev, etc.)
    // Low temp for determinism, parallel slots for concurrent tool calls,
    // aggressive cache reuse, bounded generation to prevent runaway output
    nglInput.value = '99';
    contextSizeInput.value = '65536';
    batchSizeInput.value = '2048';
    ubatchSizeInput.value = '512';
    tempInput.value = '0.3';
    topKInput.value = '20';
    topPInput.value = '0.95';
    repeatPenaltyInput.value = '1.0';
    fastAttentionCheckbox.checked = true;
    contBatchingCheckbox.checked = true;
    jinjaCheckbox.checked = true;
    if (noContextShiftCheckbox) noContextShiftCheckbox.checked = false;
    if (nPredictInput) nPredictInput.value = '4096';
    if (nParallelInput) nParallelInput.value = '4';
    if (slotPromptSimilarityInput) slotPromptSimilarityInput.value = '0.75';
    cacheTypeKSelect.value = 'q4_0';
    cacheTypeVSelect.value = 'q4_0';
    mainGpuSelect.value = '0';
    tensorSplitInput.value = '';
    splitModeSelect.value = 'none';
    showMultiGpuWarning(false);
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
        output.push('Detected small model (7B-8B): High Performance Single GPU preset recommended');
        if (parseInt(batchSizeInput.value) < 2048) batchSizeInput.value = '2048';
        if (parseInt(ubatchSizeInput.value) < 512) ubatchSizeInput.value = '512';
    } else if (modelName.includes('13b') || modelName.includes('14b') || modelName.includes('15b')) {
        output.push('Detected medium model (13B-15B): Consider Balanced Dual GPU for better performance');
    } else if (modelName.includes('30b') || modelName.includes('34b') || modelName.includes('70b') || modelName.includes('72b')) {
        output.push('Detected large model (30B+): Large Model Dual GPU preset strongly recommended');
        if (parseInt(contextSizeInput.value) > 8192) {
            output.push('Large context with big model may require CPU offloading');
        }
    }
    
    // Check for multi-part models and add VRAM recommendations
    const selectedOption = modelPathSelect.options[modelPathSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset) {
        const isMultiPart = selectedOption.text.includes('(') && selectedOption.text.includes('parts)');
        const fileSizeText = selectedOption.text.match(/(\d+(?:,\d+)*)\s*MB/);
        
        if (isMultiPart && fileSizeText) {
            const fileSizeMB = parseInt(fileSizeText[1].replace(/,/g, ''));
            const fileSizeGB = Math.round(fileSizeMB / 1024);
            
            if (fileSizeGB > 50) {
                output.push(`Multi-part model detected (${fileSizeGB}GB): Consider reducing GPU layers for 24GB cards`);
                
                // Auto-suggest conservative GPU layer count for large models
                if (parseInt(nglInput.value) >= 99 && fileSizeGB > 50) {
                    const suggestedLayers = fileSizeGB > 80 ? 25 : fileSizeGB > 60 ? 35 : 45;
                    output.push(`Recommended GPU layers: ${suggestedLayers} (currently set to ${nglInput.value})`);
                    
                    // Detect high-RAM systems and recommend hybrid loading
                    if (fileSizeGB > 60 && navigator.deviceMemory && navigator.deviceMemory >= 64) {
                        output.push(`High RAM system detected (>=64GB): Try "High RAM Hybrid (128GB+)" preset for optimal performance`);
                    } else if (fileSizeGB > 60) {
                        output.push(`For large models like this, consider "High RAM Hybrid (128GB+)" preset if you have >=64GB DDR5 RAM`);
                    }
                }
            }
        }
    }
    
    // Quantization recommendations
    if (modelName.includes('q2_k') || modelName.includes('q3_k')) {
        output.push('Low quantization detected: Consider higher batch sizes for better throughput');
    } else if (modelName.includes('q8_0') || modelName.includes('f16') || modelName.includes('f32')) {
        output.push('High precision model: May require reduced batch size or CPU offloading');
    }
    
    // Display recommendations
    if (output.length > 0) {
        showOutput('=== Model Analysis & Recommendations ===');
        output.forEach(msg => showOutput(msg));
        showOutput('=====================================');
    }
}

// Initialize the application
function renderDataIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        const size = el.classList.contains('banner-icon') ? 20 : 16;
        el.innerHTML = icon(name, size);
        el.classList.add('icon');
    });
}

async function init() {
    renderDataIcons();

    const savedServerPath = loadServerPath();
    if (savedServerPath) {
        serverPathInput.value = savedServerPath;
    }

    // Load models directory settings first (before fetching models)
    await loadModelsDirectorySettings();

    // Load configurations asynchronously
    await loadConfigurations();

    await fetchModels();

    // Set up event listeners for models directory settings
    if (modelsSourceSelect) {
        modelsSourceSelect.addEventListener('change', onModelsSourceChange);
    }
    if (customModelsPathInput) {
        customModelsPathInput.addEventListener('input', onCustomPathChange);
    }
    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener('click', refreshModelsHandler);
    }

    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfigurationUI);
    }
    if (cancelConfigBtn) {
        cancelConfigBtn.addEventListener('click', cancelConfiguration);
    }

    // Set up event listeners for context token parameters
    ctkEnableCheckbox.addEventListener('change', updateContextTokenEnableState);

    // Set up event listeners for draft model parameters
    draftModelEnableCheckbox.addEventListener('change', updateDraftModelEnableState);
    
    // Set up event listener for context size changes
    contextSizeInput.addEventListener('change', function() {
        const newContextSize = parseInt(contextSizeInput.value) || 0;
        if (newContextSize > 0) {
            contextSize = newContextSize;
            console.log(`DEBUG: Context size updated to ${contextSize}`);
        }
    });
    
    // Set up event listeners for launching and stopping
    launchBtn.addEventListener('click', function() {
        console.log('DEBUG: Launch button clicked!');
        launchServer();
    });
    stopBtn.addEventListener('click', stopServer);
    openServerBtn.addEventListener('click', openServerInBrowser);
    
    // Demo context visualization (temporary for testing)
    const demoContextBtn = document.getElementById('demoContextBtn');
    if (demoContextBtn) {
        demoContextBtn.addEventListener('click', function() {
            // Simulate context progression
            showContextVisualization();
            let step = 0;
            const steps = [
                { used: 1024, total: 32768, percentage: 3.1 },
                { used: 8192, total: 32768, percentage: 25.0 },
                { used: 16384, total: 32768, percentage: 50.0 },
                { used: 26214, total: 32768, percentage: 80.0 }, // Warning level
                { used: 31129, total: 32768, percentage: 95.0 }, // Critical level
            ];
            
            const demoInterval = setInterval(() => {
                if (step < steps.length) {
                    const stepData = steps[step];
                    updateContextVisualization(stepData.used, stepData.total, stepData.percentage);
                    step++;
                } else {
                    clearInterval(demoInterval);
                }
            }, 1000);
        });
    }
    
    // Test context visualization button
    if (testContextBtn) {
        testContextBtn.addEventListener('click', function() {
            // Simple test - show context visualization with sample data
            showContextVisualization();
            updateContextVisualization(12450, 16384, 76.0); // Example: 76% usage
        });
    }
    
    // Set up event listeners for preset buttons
    presetHighPerfBtn.addEventListener('click', applyHighPerformanceSingleGPU);
    presetBalancedDualBtn.addEventListener('click', applyBalancedDualGPU);
    presetLargeModelBtn.addEventListener('click', applyLargeModelDualGPU);
    presetCpuOffloadBtn.addEventListener('click', applyCpuOffloadHybrid);
    presetHighRamHybridBtn.addEventListener('click', applyHighRamHybrid);
    if (presetQwen35Btn) presetQwen35Btn.addEventListener('click', applyQwen35Preset);
    if (presetGemma4Btn) presetGemma4Btn.addEventListener('click', applyGemma4Preset);
    if (presetAgenticCodingBtn) presetAgenticCodingBtn.addEventListener('click', applyAgenticCodingPreset);
    
    // Initialize tooltips
    initTooltips();
    
    // Initialize tabs
    initTabs();
    initInstanceTabs();

    // Initialize updater module
    initUpdater();

    // Initialize WebSocket connection (needed for updater progress events)
    initWebSocket();

    // Set up tensor split change handler to show/hide warning
    tensorSplitInput.addEventListener('input', function() {
        const hasTensorSplit = this.value && this.value.trim().includes(',');
        showMultiGpuWarning(hasTensorSplit);
    });
    
    // Set up model change handler for automatic recommendations
    modelPathSelect.addEventListener('change', analyzeModelAndRecommendSettings);

    modelPathSelect.addEventListener('change', function() {
        const selectedOption = modelPathSelect.options[modelPathSelect.selectedIndex];
        const modelName = selectedOption && selectedOption.value
            ? selectedOption.textContent.replace(/\.gguf$/i, '')
            : 'Untitled';
        updateInstanceModelName('default-llamacpp', modelName);
    });
    
    // Set up server path auto-save when changed
    serverPathInput.addEventListener('input', function() {
        saveServerPath(this.value);
    });
    serverPathInput.addEventListener('blur', function() {
        saveServerPath(this.value);
    });
    
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

// Helper function to update temperature indicators
function updateTemperatureIndicator(elementId, temperature) {
    const indicator = document.getElementById(elementId);
    if (!indicator) return;
    
    let tempClass = 'normal';
    let tempText = '';
    
    if (temperature > 0) {
        tempText = `${Math.round(temperature)}°C`;
        if (temperature > 80) {
            tempClass = 'hot';
        } else if (temperature > 65) {
            tempClass = 'warm';
        } else {
            tempClass = 'normal';
        }
    }
    
    indicator.className = `temp-indicator ${tempClass}`;
    indicator.textContent = tempText;
}

// Helper function to update CPU cores display
function updateCPUCores(cores) {
    const container = document.getElementById('cpuCoresBars');
    if (!container || !cores || cores.length === 0) return;
    
    // Create cores grid if it doesn't exist
    let coresGrid = container.querySelector('.cpu-cores-grid');
    if (!coresGrid) {
        coresGrid = document.createElement('div');
        coresGrid.className = 'cpu-cores-grid';
        container.appendChild(coresGrid);
    }
    
    // Clear existing cores
    coresGrid.innerHTML = '';
    
    // Create core bars
    cores.forEach((core, index) => {
        const coreBar = document.createElement('div');
        coreBar.className = 'cpu-core-bar';
        
        coreBar.innerHTML = `
            <div class="cpu-core-label">C${index}</div>
            <div class="cpu-core-progress">
                <div class="cpu-core-fill" style="height: ${Math.min(core.usage || 0, 100)}%"></div>
            </div>
        `;
        
        coresGrid.appendChild(coreBar);
    });
}

// Helper function to update GPU metrics display
function updateGPUMetrics(gpus) {
    const container = document.getElementById('gpuMetricsContainer');
    if (!container) return;
    
    // Clear existing GPU cards
    container.innerHTML = '';
    
    // Create GPU cards
    gpus.forEach((gpu, index) => {
        const gpuCard = document.createElement('div');
        gpuCard.className = 'gpu-card';
        
        const tempClass = gpu.temperature > 80 ? 'hot' : gpu.temperature > 65 ? 'warm' : 'normal';
        const thermalWarning = gpu.thermalThrottling ? ' ' + icon('warning', 12) : '';
        
        gpuCard.innerHTML = `
            <div class="gpu-header">
                <div class="gpu-name">GPU ${index}: ${gpu.name || 'Unknown'}</div>
                <div class="gpu-temp ${tempClass}">${Math.round(gpu.temperature || 0)}°C${thermalWarning}</div>
            </div>
            <div class="gpu-metrics-grid">
                <div class="gpu-metric-item">
                    <div class="gpu-metric-label">Utilization</div>
                    <div class="gpu-metric-value">${Math.round(gpu.utilizationGpu || 0)}%</div>
                    <div class="gpu-progress-bar">
                        <div class="gpu-progress-fill" style="width: ${gpu.utilizationGpu || 0}%"></div>
                    </div>
                </div>
                <div class="gpu-metric-item">
                    <div class="gpu-metric-label">Memory</div>
                    <div class="gpu-metric-value">${Math.round(gpu.memoryUsage || 0)}%</div>
                    <div class="gpu-progress-bar">
                        <div class="gpu-progress-fill" style="width: ${gpu.memoryUsage || 0}%"></div>
                    </div>
                </div>
                <div class="gpu-metric-item">
                    <div class="gpu-metric-label">Power</div>
                    <div class="gpu-metric-value">${Math.round(gpu.powerDraw || 0)}W</div>
                    <div class="gpu-progress-bar">
                        <div class="gpu-progress-fill" style="width: ${gpu.powerUsage || 0}%"></div>
                    </div>
                </div>
                <div class="gpu-metric-item">
                    <div class="gpu-metric-label">Memory BW</div>
                    <div class="gpu-metric-value">${Math.round(gpu.utilizationMemory || 0)}%</div>
                    <div class="gpu-progress-bar">
                        <div class="gpu-progress-fill" style="width: ${gpu.utilizationMemory || 0}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(gpuCard);
    });
}

// Fetch system metrics and update charts
async function fetchSystemMetrics() {
    try {
        const response = await fetch('/metrics');
        const data = await response.json();
        
        // Update CPU metrics with temperature and cores
        if (data.cpu !== undefined) {
            chartData.cpu.push(data.cpu);
            if (chartData.cpu.length > 50) {
                chartData.cpu.shift(); // Remove oldest point
            }
            document.getElementById('cpuValue').textContent = `${Math.round(data.cpu)}%`;
            
            // Update CPU temperature indicator
            updateTemperatureIndicator('cpuTempIndicator', data.cpuTemperature);
            
            // Update CPU cores display
            updateCPUCores(data.cpuCores || []);
        }
        
        if (data.ram !== undefined) {
            chartData.ram.push(data.ram);
            if (chartData.ram.length > 50) {
                chartData.ram.shift(); // Remove oldest point
            }
            document.getElementById('ramValue').textContent = `${Math.round(data.ram)}%`;
        }
        
        // Update enhanced GPU metrics
        if (data.gpus && data.gpus.length > 0) {
            updateGPUMetrics(data.gpus);
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

// ============================================
// LLAMA.CPP AUTO-UPDATER UI MODULE
// ============================================

// Updater state
let updaterState = {
    currentVersion: null,
    latestVersion: null,
    updateAvailable: false,
    pendingUpdate: null,
    downloadInProgress: false
};

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add updater message
function addUpdaterMessage(message, type = 'info') {
    if (!updaterMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `updater-message updater-message-${type}`;
    msgDiv.innerHTML = `<span class="msg-time">${new Date().toLocaleTimeString()}</span> ${message}`;

    updaterMessages.insertBefore(msgDiv, updaterMessages.firstChild);

    // Keep only last 5 messages
    while (updaterMessages.children.length > 5) {
        updaterMessages.removeChild(updaterMessages.lastChild);
    }
}

// Update UI based on updater state
function updateUpdaterUI() {
    // Update version display
    if (updaterCurrentVersion) {
        updaterCurrentVersion.textContent = updaterState.currentVersion || 'Unknown';
        updaterCurrentVersion.className = 'version-value' + (updaterState.currentVersion ? '' : ' unknown');
    }

    if (updaterLatestVersion) {
        updaterLatestVersion.textContent = updaterState.latestVersion || '-';
    }

    // Update status badge
    if (updaterStatus) {
        if (updaterState.updateAvailable) {
            updaterStatus.textContent = 'Update Available';
            updaterStatus.className = 'version-value status-badge update-available';
        } else if (updaterState.currentVersion === updaterState.latestVersion) {
            updaterStatus.textContent = 'Up to Date';
            updaterStatus.className = 'version-value status-badge up-to-date';
        } else {
            updaterStatus.textContent = 'Unknown';
            updaterStatus.className = 'version-value status-badge';
        }
    }

    // Update available banner
    if (updateAvailableBanner) {
        if (updaterState.updateAvailable && updaterState.buildsBehind) {
            updateAvailableBanner.style.display = 'block';
            if (updateBannerInfo) {
                updateBannerInfo.textContent = `${updaterState.buildsBehind} builds behind (${updaterState.currentVersion || 'unknown'} → ${updaterState.latestVersion})`;
            }
        } else {
            updateAvailableBanner.style.display = 'none';
        }
    }

    // Update button states
    if (downloadUpdateBtn) {
        downloadUpdateBtn.disabled = !updaterState.updateAvailable || updaterState.downloadInProgress || !!updaterState.pendingUpdate;
    }

    if (applyUpdateBtn) {
        applyUpdateBtn.disabled = !updaterState.pendingUpdate;
    }
}

// Fetch updater status
async function fetchUpdaterStatus() {
    try {
        const response = await fetch('/api/updater/status');
        const data = await response.json();

        if (data.success) {
            updaterState.currentVersion = data.currentVersion;
            updaterState.latestVersion = data.latestVersion;
            updaterState.updateAvailable = data.updateAvailable;
            updaterState.pendingUpdate = data.pendingUpdate;
            updaterState.downloadInProgress = data.downloadInProgress;

            if (updaterPlatform) {
                updaterPlatform.textContent = data.platform || 'Not detected';
            }

            if (updaterInstallPath && data.installPath) {
                updaterInstallPath.value = data.installPath;
            }

            updateUpdaterUI();
        }
    } catch (error) {
        console.error('Error fetching updater status:', error);
    }
}

// Check for updates
async function checkForUpdates() {
    if (!checkUpdatesBtn) return;

    checkUpdatesBtn.disabled = true;
        checkUpdatesBtn.innerHTML = `<span class="btn-icon">${icon('search')}</span> Checking...`;

    try {
        // Include server path for auto-detection
        const serverPath = serverPathInput ? serverPathInput.value : '';
        const url = '/api/updater/check' + (serverPath ? `?serverPath=${encodeURIComponent(serverPath)}` : '');

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            updaterState.currentVersion = data.currentVersion;
            updaterState.latestVersion = data.latestVersion;
            updaterState.updateAvailable = data.updateAvailable;
            updaterState.buildsBehind = data.buildsBehind;

            if (updaterPlatform) {
                updaterPlatform.textContent = data.platform || 'Not detected';
            }

            updateUpdaterUI();

            if (data.updateAvailable) {
                addUpdaterMessage(`Update available: ${data.latestVersion} (${data.buildsBehind} builds behind)`, 'success');
            } else if (data.currentVersion === 'unknown') {
                addUpdaterMessage('Could not detect current version. Configure install path manually.', 'warning');
            } else {
                addUpdaterMessage('You are running the latest version.', 'info');
            }
        } else {
            addUpdaterMessage(`Check failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        addUpdaterMessage(`Error: ${error.message}`, 'error');
    } finally {
        checkUpdatesBtn.disabled = false;
        checkUpdatesBtn.innerHTML = `<span class="btn-icon">${icon('search')}</span> Check for Updates`;
    }
}

// Download update
async function downloadUpdate() {
    if (!downloadUpdateBtn) return;

    downloadUpdateBtn.disabled = true;
    downloadUpdateBtn.innerHTML = `<span class="btn-icon">${icon('clock')}</span> Starting...`;

    if (downloadProgressSection) {
        downloadProgressSection.style.display = 'block';
    }

    try {
        const response = await fetch('/api/updater/download', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            addUpdaterMessage(`Download started: ${data.filename}`, 'info');
            updaterState.downloadInProgress = true;
        } else {
            addUpdaterMessage(`Download failed: ${data.error}`, 'error');
            if (downloadProgressSection) {
                downloadProgressSection.style.display = 'none';
            }
            downloadUpdateBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error starting download:', error);
        addUpdaterMessage(`Error: ${error.message}`, 'error');
        if (downloadProgressSection) {
            downloadProgressSection.style.display = 'none';
        }
        downloadUpdateBtn.disabled = false;
    }

    downloadUpdateBtn.innerHTML = `<span class="btn-icon">${icon('download')}</span> Download Update`;
}

// Apply update
async function applyUpdate() {
    if (!applyUpdateBtn) return;

    // Confirm before applying
    if (!confirm('This will update llama.cpp to the latest version. A backup of your current installation will be created. Continue?')) {
        return;
    }

    applyUpdateBtn.disabled = true;
    applyUpdateBtn.innerHTML = `<span class="btn-icon">${icon('clock')}</span> Applying...`;

    try {
        const response = await fetch('/api/updater/apply', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            addUpdaterMessage(`Update applied successfully! ${data.previousVersion} → ${data.version}`, 'success');
            addUpdaterMessage(`Backup created: ${data.backupPath}`, 'info');

            // Reset state
            updaterState.pendingUpdate = null;
            updaterState.updateAvailable = false;
            updaterState.currentVersion = data.version;
            updaterState.latestVersion = data.version;

            updateUpdaterUI();
        } else {
            addUpdaterMessage(`Apply failed: ${data.error}`, 'error');
            if (data.backupPath) {
                addUpdaterMessage(`Backup location: ${data.backupPath}`, 'info');
            }
        }
    } catch (error) {
        console.error('Error applying update:', error);
        addUpdaterMessage(`Error: ${error.message}`, 'error');
    } finally {
        applyUpdateBtn.disabled = !updaterState.pendingUpdate;
        applyUpdateBtn.innerHTML = `<span class="btn-icon">${icon('package')}</span> Apply Update`;
    }
}

// Configure install path
async function configureInstallPath() {
    const installPath = updaterInstallPath ? updaterInstallPath.value : '';

    if (!installPath && serverPathInput && serverPathInput.value) {
        // Auto-detect from server path
        const serverPath = serverPathInput.value;
        const pathParts = serverPath.split(/[/\\]/);
        pathParts.pop(); // Remove filename
        const detectedPath = pathParts.join(serverPath.includes('/') ? '/' : '\\');

        if (updaterInstallPath) {
            updaterInstallPath.value = detectedPath;
        }

        addUpdaterMessage(`Detected install path: ${detectedPath}`, 'info');
    }

    const pathToSet = updaterInstallPath ? updaterInstallPath.value : '';

    if (pathToSet) {
        try {
            const response = await fetch('/api/updater/configure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installPath: pathToSet })
            });
            const data = await response.json();

            if (data.success) {
                addUpdaterMessage(`Install path configured. Detected version: ${data.currentVersion?.build || 'unknown'}`, 'success');
                if (updaterPlatform) {
                    updaterPlatform.textContent = data.platform || 'Not detected';
                }
                await fetchUpdaterStatus();
            } else {
                addUpdaterMessage(`Configuration failed: ${data.error}`, 'error');
            }
        } catch (error) {
            addUpdaterMessage(`Error: ${error.message}`, 'error');
        }
    }
}

// Setup updater Socket.IO event handlers
function setupUpdaterSocketEvents() {
    if (!socket) return;

    // Download progress
    socket.on('update-progress', (data) => {
        if (downloadProgressBar) {
            downloadProgressBar.style.width = `${data.progress}%`;
        }
        if (downloadProgressPercent) {
            downloadProgressPercent.textContent = `${data.progress}%`;
        }
        if (downloadProgressBytes) {
            downloadProgressBytes.textContent = `${formatBytes(data.downloaded)} / ${formatBytes(data.total)}`;
        }
    });

    // Download complete
    socket.on('update-downloaded', (data) => {
        if (data.success) {
            addUpdaterMessage(`Download complete: ${data.version}`, 'success');
            updaterState.pendingUpdate = { version: data.version };
            updaterState.downloadInProgress = false;

            if (downloadProgressSection) {
                downloadProgressSection.style.display = 'none';
            }

            updateUpdaterUI();
        }
    });

    // Download error
    socket.on('update-error', (data) => {
        addUpdaterMessage(`Download error: ${data.error}`, 'error');
        updaterState.downloadInProgress = false;

        if (downloadProgressSection) {
            downloadProgressSection.style.display = 'none';
        }

        if (downloadUpdateBtn) {
            downloadUpdateBtn.disabled = false;
        }
    });

    // Update applied
    socket.on('update-applied', (data) => {
        if (data.success) {
            addUpdaterMessage(`Update applied: ${data.previousVersion} → ${data.version}`, 'success');
        }
    });
}

// Initialize updater
function initUpdater() {
    // Bind event listeners
    if (checkUpdatesBtn) {
        checkUpdatesBtn.addEventListener('click', checkForUpdates);
    }

    if (downloadUpdateBtn) {
        downloadUpdateBtn.addEventListener('click', downloadUpdate);
    }

    if (applyUpdateBtn) {
        applyUpdateBtn.addEventListener('click', applyUpdate);
    }

    if (detectInstallPathBtn) {
        detectInstallPathBtn.addEventListener('click', configureInstallPath);
    }

    // Setup socket events after socket is connected
    // This will be called from the main init after socket connection

    // Fetch initial status
    fetchUpdaterStatus();
}

// ============================================
// END LLAMA.CPP AUTO-UPDATER UI MODULE
// ============================================

function initSidebarToggle() {
    document.querySelectorAll('.instance-panel').forEach(panel => {
        const toggle = panel.querySelector('.sidebar-toggle');
        const sidebar = panel.querySelector('.outline-sidebar');
        if (toggle && sidebar && !toggle._bound) {
            toggle._bound = true;
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
    });
}

function setupScrollSpy(panel, instanceMain, outlineItems) {
    const sections = [];
    outlineItems.forEach(item => {
        const sectionId = item.getAttribute('data-section');
        const section = panel.querySelector(`#${sectionId}`);
        if (section) {
            sections.push({ id: sectionId, el: section, navItem: item });
        }
    });

    if (sections.length === 0) return;

    let scrollSpyRaf = null;
    instanceMain.addEventListener('scroll', () => {
        if (scrollSpyRaf) return;
        scrollSpyRaf = requestAnimationFrame(() => {
            scrollSpyRaf = null;
            let activeSection = sections[0];

            for (const section of sections) {
                const rect = section.el.getBoundingClientRect();
                const mainRect = instanceMain.getBoundingClientRect();
                const relativeTop = rect.top - mainRect.top;
                if (relativeTop <= 100) {
                    activeSection = section;
                } else {
                    break;
                }
            }

            if (activeSection) {
                outlineItems.forEach(item => item.classList.remove('active'));
                activeSection.navItem.classList.add('active');
            }
        });
    });
}

function initScrollSpy() {
    document.querySelectorAll('.instance-panel').forEach(panel => {
        const instanceMain = panel.querySelector('.instance-main');
        const outlineItems = panel.querySelectorAll('.outline-nav .outline-item');
        if (!instanceMain || outlineItems.length === 0) return;

        outlineItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = item.getAttribute('data-section');
                const section = panel.querySelector(`#${sectionId}`);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        if (!panel._scrollSpyInit) {
            panel._scrollSpyInit = true;
            setupScrollSpy(panel, instanceMain, outlineItems);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    init();
    initCharts();
    startMetricUpdates();
    initSidebarToggle();
    initScrollSpy();
    initAccordion();
    updateAccordionRuntimeVisibility(getCurrentRuntime());

    window.addEventListener('resize', handleResize);
});
