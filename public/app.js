// Application state
let currentSettings = null;
let availableVoices = [];
let availableModels = [];
let currentAudioBlob = null;
let storageInfo = {};
let logSocket = null;
let favoriteVoices = [];
const MAX_FAVORITES = 10;
let processingJobs = []; // Track jobs in progress
let jobIdCounter = 1;

// DOM Elements - Sidebar
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
const themeToggle = document.getElementById('themeToggle');

// DOM Elements - Settings
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.querySelector('.close');
const serviceTypeSelect = document.getElementById('serviceType');
const customEndpointGroup = document.getElementById('customEndpointGroup');
const customEndpointInput = document.getElementById('customEndpoint');
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const saveSettingsBtn = document.getElementById('saveSettings');
const testConnectionBtn = document.getElementById('testConnection');
const settingsStatus = document.getElementById('settingsStatus');
const resetEndpointBtn = document.getElementById('resetEndpoint');

// DOM Elements - Voice Config
const favoritesSection = document.getElementById('favoritesSection');
const favoritesList = document.getElementById('favoritesList');
const favoritesCount = document.getElementById('favoritesCount');
const toggleFavorites = document.getElementById('toggleFavorites');
const modelSelect = document.getElementById('modelSelect');
const voiceSelect = document.getElementById('voiceSelect');
const favoriteBtn = document.getElementById('favoriteBtn');
const languageFilter = document.getElementById('languageFilter');
const genderFilter = document.getElementById('genderFilter');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const formatSelect = document.getElementById('formatSelect');
const combineAudioCheckbox = document.getElementById('combineAudio');



// DOM Elements - Main
const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');
const chunkInfo = document.getElementById('chunkInfo');
const dropZone = document.getElementById('dropZone');
const fileUpload = document.getElementById('fileUpload');
const generateBtn = document.getElementById('generateBtn');
const progressInfo = document.getElementById('progressInfo');
const progressText = document.getElementById('progressText');

// DOM Elements - Audio & Files
const audioPlayerPanel = document.getElementById('audioPlayerPanel');
const audioPlayer = document.getElementById('audioPlayer');
const playbackSpeedSlider = document.getElementById('playbackSpeed');
const playbackSpeedValue = document.getElementById('playbackSpeedValue');
const downloadBtn = document.getElementById('downloadBtn');
const audioInfo = document.getElementById('audioInfo');
const filesPanel = document.getElementById('filesPanel');
const filesList = document.getElementById('filesList');
const folderSize = document.getElementById('folderSize');
const clearAllFilesBtn = document.getElementById('clearAllFiles');
const errorPanel = document.getElementById('errorPanel');
const errorMessage = document.getElementById('errorMessage');
const logViewer = document.getElementById('logViewer');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    loadFavorites();
    await loadProcessingJobs();
    setupEventListeners();
    connectLogStream();
    await loadSettings(); // This will call initializeSidebarState()
    await loadFilesList();
    
    if (currentSettings && currentSettings.apiKeyFull) {
        await loadModels();
        await loadVoices();
    }
    
    // Auto-refresh processing jobs and files every 3 seconds
    setInterval(async () => {
        await refreshProcessingJobs();
        await loadFilesList();
    }, 3000);
});

// Sidebar State Management
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initializeSidebarState() {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
        // On mobile, always start collapsed
        sidebar.classList.add('collapsed');
    } else if (currentSettings && currentSettings.sidebarCollapsed) {
        // On desktop, use saved state from settings
        sidebar.classList.add('collapsed');
    }
}

async function saveSidebarState() {
    const isCollapsed = sidebar.classList.contains('collapsed');
    
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...currentSettings,
                sidebarCollapsed: isCollapsed
            })
        });
    } catch (error) {
        console.error('Error saving sidebar state:', error);
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Event Listeners
function setupEventListeners() {
    // Sidebar
    sidebarToggle.onclick = () => {
        // On desktop: toggle collapsed state and save
        // On mobile: close sidebar
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
            saveSidebarState();
        }
    };
    
    mobileSidebarToggle.onclick = () => {
        sidebar.classList.toggle('mobile-open');
    };
    
    themeToggle.onclick = toggleTheme;
    
    // Settings
    settingsBtn.onclick = () => settingsModal.style.display = 'block';
    closeModal.onclick = () => settingsModal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    };
    
    serviceTypeSelect.onchange = () => {
        customEndpointGroup.style.display = 
            serviceTypeSelect.value === 'custom' ? 'block' : 'none';
    };
    
    toggleApiKeyBtn.onclick = () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleApiKeyBtn.textContent = type === 'password' ? '👁️' : '🙈';
    };
    
    saveSettingsBtn.onclick = saveSettings;
    testConnectionBtn.onclick = testConnection;
    resetEndpointBtn.onclick = () => resetSetting('customEndpoint');
    
    // Voice controls
    speedSlider.oninput = () => {
        speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;
    };
    modelSelect.onchange = applyVoiceFilters;
    languageFilter.onchange = applyVoiceFilters;
    genderFilter.onchange = applyVoiceFilters;
    voiceSelect.onchange = updateFavoriteButton;
    favoriteBtn.onclick = toggleFavorite;
    toggleFavorites.onclick = () => {
        const isCollapsed = favoritesList.style.display === 'none';
        favoritesList.style.display = isCollapsed ? 'flex' : 'none';
        toggleFavorites.textContent = isCollapsed ? '▲' : '▼';
    };
    
    // Audio playback speed control
    playbackSpeedSlider.oninput = () => {
        const speed = parseFloat(playbackSpeedSlider.value);
        playbackSpeedValue.textContent = `${speed.toFixed(2)}x`;
        audioPlayer.playbackRate = speed;
    };
    
    // Main actions
    fileUpload.onchange = handleFileUpload;
    generateBtn.onclick = generateSpeech;
    downloadBtn.onclick = downloadAudio;
    textInput.oninput = updateTextStats;
    
    // Drag and drop file upload
    setupDragAndDrop();
    
    // Files
    clearAllFilesBtn.onclick = clearAllFiles;
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        currentSettings = await response.json();
        
        // Populate form
        serviceTypeSelect.value = currentSettings.serviceType || 'openai';
        customEndpointInput.value = currentSettings.customEndpoint || '';
        apiKeyInput.value = currentSettings.apiKeyFull || '';
        
        customEndpointGroup.style.display = 
            currentSettings.serviceType === 'custom' ? 'block' : 'none';
        
        // Handle locks
        if (currentSettings._locks) {
            if (currentSettings._locks.customEndpoint) {
                customEndpointInput.disabled = true;
                document.getElementById('endpointLock').style.display = 'inline';
                document.getElementById('endpointHint').textContent = 'Locked by administrator';
            }
        }
        
        // Show reset buttons if overriding env
        if (currentSettings._sources && currentSettings._envDefaults) {
            if (currentSettings._sources.customEndpoint === 'user' && currentSettings._envDefaults.customEndpoint) {
                resetEndpointBtn.style.display = 'inline-block';
            }
        }
        
        // Initialize sidebar state after settings are loaded
        initializeSidebarState();
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus(settingsStatus, 'Error loading settings', 'error');
    }
}

// Save settings
async function saveSettings() {
    const settings = {
        serviceType: serviceTypeSelect.value,
        customEndpoint: customEndpointInput.value,
        apiKey: apiKeyInput.value
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const result = await response.json();
        
        if (result.success) {
            showStatus(settingsStatus, 'Settings saved successfully!', 'success');
            // Reload settings to get the full merged settings including apiKeyFull
            await loadSettings();
            await loadModels();
            await loadVoices();
            
            setTimeout(() => {
                settingsModal.style.display = 'none';
            }, 1500);
        } else {
            showStatus(settingsStatus, result.error || 'Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus(settingsStatus, 'Error saving settings', 'error');
    }
}

// Reset setting to environment default
async function resetSetting(setting) {
    try {
        const response = await fetch(`/api/settings/reset/${setting}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showStatus(settingsStatus, 'Setting reset to default', 'success');
            await loadSettings();
            setTimeout(() => settingsModal.style.display = 'none', 1500);
        }
    } catch (error) {
        console.error('Error resetting setting:', error);
    }
}

// Test connection
async function testConnection() {
    if (!apiKeyInput.value) {
        showStatus(settingsStatus, 'Please enter an API key', 'error');
        return;
    }

    showStatus(settingsStatus, 'Testing connection...', 'info');

    try {
        const endpoint = serviceTypeSelect.value === 'custom' 
            ? customEndpointInput.value 
            : 'openai';

        const response = await fetch('/api/tts/voices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: endpoint,
                apiKey: apiKeyInput.value
            })
        });

        if (response.ok) {
            const voices = await response.json();
            showStatus(settingsStatus, `Connection successful! Found ${voices.length} voices.`, 'success');
        } else {
            showStatus(settingsStatus, 'Connection failed. Check your settings.', 'error');
        }
    } catch (error) {
        console.error('Connection test error:', error);
        showStatus(settingsStatus, 'Connection test failed', 'error');
    }
}

// Load models
async function loadModels() {
    if (!currentSettings || !currentSettings.apiKeyFull) {
        modelSelect.innerHTML = '<option value="">Configure settings first</option>';
        return;
    }

    try {
        const endpoint = currentSettings.serviceType === 'custom' 
            ? currentSettings.customEndpoint 
            : 'openai';

        const response = await fetch('/api/tts/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: endpoint,
                apiKey: currentSettings.apiKeyFull
            })
        });

        if (response.ok) {
            availableModels = await response.json();
            populateModelDropdown();
        } else {
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    } catch (error) {
        console.error('Error loading models:', error);
        modelSelect.innerHTML = '<option value="">tts-1</option>';
        // Fallback to default
        availableModels = [{ id: 'tts-1' }];
    }
}

// Load voices using /v1/voices/all endpoint
async function loadVoices() {
    if (!currentSettings || !currentSettings.apiKeyFull) {
        voiceSelect.innerHTML = '<option value="">Configure settings first</option>';
        return;
    }

    try {
        const endpoint = currentSettings.serviceType === 'custom' 
            ? currentSettings.customEndpoint 
            : 'openai';

        const response = await fetch('/api/tts/voices/all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: endpoint,
                apiKey: currentSettings.apiKeyFull
            })
        });

        if (response.ok) {
            const data = await response.json();
            availableVoices = data.voices || [];
            populateFilters();
            applyVoiceFilters();
            updateFavoriteButton();
            renderFavorites();
        } else {
            voiceSelect.innerHTML = '<option value="">Error loading voices</option>';
        }
    } catch (error) {
        console.error('Error loading voices:', error);
        voiceSelect.innerHTML = '<option value="">Error loading voices</option>';
    }
}

// Populate model dropdown
function populateModelDropdown() {
    if (availableModels.length === 0) {
        modelSelect.innerHTML = '<option value="tts-1">tts-1 (default)</option>';
        return;
    }

    modelSelect.innerHTML = availableModels
        .filter(model => model.id && model.id.includes('tts'))
        .map(model => `<option value="${model.id}">${model.id}</option>`)
        .join('');
    
    // Select first model by default
    if (modelSelect.options.length > 0) {
        modelSelect.selectedIndex = 0;
    }
}

// Populate language and gender filters
function populateFilters() {
    // Get unique languages and genders
    const languages = [...new Set(availableVoices.map(v => v.language).filter(Boolean))].sort();
    const genders = [...new Set(availableVoices.map(v => v.gender).filter(Boolean))].sort();

    // Populate language filter
    languageFilter.innerHTML = '<option value="">All Languages</option>' +
        languages.map(lang => `<option value="${lang}">${lang}</option>`).join('');
    
    // Set default to en-US if available
    if (languages.includes('en-US')) {
        languageFilter.value = 'en-US';
    }

    // Populate gender filter
    genderFilter.innerHTML = '<option value="">All Genders</option>' +
        genders.map(gender => `<option value="${gender}">${gender}</option>`).join('');
}

// Apply cascading filters to voice dropdown
function applyVoiceFilters() {
    const selectedLanguage = languageFilter.value;
    const selectedGender = genderFilter.value;

    let filteredVoices = [...availableVoices];

    // Filter by language
    if (selectedLanguage) {
        filteredVoices = filteredVoices.filter(v => v.language === selectedLanguage);
    }

    // Filter by gender
    if (selectedGender) {
        filteredVoices = filteredVoices.filter(v => v.gender === selectedGender);
    }

    // Update voice dropdown
    if (filteredVoices.length === 0) {
        voiceSelect.innerHTML = '<option value="">No voices match the selected filters</option>';
    } else {
        voiceSelect.innerHTML = filteredVoices.map(voice => {
            const displayName = `${voice.name}`;
            const details = [voice.language, voice.gender].filter(Boolean).join(', ');
            return `<option value="${voice.name}">${displayName} ${details ? '(' + details + ')' : ''}</option>`;
        }).join('');
    }

    // Update available genders based on language filter
    if (selectedLanguage) {
        const gendersForLanguage = [...new Set(
            availableVoices
                .filter(v => v.language === selectedLanguage)
                .map(v => v.gender)
                .filter(Boolean)
        )].sort();
        
        genderFilter.innerHTML = '<option value="">All Genders</option>' +
            gendersForLanguage.map(gender => `<option value="${gender}">${gender}</option>`).join('');
        
        // Restore selection if still valid
        if (selectedGender && gendersForLanguage.includes(selectedGender)) {
            genderFilter.value = selectedGender;
        }
    }

    // Update available languages based on gender filter
    if (selectedGender && !selectedLanguage) {
        const languagesForGender = [...new Set(
            availableVoices
                .filter(v => v.gender === selectedGender)
                .map(v => v.language)
                .filter(Boolean)
        )].sort();
        
        languageFilter.innerHTML = '<option value="">All Languages</option>' +
            languagesForGender.map(lang => `<option value="${lang}">${lang}</option>`).join('');
    }
}

// Load files list
async function loadFilesList() {
    renderOutputManager();
}

// Play file
async function playFile(filename) {
    try {
        audioPlayer.src = `/api/storage/files/${filename}`;
        audioPlayerPanel.style.display = 'block';
        audioInfo.textContent = `Playing: ${filename}`;
        audioPlayer.play();
    } catch (error) {
        console.error('Error playing file:', error);
        showError('Failed to play audio file');
    }
}

// Download file
function downloadFile(filename) {
    window.location.href = `/api/storage/files/${filename}`;
}

// Download text
function downloadText(filename) {
    window.location.href = `/api/storage/text/${filename}`;
}

// Rename file
async function renameFile(filename) {
    // Extract the file extension
    const extension = filename.substring(filename.lastIndexOf('.'));
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    
    const newName = prompt('Enter new filename (without extension):', nameWithoutExt);
    if (!newName || newName === nameWithoutExt) return;
    
    // Ensure the new name has the correct extension
    const finalName = newName.endsWith(extension) ? newName : newName + extension;
    
    try {
        const response = await fetch(`/api/storage/files/${filename}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName: finalName })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            await loadFilesList();
        } else {
            alert(result.error || 'Failed to rename file');
        }
    } catch (error) {
        console.error('Error renaming file:', error);
        alert('Failed to rename file');
    }
}

// Delete file
async function deleteFile(filename) {
    if (!confirm(`Delete ${filename}?`)) return;
    
    try {
        const response = await fetch(`/api/storage/files/${filename}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadFilesList();
        } else {
            showError('Failed to delete file');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showError('Failed to delete file');
    }
}

// Clear all files
async function clearAllFiles() {
    if (!confirm('Delete all generated files and processing jobs? This cannot be undone.')) return;
    
    try {
        const response = await fetch('/api/storage/files', {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            // Processing jobs are cleared automatically on the backend
            await refreshProcessingJobs();
            await loadFilesList();
        } else {
            showError('Failed to delete files');
        }
    } catch (error) {
        console.error('Error clearing files:', error);
        showError('Failed to delete files');
    }
}

// Setup drag and drop
function setupDragAndDrop() {
    // Click to upload
    dropZone.onclick = () => fileUpload.click();
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        fileUpload.files = files;
        handleFileUpload({ target: { files: files } });
    }
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        progressInfo.style.display = 'flex';
        progressText.textContent = 'Extracting text from file...';

        const response = await fetch('/api/upload/extract', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            textInput.value = result.text;
            updateTextStats();
            progressText.textContent = 'Text extracted successfully!';
            setTimeout(() => {
                progressInfo.style.display = 'none';
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to extract text');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showError(error.message);
        progressInfo.style.display = 'none';
    } finally {
        // Reset file input
        fileUpload.value = '';
    }
}

// Update text stats
function updateTextStats() {
    const text = textInput.value;
    const length = text.length;
    charCount.textContent = `${length} characters`;

    if (length > 4096) {
        const numChunks = Math.ceil(length / 4096);
        chunkInfo.textContent = `(Will be split into ~${numChunks} chunks)`;
        chunkInfo.style.color = '#ff9800';
    } else {
        chunkInfo.textContent = '';
    }
}

// Generate speech
async function generateSpeech() {
    const text = textInput.value.trim();
    
    if (!text) {
        showError('Please enter some text to convert to speech');
        return;
    }

    if (!currentSettings || !currentSettings.apiKeyFull) {
        showError('Please configure your settings first');
        settingsModal.style.display = 'block';
        return;
    }

    if (!voiceSelect.value) {
        showError('Please select a voice');
        return;
    }

    hideError();
    audioPlayerPanel.style.display = 'none';
    generateBtn.disabled = true;
    progressInfo.style.display = 'flex';
    progressText.textContent = 'Generating speech...';

    try {
        // Start the request
        const requestPromise = fetch('/api/tts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                settings: { ...currentSettings, apiKey: currentSettings.apiKeyFull },
                voice: voiceSelect.value,
                speed: parseFloat(speedSlider.value),
                format: formatSelect.value,
                combineAudio: combineAudioCheckbox.checked,
                model: modelSelect.value
            })
        });
        
        // Re-enable button immediately for parallel processing
        generateBtn.disabled = false;
        
        // Wait for response
        const response = await requestPromise;

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Generation failed');
        }

        const result = await response.json();
        
        if (result.success) {
            progressText.textContent = 'Loading audio...';
            
            // Convert base64 to blob
            const audioData = atob(result.audioData);
            const audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
            }
            
            const mimeType = `audio/${result.format}`;
            currentAudioBlob = new Blob([audioArray], { type: mimeType });
            
            // Create object URL and play
            const audioUrl = URL.createObjectURL(currentAudioBlob);
            audioPlayer.src = audioUrl;
            
            // Show player
            audioPlayerPanel.style.display = 'block';
            audioInfo.textContent = result.combined 
                ? `Combined ${result.chunks} audio chunks into one file`
                : `Generated from ${result.chunks} chunk(s)`;
            
            progressText.textContent = 'Complete!';
            
            // Refresh files and processing jobs list
            await refreshProcessingJobs();
            await loadFilesList();
            
            setTimeout(() => {
                progressInfo.style.display = 'none';
            }, 1000);
        }
    } catch (error) {
        console.error('Error generating speech:', error);
        showError(error.message);
        progressInfo.style.display = 'none';
    }
}

// Download audio
function downloadAudio() {
    if (!currentAudioBlob) return;

    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openspeech_${Date.now()}.${formatSelect.value}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show status
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';
}

// Show/hide error
function showError(message) {
    errorMessage.textContent = message;
    errorPanel.style.display = 'block';
    errorPanel.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
    errorPanel.style.display = 'none';
}

// Connect to log stream
function connectLogStream() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/logs`;
    
    logSocket = new WebSocket(wsUrl);
    
    logSocket.onopen = () => {
        addLogMessage('info', 'Connected to log stream');
    };
    
    logSocket.onmessage = (event) => {
        try {
            const log = JSON.parse(event.data);
            addLogMessage(log.level, log.message, log.timestamp, log.context);
        } catch (error) {
            console.error('Error parsing log message:', error);
        }
    };
    
    logSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLogMessage('error', 'Log stream connection error');
    };
    
    logSocket.onclose = () => {
        addLogMessage('warn', 'Log stream disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(connectLogStream, 5000);
    };
}

function addLogMessage(level, message, timestamp, context) {
    if (!logViewer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-message ${level}`;
    
    const time = timestamp 
        ? new Date(timestamp).toLocaleTimeString() 
        : new Date().toLocaleTimeString();
    
    const contextStr = context ? `<span class="log-context">${context}</span> ` : '';
    logEntry.innerHTML = `<span class="log-time">${time}</span>${contextStr}${message}`;
    
    logViewer.appendChild(logEntry);
    
    // Auto-scroll to bottom
    logViewer.scrollTop = logViewer.scrollHeight;
    
    // Keep only last 50 messages
    while (logViewer.children.length > 50) {
        logViewer.removeChild(logViewer.firstChild);
    }
}

// ============================================
// FAVORITES MANAGEMENT
// ============================================

// Load favorites from localStorage
async function loadFavorites() {
    try {
        const response = await fetch('/api/settings/favorites');
        favoriteVoices = await response.json();
        renderFavorites();
    } catch (error) {
        console.error('Error loading favorites:', error);
        favoriteVoices = [];
    }
}

// Render favorites list
function renderFavorites() {
    if (favoriteVoices.length === 0) {
        favoritesSection.style.display = 'none';
        return;
    }
    
    favoritesSection.style.display = 'block';
    favoritesCount.textContent = `(${favoriteVoices.length}/${MAX_FAVORITES})`;
    
    favoritesList.innerHTML = favoriteVoices.map(fav => `
        <div class="favorite-item ${voiceSelect.value === fav.name ? 'active' : ''}" onclick="selectFavoriteVoice('${fav.name}')">
            <div class="favorite-item-info">
                <div class="favorite-item-name">${fav.name}</div>
                <div class="favorite-item-meta">${fav.language || 'Unknown'} • ${fav.gender || 'N/A'}</div>
            </div>
            <button class="favorite-item-remove" onclick="event.stopPropagation(); removeFavorite('${fav.name}')" title="Remove">×</button>
        </div>
    `).join('');
}

// Update favorite button state
function updateFavoriteButton() {
    const selectedVoice = voiceSelect.value;
    if (!selectedVoice) {
        favoriteBtn.style.display = 'none';
        return;
    }
    
    favoriteBtn.style.display = 'inline-block';
    const isFavorited = favoriteVoices.some(fav => fav.name === selectedVoice);
    favoriteBtn.textContent = isFavorited ? '★' : '☆';
    favoriteBtn.classList.toggle('favorited', isFavorited);
    favoriteBtn.title = isFavorited ? 'Remove from favorites' : 'Add to favorites';
}

// Toggle favorite status
function toggleFavorite() {
    const selectedVoice = voiceSelect.value;
    if (!selectedVoice) return;
    
    const isFavorited = favoriteVoices.some(fav => fav.name === selectedVoice);
    
    if (isFavorited) {
        removeFavorite(selectedVoice);
    } else {
        addFavorite(selectedVoice);
    }
}

// Add voice to favorites
async function addFavorite(voiceName) {
    if (favoriteVoices.length >= MAX_FAVORITES) {
        showToast(`Maximum ${MAX_FAVORITES} favorites allowed`, 'warning');
        return;
    }
    
    const voice = availableVoices.find(v => v.name === voiceName);
    if (!voice) return;
    
    if (favoriteVoices.some(fav => fav.name === voiceName)) return;
    
    try {
        const response = await fetch('/api/settings/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: voice.name,
                language: voice.language,
                gender: voice.gender
            })
        });
        
        if (response.ok) {
            favoriteVoices = await response.json();
            renderFavorites();
            updateFavoriteButton();
            showToast('Added to favorites!', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to add favorite', 'error');
        }
    } catch (error) {
        console.error('Error adding favorite:', error);
        showToast('Failed to add favorite', 'error');
    }
}

// Remove voice from favorites
async function removeFavorite(voiceName) {
    try {
        const response = await fetch(`/api/settings/favorites/${voiceName}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            favoriteVoices = await response.json();
            renderFavorites();
            updateFavoriteButton();
            showToast('Removed from favorites', 'info');
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to remove favorite', 'error');
        }
    } catch (error) {
        console.error('Error removing favorite:', error);
        showToast('Failed to remove favorite', 'error');
    }
}

// Select a favorite voice
function selectFavoriteVoice(voiceName) {
    // Find the voice in available voices
    const voice = availableVoices.find(v => v.name === voiceName);
    if (!voice) {
        showToast('Voice not available. Try reloading voices.', 'error');
        return;
    }
    
    // Set filters to match the voice
    if (voice.model) modelSelect.value = voice.model;
    if (voice.language) languageFilter.value = voice.language;
    if (voice.gender) genderFilter.value = voice.gender;
    
    // Apply filters and select voice
    applyVoiceFilters();
    voiceSelect.value = voiceName;
    updateFavoriteButton();
    renderFavorites(); // Update active state
    
    showToast(`Selected: ${voiceName}`, 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

// Add CSS animation for toast
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// OUTPUT MANAGER - PROCESSING JOBS
// ============================================

// Load processing jobs from server
async function loadProcessingJobs() {
    try {
        const response = await fetch('/api/storage/processing-jobs');
        if (response.ok) {
            processingJobs = await response.json();
            renderOutputManager();
        }
    } catch (error) {
        console.error('Error loading processing jobs:', error);
        processingJobs = [];
    }
}

// Refresh processing jobs (call periodically)
async function refreshProcessingJobs() {
    await loadProcessingJobs();
}



// Render output manager with processing jobs and files
function renderOutputManager() {
    filesPanel.style.display = 'block';
    
    // Sort processing jobs by requestedAt timestamp (descending)
    const sortedJobs = [...processingJobs].sort((a, b) => 
        (b.requestedAt || b.startTime) - (a.requestedAt || a.startTime)
    );
    
    // Build HTML for processing jobs with date, content preview, and tooltip
    const processingHTML = sortedJobs.map(job => {
        const requestDate = new Date(job.requestedAt || job.startTime);
        const formattedDate = requestDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Prepare text preview (first 50 chars) and tooltip (up to 200 chars)
        const fullText = job.text || job.textPreview || '';
        const textPreviewShort = fullText.substring(0, 50);
        const hasMore = fullText.length > 50;
        const textPreviewLong = fullText.substring(0, 200) + (fullText.length > 200 ? '...' : '');
        
        const metaLine = fullText 
            ? `${formattedDate} • <span class="file-text-preview" title="${textPreviewLong.replace(/"/g, '&quot;')}">${textPreviewShort}${hasMore ? '...' : ''}</span>`
            : formattedDate;
        
        return `
            <div class="file-item processing">
                <div class="file-info">
                    <div class="file-name">🔄 Processing: ${job.voice}</div>
                    <div class="file-meta">${metaLine}</div>
                </div>
                <div class="file-actions">
                    <div class="spinner-small"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // Fetch and render files along with processing jobs
    fetchAndRenderFiles(processingHTML);
}



// Fetch files and combine with processing jobs
async function fetchAndRenderFiles(processingHTML = '') {
    try {
        const [filesResponse, metadataResponse] = await Promise.all([
            fetch('/api/storage/files'),
            fetch('/api/storage/metadata')
        ]);
        
        const files = await filesResponse.json();
        const metadata = await metadataResponse.json();
        
        // Create a map of filename to metadata for quick lookup
        const metadataMap = {};
        metadata.forEach(meta => {
            metadataMap[meta.filename] = meta;
        });
        
        // Sort files by requestedAt timestamp (descending), fallback to file creation time
        const sortedFiles = [...files].sort((a, b) => {
            const metaA = metadataMap[a.name];
            const metaB = metadataMap[b.name];
            const timeA = (metaA && metaA.requestedAt) || a.created;
            const timeB = (metaB && metaB.requestedAt) || b.created;
            return timeB - timeA;
        });
        
        // Calculate total folder size
        const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        folderSize.textContent = `${totalMB} MB`;
        
        const filesHTML = sortedFiles.map(file => {
            const meta = metadataMap[file.name];
            
            // Use requested time from metadata, fallback to file creation time
            let displayTime = file.createdFormatted;
            if (meta && meta.requestedAt) {
                const requestDate = new Date(meta.requestedAt);
                displayTime = requestDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            // Prepare text preview for inline display (first 50 chars) and tooltip (up to 200 chars)
            let textPreviewShort = '';
            let textPreviewLong = '';
            if (meta && meta.text) {
                textPreviewShort = meta.text.substring(0, 50);
                if (meta.text.length > 50) textPreviewShort += '...';
                
                textPreviewLong = meta.text.substring(0, 200);
                if (meta.text.length > 200) textPreviewLong += '...';
            }
            
            const metaLine = meta && meta.text 
                ? `${file.sizeFormatted} • ${displayTime} • <span class="file-text-preview" title="${textPreviewLong.replace(/"/g, '&quot;')}">${textPreviewShort}</span>`
                : `${file.sizeFormatted} • ${displayTime}`;
            
            return `
                <div class="file-item">
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${metaLine}</div>
                    </div>
                    <div class="file-actions">
                        <button class="file-btn" onclick="playFile('${file.name}')">▶️ Play</button>
                        ${meta && meta.text ? `<button class="file-btn" onclick="downloadText('${file.name}')">📄 Text</button>` : ''}
                        <button class="file-btn" onclick="renameFile('${file.name}')">✏️ Rename</button>
                        <button class="file-btn" onclick="downloadFile('${file.name}')">⬇️ Download</button>
                        <button class="file-btn delete" onclick="deleteFile('${file.name}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Combine processing jobs and files
        filesList.innerHTML = processingHTML + filesHTML;
        
        // Show panel if there's content
        if (processingJobs.length > 0 || files.length > 0) {
            filesPanel.style.display = 'block';
        } else {
            filesPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching files:', error);
    }
}
