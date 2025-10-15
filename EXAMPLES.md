# OpenSpeech - Usage Examples

## Example 1: Using Official OpenAI TTS

### Configuration:
- **Service Type**: Official OpenAI
- **API Key**: `sk-proj-...` (your OpenAI API key)

### Sample Text:
```
Welcome to OpenSpeech, a powerful text-to-speech application. This example demonstrates how to convert text into natural-sounding speech using OpenAI's advanced TTS technology.
```

### Settings:
- **Voice**: nova (female, en-US)
- **Speed**: 1.0x
- **Format**: MP3
- **Combine Audio**: ✓ Enabled

---

## Example 2: Long Text with Auto-Splitting

### Sample Text (10,000+ characters):
```
In the realm of artificial intelligence, text-to-speech technology has made remarkable advances. These systems can now produce speech that is nearly indistinguishable from human voices, with natural intonation, emotion, and clarity.

The journey of TTS technology began decades ago with robotic, mechanical-sounding voices. Early systems used concatenative synthesis, piecing together pre-recorded sound fragments. While functional, these systems lacked the naturalness and expressiveness of human speech.

Modern TTS systems leverage deep learning and neural networks to generate speech that captures the nuances of human communication. These systems analyze vast amounts of speech data, learning patterns of pronunciation, rhythm, and intonation. The result is synthetic speech that sounds remarkably human-like.

[Continue with much more text...]

The future of text-to-speech technology holds exciting possibilities. As AI continues to advance, we can expect even more natural, expressive, and personalized synthetic voices. These developments will further democratize access to information and communication, making technology more accessible to everyone.
```

### What Happens:
- ✅ Text is automatically split into ~3 chunks at sentence boundaries
- ✅ Each chunk is processed separately via TTS API
- ✅ All audio files are seamlessly stitched into one continuous track
- ✅ Final output plays as a single, uninterrupted audio stream

---

## Example 3: Using OpenAI-Compatible Endpoint (Azure Edge TTS)

### Configuration:
- **Service Type**: OpenAI-Compatible Endpoint
- **Custom Endpoint**: `http://localhost:8080`
- **API Key**: (any value, or leave blank if not required)

### Available Voices (auto-populated):
After saving settings, the application queries `/v1/voices` and discovers:
- en-US-JennyNeural (Female, American English)
- en-GB-SoniaNeural (Female, British English)
- fr-FR-DeniseNeural (Female, French)
- de-DE-KatjaNeural (Female, German)
- es-ES-ElviraNeural (Female, Spanish)
- And many more...

### Sample Text:
```
Bonjour! This is a multilingual example. OpenSpeech works with various TTS services, including self-hosted solutions like Azure Edge TTS. You can generate speech in multiple languages with different voices and accents.
```

### Settings:
- **Voice**: en-GB-SoniaNeural
- **Speed**: 1.2x (slightly faster)
- **Format**: Opus
- **Combine Audio**: ✓ Enabled

---

## Example 4: Multiple Audio Formats

### MP3 (Default)
- **Best for**: General use, compatibility
- **File size**: Medium
- **Quality**: High

### Opus
- **Best for**: Low bandwidth, streaming
- **File size**: Smallest
- **Quality**: Excellent for speech

### AAC
- **Best for**: Apple devices, iTunes
- **File size**: Medium
- **Quality**: High

### FLAC
- **Best for**: Archival, maximum quality
- **File size**: Largest
- **Quality**: Lossless

---

## Example 5: Speed Variations

### 0.5x - Slow (Learning/Accessibility)
```
Perfect for language learning, elderly users, or complex technical content.
```

### 1.0x - Normal (Default)
```
Natural speaking pace, ideal for most content including articles, books, and general text.
```

### 1.5x - Fast (Efficiency)
```
Great for consuming large amounts of content quickly while maintaining clarity and comprehension.
```

### 2.0x+ - Very Fast (Advanced)
```
For experienced listeners who want to maximize content consumption speed.
```

---

## Example 6: Podcast Episode Creation

### Use Case: Converting Blog Post to Audio

```
[Episode Title] The Future of AI in 2025

[Introduction]
Welcome to TechTalk podcast. Today we're exploring the fascinating developments in artificial intelligence that are shaping our world.

[Main Content]
Artificial intelligence has reached new heights in 2025. From advanced language models to sophisticated computer vision systems, AI is transforming industries and daily life.

[Section 1: Natural Language Processing]
Recent breakthroughs in NLP have enabled machines to understand context, nuance, and even emotion in human communication...

[Section 2: Computer Vision]
Visual AI systems can now analyze complex scenes with unprecedented accuracy...

[Section 3: Ethical Considerations]
As AI becomes more powerful, questions about ethics, privacy, and control become increasingly important...

[Conclusion]
The future of AI is bright, but it requires careful stewardship and thoughtful development...

[Outro]
Thanks for listening to TechTalk. Subscribe for more insights into emerging technology.
```

### Settings:
- **Voice**: onyx (professional male voice)
- **Speed**: 1.1x
- **Format**: MP3
- **Result**: Professional podcast episode ready for distribution

---

## Example 7: Accessibility Use Case

### Converting Website Content for Visually Impaired Users

```
[Page Title] Product Documentation - Getting Started

[Navigation]
You are on the Getting Started page. Main sections include: Installation, Configuration, Basic Usage, and Troubleshooting.

[Content]
Welcome to our product documentation. This guide will help you get started quickly and efficiently.

Installation Instructions:
Step 1: Download the installer from our website
Step 2: Run the installer and follow the on-screen prompts
Step 3: Launch the application from your applications folder

Configuration:
On first launch, you'll be prompted to configure basic settings...

[Continue with full page content...]
```

### Settings:
- **Voice**: Clear, professional voice
- **Speed**: 1.0x (natural pace)
- **Format**: MP3
- **Combine Audio**: ✓ Enabled for seamless experience

---

## Tips for Best Results

1. **Text Preparation**:
   - Remove special characters that might confuse TTS
   - Use proper punctuation for natural pauses
   - Write numbers as words for better pronunciation

2. **Voice Selection**:
   - Choose voices that match your content (professional, friendly, etc.)
   - Test different voices to find the best fit
   - Consider language and accent preferences

3. **Speed Optimization**:
   - Start at 1.0x and adjust based on content type
   - Use slower speeds for technical or complex content
   - Use faster speeds for familiar or light content

4. **Quality Settings**:
   - Use MP3 for general purpose
   - Use FLAC for maximum quality
   - Use Opus for streaming/bandwidth efficiency

5. **Long Text Handling**:
   - Let the auto-splitting feature handle long content
   - Enable audio combining for seamless playback
   - Check the chunk count estimate before generating

---

## Troubleshooting Common Issues

### "Generation failed"
- Verify API key is correct
- Check API quota/limits
- Ensure internet connectivity

### "Connection test failed"
- Double-check endpoint URL
- Verify API service is running
- Check firewall/network settings

### "Audio sounds choppy"
- Issue with stitching - check FFmpeg installation
- Try disabling combine audio to test individual chunks
- Verify sufficient disk space

### "Voice not available"
- Refresh voice list by saving settings again
- Check if endpoint supports the voice
- Try using a different voice

---

## Advanced Use Cases

### Batch Processing
Create a simple script to process multiple texts:
```bash
# Example: Convert multiple articles
for file in articles/*.txt; do
    curl -X POST http://localhost:3000/api/tts/generate \
      -H "Content-Type: application/json" \
      -d @"$file"
done
```

### Integration with Other Tools
- Combine with web scrapers to convert articles
- Use with note-taking apps for audio versions
- Integrate into learning management systems

### Automation
- Schedule nightly conversions of new content
- Create audio versions of email newsletters
- Generate audio summaries of reports

---

**Enjoy using OpenSpeech! 🔊**
