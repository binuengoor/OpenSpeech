const axios = require('axios');
const logger = require('../utils/logger');

class TTSService {
  /**
   * Get available models
   */
  async getModels(endpoint, apiKey) {
    try {
      // Determine the base URL
      let baseURL;
      if (endpoint && endpoint !== 'openai') {
        baseURL = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      } else {
        baseURL = 'https://api.openai.com';
      }

      try {
        const response = await axios.get(`${baseURL}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        logger.warn('Models endpoint not available, using defaults');
      }

      // Fallback to default models
      return [
        { id: 'tts-1', object: 'model' },
        { id: 'tts-1-hd', object: 'model' }
      ];
    } catch (error) {
      logger.error('Error fetching models', error.message);
      return [];
    }
  }

  /**
   * Get all available voices with details (language, gender)
   */
  async getAllVoices(endpoint, apiKey) {
    try {
      // Determine the base URL
      let baseURL;
      if (endpoint && endpoint !== 'openai') {
        baseURL = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      } else {
        baseURL = 'https://api.openai.com';
      }

      // Try to get all voices from /v1/voices/all endpoint
      try {
        const response = await axios.get(`${baseURL}/v1/voices/all`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.voices) {
          return response.data;
        }
      } catch (error) {
        logger.warn('Voices/all endpoint not available, using defaults');
      }

      // Fallback to default voices
      return {
        voices: this.getDefaultVoices()
      };
    } catch (error) {
      logger.error('Error fetching all voices', error.message);
      return { voices: this.getDefaultVoices() };
    }
  }

  /**
   * Get available voices from the TTS service
   */
  async getVoices(endpoint, apiKey) {
    try {
      // Determine the base URL
      let baseURL;
      if (endpoint && endpoint !== 'openai') {
        baseURL = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      } else {
        baseURL = 'https://api.openai.com';
      }

      // Try to get voices from /v1/voices endpoint (for compatible services)
      try {
        const response = await axios.get(`${baseURL}/v1/voices`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.voices) {
          return response.data.voices;
        }
      } catch (error) {
        logger.warn('Custom voices endpoint not available, using defaults');
      }

      // Fallback to OpenAI standard voices
      return this.getDefaultVoices();
    } catch (error) {
      logger.error('Error fetching voices', error.message);
      return this.getDefaultVoices();
    }
  }

  /**
   * Get default OpenAI voices
   */
  getDefaultVoices() {
    return [
      { name: 'alloy', language: 'en-US', gender: 'neutral' },
      { name: 'echo', language: 'en-US', gender: 'male' },
      { name: 'fable', language: 'en-US', gender: 'neutral' },
      { name: 'onyx', language: 'en-US', gender: 'male' },
      { name: 'nova', language: 'en-US', gender: 'female' },
      { name: 'shimmer', language: 'en-US', gender: 'female' }
    ];
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(text, settings, voice, speed = 1.0, format = 'mp3', model = 'tts-1') {
    try {
      // Determine the base URL
      let baseURL;
      if (settings.serviceType === 'custom' && settings.customEndpoint) {
        baseURL = settings.customEndpoint.endsWith('/') 
          ? settings.customEndpoint.slice(0, -1) 
          : settings.customEndpoint;
      } else {
        baseURL = 'https://api.openai.com';
      }

      const url = `${baseURL}/v1/audio/speech`;

      // Prepare request payload
      const payload = {
        model: model || 'tts-1',
        input: text,
        voice: voice || 'alloy',
        response_format: format || 'mp3',
        speed: speed || 1.0
      };

      logger.info(`Making TTS request to: ${url}`);
      
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Error generating speech', error.response?.data || error.message);
      throw new Error(`TTS generation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = new TTSService();
