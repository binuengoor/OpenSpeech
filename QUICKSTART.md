# OpenSpeech - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Option 1: Automated Setup (Recommended)

```bash
./setup.sh
```

### Option 2: Manual Setup

```bash
# 1. Build the Docker image
docker-compose build

# 2. Start the application
docker-compose up -d

# 3. Open your browser
open http://localhost:3000
```

## ⚙️ First-Time Configuration

1. Click the **settings icon (⚙️)** in the top-right corner
2. Choose your TTS service:
   - **Official OpenAI**: Select this and enter your OpenAI API key
   - **Custom Endpoint**: Enter your OpenAI-compatible service URL
3. Click **Save Settings**
4. Click **Test Connection** to verify it works

## 📝 Basic Usage

1. **Upload or enter text**:
   - Drag and drop a document (TXT, HTML, DOCX, PDF) onto the upload zone
   - OR paste/type text directly in the text area
2. **Select your voice**:
   - Choose model (if multiple available)
   - Filter by language
   - Filter by gender
   - Select specific voice
3. **Adjust settings** (speed, format)
4. **Click "Generate Speech"**
5. **Monitor progress** in the real-time log viewer
6. **Play or download** the generated audio

## 🔧 Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Restart
docker-compose restart

# Rebuild after changes
docker-compose up -d --build
```

## 💡 Tips

- Text longer than 4096 characters is automatically split at sentence boundaries
- Enable "Combine audio" to merge chunks into one file
- Adjust speed from 0.25x to 4.0x
- Choose from multiple audio formats: MP3, Opus, AAC, FLAC

## 🐛 Troubleshooting

**Can't connect to service?**
- Verify your API key
- Check the endpoint URL
- Use `host.docker.internal` instead of `localhost` for local services

**Settings not saving?**
- Check that `./data` directory has proper permissions

**Audio generation fails?**
- Verify your API quota
- Check network connectivity
- View logs: `docker-compose logs -f`

## 📚 Full Documentation

See [README.md](README.md) for complete documentation.
