const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const jobTracker = require('../services/jobTracker');
const fileMetadata = require('../services/fileMetadata');

const OUTPUT_DIR = path.join(__dirname, '../output');

// Get storage information
router.get('/info', async (req, res) => {
  try {
    const maxStorageMB = parseInt(process.env.MAX_STORAGE_MB) || 500;
    const files = await getOutputFiles();
    
    let totalSize = 0;
    for (const file of files) {
      totalSize += file.size;
    }
    
    const usedMB = totalSize / (1024 * 1024);
    const percentage = (usedMB / maxStorageMB) * 100;
    
    const sortedFiles = files.sort((a, b) => a.created - b.created);
    
    res.json({
      used: totalSize,
      usedMB: Math.round(usedMB * 10) / 10,
      maxMB: maxStorageMB,
      percentage: Math.round(percentage * 10) / 10,
      fileCount: files.length,
      oldestFile: sortedFiles.length > 0 ? sortedFiles[0].created : null,
      newestFile: sortedFiles.length > 0 ? sortedFiles[sortedFiles.length - 1].created : null
    });
  } catch (error) {
    logger.error('Error getting storage info', error.message);
    res.status(500).json({ error: 'Failed to get storage info' });
  }
});

// Get list of output files
router.get('/files', async (req, res) => {
  try {
    const files = await getOutputFiles();
    res.json(files);
  } catch (error) {
    logger.error('Error listing files', error.message);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get processing jobs
router.get('/processing-jobs', async (req, res) => {
  try {
    // Clean old jobs first
    await jobTracker.cleanOldJobs();
    const jobs = await jobTracker.getJobs();
    res.json(jobs);
  } catch (error) {
    logger.error('Error getting processing jobs', error.message);
    res.status(500).json({ error: 'Failed to get processing jobs' });
  }
});

// Get file metadata
router.get('/metadata', async (req, res) => {
  try {
    const metadata = await fileMetadata.getAll();
    res.json(metadata);
  } catch (error) {
    logger.error('Error getting file metadata', error.message);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

// Get metadata for specific file
router.get('/metadata/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const metadata = await fileMetadata.getByFilename(filename);
    if (metadata) {
      res.json(metadata);
    } else {
      res.status(404).json({ error: 'Metadata not found' });
    }
  } catch (error) {
    logger.error('Error getting file metadata', error.message);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
});

// Download text for specific file
router.get('/text/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const metadata = await fileMetadata.getByFilename(filename);
    
    if (metadata && metadata.text) {
      // Remove audio extension and add .txt
      const txtFilename = filename.replace(/\.(mp3|wav|opus|aac|flac)$/, '.txt');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${txtFilename}"`);
      res.send(metadata.text);
    } else {
      res.status(404).json({ error: 'Text not found' });
    }
  } catch (error) {
    logger.error('Error downloading text', error.message);
    res.status(500).json({ error: 'Failed to download text' });
  }
});

// Download a specific file
router.get('/files/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // Security: prevent path traversal
    const filePath = path.join(OUTPUT_DIR, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    res.download(filePath);
  } catch (error) {
    logger.error('Error downloading file', error.message);
    res.status(404).json({ error: 'File not found' });
  }
});

// Rename a specific file
router.put('/files/:filename', async (req, res) => {
  try {
    const oldFilename = path.basename(req.params.filename); // Security: prevent path traversal
    const newFilename = path.basename(req.body.newName); // Security: prevent path traversal
    
    if (!newFilename) {
      return res.status(400).json({ error: 'New filename is required' });
    }
    
    const oldPath = path.join(OUTPUT_DIR, oldFilename);
    const newPath = path.join(OUTPUT_DIR, newFilename);
    
    // Check if old file exists
    await fs.access(oldPath);
    
    // Check if new filename already exists
    try {
      await fs.access(newPath);
      return res.status(400).json({ error: 'A file with this name already exists' });
    } catch (err) {
      // File doesn't exist, which is what we want
    }
    
    // Rename the file
    await fs.rename(oldPath, newPath);
    
    // Update metadata filename
    await fileMetadata.updateFilename(oldFilename, newFilename);
    
    res.json({ success: true, message: 'File renamed successfully', newName: newFilename });
  } catch (error) {
    logger.error('Error renaming file', error.message);
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

// Delete a specific file
router.delete('/files/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // Security: prevent path traversal
    const filePath = path.join(OUTPUT_DIR, filename);
    
    await fs.unlink(filePath);
    
    // Remove metadata
    await fileMetadata.removeFile(filename);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Error deleting file', error.message);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Delete all files
router.delete('/files', async (req, res) => {
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    
    for (const file of files) {
      const filePath = path.join(OUTPUT_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await fs.unlink(filePath);
      }
    }
    
    // Clear all processing jobs and metadata
    await jobTracker.removeAllJobs();
    await fileMetadata.removeAll();
    
    res.json({ success: true, message: 'All files deleted successfully', count: files.length });
  } catch (error) {
    logger.error('Error deleting all files', error.message);
    res.status(500).json({ error: 'Failed to delete files' });
  }
});

// Helper function to get all output files with metadata
async function getOutputFiles() {
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    return [];
  }
  
  const files = await fs.readdir(OUTPUT_DIR);
  const fileList = [];
  
  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isFile()) {
      fileList.push({
        name: file,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        created: stat.birthtime,
        createdFormatted: formatDate(stat.birthtime),
        modified: stat.mtime,
        extension: path.extname(file).substring(1)
      });
    }
  }
  
  // Sort by creation date, newest first
  return fileList.sort((a, b) => b.created - a.created);
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const hours = diff / (1000 * 60 * 60);
  
  if (hours < 24) {
    return 'Today';
  } else if (hours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
}

module.exports = router;
