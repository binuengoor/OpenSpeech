const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');

// Generate UUID v4 manually
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class AudioStitcher {
  /**
   * Stitch multiple audio buffers into a single file
   */
  async stitchAudio(audioBuffers, format = 'mp3') {
    const tempDir = path.join(__dirname, '../temp');
    const sessionId = uuidv4();
    const tempFiles = [];
    const listFile = path.join(tempDir, `${sessionId}_list.txt`);
    const outputFile = path.join(tempDir, `${sessionId}_output.${format}`);

    try {
      // Save all audio buffers to temporary files
      for (let i = 0; i < audioBuffers.length; i++) {
        const tempFile = path.join(tempDir, `${sessionId}_chunk_${i}.${format}`);
        await fs.writeFile(tempFile, audioBuffers[i]);
        tempFiles.push(tempFile);
      }

      // Create concat list file for ffmpeg
      const listContent = tempFiles.map(file => `file '${file}'`).join('\n');
      await fs.writeFile(listFile, listContent);

      // Use ffmpeg to concatenate audio files
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(listFile)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions(['-c copy'])
          .output(outputFile)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      // Read the combined audio file
      const combinedBuffer = await fs.readFile(outputFile);

      // Clean up temporary files
      await this.cleanup([...tempFiles, listFile, outputFile]);

      return combinedBuffer;
    } catch (error) {
      // Clean up on error
      await this.cleanup([...tempFiles, listFile, outputFile]);
      throw new Error(`Audio stitching failed: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(files) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }
}

module.exports = new AudioStitcher();
