class TextSplitter {
  /**
   * Split text into chunks that respect the character limit
   * Splits at sentence boundaries to maintain natural speech flow
   */
  splitText(text, maxChars = 4096) {
    if (!text || text.length === 0) {
      return [];
    }

    // If text is within limit, return as single chunk
    if (text.length <= maxChars) {
      return [text];
    }

    const chunks = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      // Calculate the end position for this chunk
      let endPosition = currentPosition + maxChars;

      // If this is the last chunk, just take the rest
      if (endPosition >= text.length) {
        chunks.push(text.substring(currentPosition).trim());
        break;
      }

      // Find the last sentence ending before the limit
      const chunk = text.substring(currentPosition, endPosition);
      
      // Look for sentence-ending punctuation (., !, ?, ..., !!, ??)
      const sentenceEndings = [
        '. ', '.\n', '.\r',
        '! ', '!\n', '!\r',
        '? ', '?\n', '?\r',
        '." ', '.\' ',
        '!" ', '!\' ',
        '?" ', '?\' '
      ];

      let splitIndex = -1;
      
      // Find the last occurrence of any sentence ending
      for (const ending of sentenceEndings) {
        const index = chunk.lastIndexOf(ending);
        if (index > splitIndex) {
          splitIndex = index + ending.length;
        }
      }

      // If no sentence ending found, try to split at last space
      if (splitIndex === -1) {
        splitIndex = chunk.lastIndexOf(' ');
        if (splitIndex !== -1) {
          splitIndex += 1; // Include the space
        }
      }

      // If still no good split point, force split at maxChars
      if (splitIndex === -1) {
        splitIndex = maxChars;
      }

      // Add the chunk
      const actualEnd = currentPosition + splitIndex;
      chunks.push(text.substring(currentPosition, actualEnd).trim());
      
      // Move to next position
      currentPosition = actualEnd;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Get statistics about how text would be split
   */
  getSplitStats(text, maxChars = 4096) {
    const chunks = this.splitText(text, maxChars);
    return {
      totalLength: text.length,
      numChunks: chunks.length,
      chunkSizes: chunks.map(c => c.length),
      averageChunkSize: chunks.length > 0 
        ? Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)
        : 0
    };
  }
}

module.exports = new TextSplitter();
