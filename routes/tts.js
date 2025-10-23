const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const ttsService = require('../services/ttsService');
const textSplitter = require('../services/textSplitter');
const audioStitcher = require('../services/audioStitcher');
const jobQueue = require('../services/jobQueue');
const jobTracker = require('../services/jobTracker');
const fileMetadata = require('../services/fileMetadata');

const OUTPUT_DIR = path.join(__dirname, '../output');

// Get available models
router.post('/models', async (req, res) => {
  try {
    const { endpoint, apiKey } = req.body;
    const models = await ttsService.getModels(endpoint, apiKey);
    res.json(models);
  } catch (error) {
    logger.error('Error fetching models', error.message);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get available voices from the configured endpoint
router.post('/voices', async (req, res) => {
  try {
    const { endpoint, apiKey } = req.body;
    const voices = await ttsService.getVoices(endpoint, apiKey);
    res.json(voices);
  } catch (error) {
    logger.error('Error fetching voices', error.message);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// Get all available voices with details (language, gender)
router.post('/voices/all', async (req, res) => {
  try {
    const { endpoint, apiKey } = req.body;
    const voicesData = await ttsService.getAllVoices(endpoint, apiKey);
    res.json(voicesData);
  } catch (error) {
    logger.error('Error fetching all voices', error.message);
    res.status(500).json({ error: 'Failed to fetch all voices' });
  }
});

// Generate TTS audio
router.post('/generate', async (req, res) => {
  try {
    const { text, settings, voice, speed, format, combineAudio, model, customFilename } = req.body;

    if (!text || !settings) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Capture request timestamp at the very beginning
    const requestTimestamp = Date.now();
    const requestDate = new Date(requestTimestamp);
    
    // Split text into chunks
    const chunks = textSplitter.splitText(text);
    const textPreview = text.substring(0, 30).replace(/\n/g, ' ');
    const logContext = `🎤 ${voice} "${textPreview}..."`;
    
    // Add job to tracker with request timestamp and full text
    await jobTracker.addJob({ voice, textPreview, text, requestTimestamp });
    
    logger.info(`Split text into ${chunks.length} chunk(s)`, null, logContext);

    // Generate audio for each chunk
    const audioFiles = [];
    for (let i = 0; i < chunks.length; i++) {
      logger.info(`Generating audio for chunk ${i + 1}/${chunks.length}`, null, logContext);
      const audioData = await ttsService.generateSpeech(
        chunks[i],
        settings,
        voice,
        speed,
        format,
        model
      );
      audioFiles.push(audioData);
    }

    // Generate filename with request timestamp and voice
    const timestamp = requestDate.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .split('.')[0];
    
    // Use custom filename if provided, otherwise use voice name
    const filenamePart = customFilename ? `${customFilename}-${voice}` : voice;
    const filename = `${timestamp}-${filenamePart}.${format || 'mp3'}`;
    
    // If combining audio and there are multiple chunks
    let finalAudio;
    
    if (combineAudio && audioFiles.length > 1) {
      logger.info('Stitching audio files together...', null, logContext);
      finalAudio = await audioStitcher.stitchAudio(audioFiles, format);
    } else if (audioFiles.length === 1) {
      finalAudio = audioFiles[0];
    } else {
      // Multiple chunks but not combining - save first one for now
      finalAudio = audioFiles[0];
    }
    
    // Save to output directory if file management is enabled
    if (process.env.ENABLE_FILE_MANAGEMENT !== 'false') {
      try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        const outputPath = path.join(OUTPUT_DIR, filename);
        await fs.writeFile(outputPath, finalAudio);
        logger.success(`Saved audio to: ${filename}`, null, logContext);
        
        // Save metadata with request timestamp
        await fileMetadata.addFile({
          filename: filename,
          voice: voice,
          text: text,
          speed: speed,
          format: format || 'mp3',
          chunks: chunks.length,
          combined: combineAudio && audioFiles.length > 1,
          requestedAt: requestTimestamp
        });
        
        // Remove job from tracker after successful save
        await jobTracker.removeJob(voice, textPreview);
      } catch (saveError) {
        logger.error('Error saving audio file:', saveError.message, logContext);
        // Remove job from tracker even on error
        await jobTracker.removeJob(voice, textPreview);
        // Continue anyway, user can still download
      }
    } else {
      // Remove job from tracker if file management is disabled
      await jobTracker.removeJob(voice, textPreview);
    }
    
    logger.success('TTS generation completed', null, logContext);
    
    res.json({
      success: true,
      audioData: finalAudio.toString('base64'),
      format: format || 'mp3',
      chunks: chunks.length,
      combined: combineAudio && audioFiles.length > 1,
      filename: filename
    });
  } catch (error) {
    logger.error('Error generating TTS:', error.message);
    
    // Remove job from tracker on error
    try {
      const textPreview = text.substring(0, 30).replace(/\n/g, ' ');
      await jobTracker.removeJob(voice, textPreview);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Queue a TTS job
router.post('/queue', async (req, res) => {
  try {
    const { text, settings, voice, speed, format, combineAudio, model } = req.body;

    if (!text || !settings) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create job processor function
    const processor = async (job) => {
      const chunks = textSplitter.splitText(text);
      jobQueue.updateJobProgress(job.id, 10, `Split into ${chunks.length} chunks`);

      const audioFiles = [];
      for (let i = 0; i < chunks.length; i++) {
        const progress = 10 + ((i / chunks.length) * 70);
        jobQueue.updateJobProgress(job.id, Math.round(progress), `Processing chunk ${i + 1}/${chunks.length}`);
        
        const audioData = await ttsService.generateSpeech(
          chunks[i],
          settings,
          voice,
          speed,
          format,
          model
        );
        audioFiles.push(audioData);
      }

      jobQueue.updateJobProgress(job.id, 80, 'Combining audio...');

      let finalAudio;
      if (combineAudio && audioFiles.length > 1) {
        finalAudio = await audioStitcher.stitchAudio(audioFiles, format);
      } else {
        finalAudio = audioFiles[0];
      }

      jobQueue.updateJobProgress(job.id, 90, 'Saving file...');

      // Generate filename
      const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .split('.')[0];
      
      // Use custom filename if provided, otherwise use voice name
      const filenamePart = job.customFilename ? `${job.customFilename}-${voice}` : voice;
      const filename = `${timestamp}-${filenamePart}.${format || 'mp3'}`;

      // Save to output directory
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      const outputPath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(outputPath, finalAudio);

      job.result = {
        filename,
        chunks: chunks.length,
        combined: combineAudio && audioFiles.length > 1
      };

      jobQueue.updateJobProgress(job.id, 100, 'Complete!');
    };

    const jobId = jobQueue.addJob({
      type: 'tts',
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      voice,
      customFilename,
      processor
    });

    res.json({
      success: true,
      jobId,
      message: 'Job queued successfully'
    });
  } catch (error) {
    logger.error('Error queuing TTS job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get queue status
router.get('/queue/status', (req, res) => {
  res.json(jobQueue.getStatus());
});

// Get all jobs
router.get('/queue/jobs', (req, res) => {
  res.json(jobQueue.getAllJobs());
});

// Get specific job
router.get('/queue/job/:id', (req, res) => {
  const job = jobQueue.getJob(parseInt(req.params.id));
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Cancel a job
router.delete('/queue/job/:id', (req, res) => {
  const cancelled = jobQueue.cancelJob(parseInt(req.params.id));
  if (cancelled) {
    res.json({ success: true, message: 'Job cancelled' });
  } else {
    res.status(404).json({ error: 'Job not found or cannot be cancelled' });
  }
});

module.exports = router;
