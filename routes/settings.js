const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// Default settings
const defaultSettings = {
  serviceType: 'openai',
  customEndpoint: '',
  apiKey: '',
  theme: 'system',
  sidebarCollapsed: false,
  favorites: []
};

// Load environment settings
function getEnvSettings() {
  return {
    serviceType: process.env.TTS_SERVICE_TYPE,
    customEndpoint: process.env.TTS_CUSTOM_ENDPOINT,
    apiKey: process.env.TTS_API_KEY,
    theme: process.env.DEFAULT_THEME
  };
}

// Get lock configuration
function getLocks() {
  return {
    customEndpoint: process.env.LOCK_API_ENDPOINT === 'true',
    maxStorageMB: process.env.LOCK_STORAGE_LIMIT === 'true'
  };
}

// Load user settings from file
async function loadUserSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Merge settings with priority: User > Env > Defaults
async function getMergedSettings() {
  const envSettings = getEnvSettings();
  const userSettings = await loadUserSettings();
  const locks = getLocks();
  const allowOverride = process.env.ALLOW_UI_OVERRIDE !== 'false';
  
  const finalSettings = { ...defaultSettings };
  const sources = {};
  const envDefaults = {};
  
  // Apply environment variables
  Object.keys(envSettings).forEach(key => {
    if (envSettings[key] !== null && envSettings[key] !== undefined && envSettings[key] !== '') {
      finalSettings[key] = envSettings[key];
      sources[key] = 'env';
      envDefaults[key] = envSettings[key];
    }
  });
  
  // Apply user settings (if allowed and not locked)
  if (allowOverride) {
    Object.keys(userSettings).forEach(key => {
      if (!locks[key] && userSettings[key] !== null && userSettings[key] !== undefined && userSettings[key] !== '') {
        finalSettings[key] = userSettings[key];
        sources[key] = 'user';
      }
    });
  }
  
  return {
    ...finalSettings,
    _sources: sources,
    _envDefaults: envDefaults,
    _locks: locks,
    _allowOverride: allowOverride
  };
}

// Read settings
router.get('/', async (req, res) => {
  try {
    const settings = await getMergedSettings();
    // Mask API key for security
    if (settings.apiKey) {
      const masked = settings.apiKey.substring(0, 8) + '*'.repeat(15) + settings.apiKey.slice(-3);
      settings.apiKeyMasked = masked;
      settings.apiKeyFull = settings.apiKey;
      delete settings.apiKey;
    }
    res.json(settings);
  } catch (error) {
    logger.error('Error loading settings', error.message);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Save settings
router.post('/', async (req, res) => {
  try {
    const locks = getLocks();
    const allowOverride = process.env.ALLOW_UI_OVERRIDE !== 'false';
    
    if (!allowOverride) {
      return res.status(403).json({ error: 'Settings modification disabled by administrator' });
    }
    
    // Load existing user settings
    const existingSettings = await loadUserSettings();
    
    // Merge with new settings, respecting locks
    const newSettings = { ...existingSettings };
    
    Object.keys(req.body).forEach(key => {
      if (!locks[key] && key !== '_sources' && key !== '_envDefaults' && key !== '_locks') {
        newSettings[key] = req.body[key];
      }
    });
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    logger.error('Error saving settings', error.message);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Reset specific setting to environment default
router.post('/reset/:setting', async (req, res) => {
  try {
    const { setting } = req.params;
    const userSettings = await loadUserSettings();
    
    // Remove the setting from user settings to fall back to env/default
    delete userSettings[setting];
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(userSettings, null, 2));
    res.json({ success: true, message: `Reset ${setting} to default` });
  } catch (error) {
    logger.error('Error resetting setting', error.message);
    res.status(500).json({ error: 'Failed to reset setting' });
  }
});

// Get favorites
router.get('/favorites', async (req, res) => {
  try {
    const settings = await getMergedSettings();
    res.json(settings.favorites || []);
  } catch (error) {
    logger.error('Error getting favorites', error.message);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Add favorite
router.post('/favorites', async (req, res) => {
  try {
    const { name, language, gender } = req.body;
    const userSettings = await loadUserSettings();
    const favorites = userSettings.favorites || [];
    
    // Check if already exists
    if (favorites.find(f => f.name === name)) {
      return res.status(400).json({ error: 'Voice already in favorites' });
    }
    
    // Check max limit (10)
    if (favorites.length >= 10) {
      return res.status(400).json({ error: 'Maximum 10 favorites allowed' });
    }
    
    favorites.push({ name, language, gender, addedAt: Date.now() });
    userSettings.favorites = favorites;
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(userSettings, null, 2));
    res.json(favorites);
  } catch (error) {
    logger.error('Error adding favorite', error.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove favorite
router.delete('/favorites/:voiceName', async (req, res) => {
  try {
    const userSettings = await loadUserSettings();
    const favorites = (userSettings.favorites || []).filter(f => f.name !== req.params.voiceName);
    userSettings.favorites = favorites;
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(userSettings, null, 2));
    res.json(favorites);
  } catch (error) {
    logger.error('Error removing favorite', error.message);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
