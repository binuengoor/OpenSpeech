const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const { convert: htmlToText } = require('html-to-text');
const logger = require('../utils/logger');

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../temp'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.txt', '.html', '.htm', '.docx', '.pdf'];
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/html'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats: TXT, HTML, DOCX, PDF'));
    }
  }
});

// Extract text from uploaded file
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    let extractedText = '';

    try {
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      // Extract text based on file extension (more reliable than mimetype)
      switch (fileExtension) {
        case '.txt':
          extractedText = await fs.readFile(filePath, 'utf8');
          break;

        case '.pdf':
          const pdfBuffer = await fs.readFile(filePath);
          const pdfData = await pdfParse(pdfBuffer);
          extractedText = pdfData.text;
          break;

        case '.docx':
          const docxResult = await mammoth.extractRawText({ path: filePath });
          extractedText = docxResult.value;
          break;

        case '.html':
        case '.htm':
          const htmlContent = await fs.readFile(filePath, 'utf8');
          extractedText = htmlToText(htmlContent, {
            wordwrap: false,
            preserveNewlines: true,
            selectors: [
              { selector: 'a', options: { ignoreHref: true } },
              { selector: 'img', format: 'skip' }
            ]
          });
          break;

        default:
          throw new Error('Unsupported file type. Please use TXT, HTML, DOCX, or PDF.');
      }

      // Clean up the uploaded file
      await fs.unlink(filePath);

      res.json({
        success: true,
        text: extractedText,
        filename: req.file.originalname,
        length: extractedText.length
      });

    } catch (extractError) {
      // Clean up on error
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      throw extractError;
    }

  } catch (error) {
    logger.error('Error extracting text from file', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to extract text from file' 
    });
  }
});

module.exports = router;
