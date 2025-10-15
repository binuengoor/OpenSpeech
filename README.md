# OpenSpeech 🔊

A Dockerized Text-to-Speech Web Application that converts text into high-quality speech audio using OpenAI's TTS API or any OpenAI-compatible TTS endpoint.

## Features

### Core TTS Functionality
- **Flexible TTS Service Configuration**: Works with official OpenAI API or any OpenAI-compatible endpoint (e.g., [travisvn/openai-edge-tts](https://github.com/travisvn/openai-edge-tts))
- **Advanced Voice Selection**: Cascading filters with Model → Language → Gender → Voice selection
- **Dynamic Voice Discovery**: Automatically queries available voices, models, and detailed voice data from custom endpoints
- **Intelligent Text Splitting**: Automatically splits long text into chunks at sentence boundaries (respects 4096 character limit)
- **Audio Stitching**: Seamlessly combines multiple audio chunks into a single continuous track

### Modern UI/UX
- **Collapsible Sidebar**: Clean, space-efficient interface with all controls in an expandable sidebar
- **Dark/Light Mode**: Automatic theme detection with manual toggle option
- **Drag-and-Drop File Upload**: Modern file upload interface for easy document text extraction
- **Real-time Log Viewer**: Live WebSocket-based log stream showing backend activity
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### File Management
- **Document Upload & Text Extraction**: Upload TXT, HTML, DOCX, or PDF files to extract text
- **Persistent File Storage**: Generated audio files are saved and can be played, downloaded, renamed, or deleted
- **File Rename**: Rename output files directly from the web interface
- **Timestamp-based Naming**: Files automatically named as `YYYYMMDDHHMMSS-voice.ext` for easy organization

### Advanced Features
- **Multiple Audio Formats**: Support for MP3, Opus, AAC, and FLAC output formats
- **Variable Speech Speed**: Adjust playback speed from 0.25x to 4.0x
- **Environment Variable Priority**: Hybrid configuration system supporting both env vars and user settings
- **Single-User Application**: No authentication required, perfect for personal use
- **Docker Deployment**: Easy deployment with Docker and Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system
- An OpenAI API key OR access to an OpenAI-compatible TTS service

### Installation

#### Option 1: Using Pre-built Docker Image (Recommended)

1. **Pull the latest image from GitHub Container Registry**:
   ```bash
   docker pull ghcr.io/binuengoor/openspeech:latest
   ```

2. **Create a docker-compose.yml file**:
   ```yaml
   version: '3.8'
   
   services:
     openspeech:
       image: ghcr.io/binuengoor/openspeech:latest
       container_name: openspeech
       ports:
         - "3000:3000"
       volumes:
         - ./data:/app/data
         - ./output:/app/output
       environment:
         - NODE_ENV=production
       restart: unless-stopped
   ```

3. **Start the container**:
   ```bash
   docker-compose up -d
   ```

#### Option 2: Build from Source

1. **Clone or download this repository**:
   ```bash
   git clone <repository-url>
   cd OpenSpeech
   ```

2. **Copy the example settings file**:
   ```bash
   cp data/settings.example.json data/settings.json
   ```

3. **Build and start the Docker container**:
   ```bash
   docker-compose up -d
   ```

4. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

5. **Configure your TTS service** (first-time setup):
   - Click the settings icon (⚙️) in the top-right corner
   - Choose your TTS service type:
     - **Official OpenAI**: Use `api.openai.com`
     - **OpenAI-Compatible Endpoint**: Enter your custom URL (e.g., `http://localhost:8080`)
   - Enter your API key
   - Click "Save Settings"
   - Optionally click "Test Connection" to verify

### Usage

1. **Upload or Enter Text**:
   - **Option A**: Drag and drop a document file (TXT, HTML, DOCX, PDF) onto the upload zone
   - **Option B**: Type or paste text directly into the text area
   - The app shows character count and estimated chunks for long text

2. **Select Voice Options**:
   - Choose a model from the dropdown (if multiple models available)
   - Filter by language to narrow down voice options
   - Filter by gender (Male, Female, Neutral) if available
   - Select your desired voice from the filtered list
   - Adjust speech speed (0.25x to 4.0x)
   - Select audio format (MP3, Opus, AAC, or FLAC)

3. **Generate Speech**:
   - Ensure "Combine audio into a single file" is checked (recommended)
   - Click "Generate Speech"
   - Monitor progress in the real-time log viewer
   - Audio player appears when ready

4. **Manage Audio Files**:
   - Use the built-in audio player to listen
   - View all generated files in the "Generated Files" section
   - Play, download, rename, or delete files directly from the interface
   - Files are automatically named with timestamp and voice name

## Configuration

### First-Time Setup

On first run, the application creates a `data/settings.json` file from `data/settings.example.json`. You can:

1. **Configure via Web UI**: Use the settings modal (⚙️ icon) to set up your TTS service
2. **Pre-configure**: Copy `data/settings.example.json` to `data/settings.json` and edit before starting

**Important**: The `data/settings.json` file is excluded from git and contains your personal API keys and endpoints. Never commit this file to version control.

### Environment Variables

The application can be configured using environment variables in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production  # Enables production optimizations
  - PORT=3000            # Change default port if needed
  - DEFAULT_THEME=system # Default theme: system, light, or dark
```

Note: `NODE_ENV=production` is recommended for Docker deployments as it:
- Reduces error stack traces in responses (security)
- Optimizes Express.js performance
- Sets appropriate caching headers

### Volume Mounts

The application uses Docker volumes for persistence:

- `./data`: Stores application settings (settings.json)
- `./output`: Stores generated audio files (if needed)

### Custom Port

To run on a different port, modify `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Run on port 8080 instead
```

## Using with OpenAI-Compatible Services

### Example: travisvn/openai-edge-tts

1. **Start your self-hosted TTS service**:
   ```bash
   # In another directory
   docker run -p 8080:8080 travisvn/openai-edge-tts
   ```

2. **Configure OpenSpeech**:
   - Service Type: OpenAI-Compatible Endpoint
   - Custom Endpoint: `http://host.docker.internal:8080`
   - API Key: (enter any value if not required by your service)

3. **The application will**:
   - Query `/v1/voices` to discover available voices
   - Populate the UI with discovered voices and languages
   - Support all Azure Edge TTS voices and features

## Text Splitting Logic

The application intelligently handles long text:

- **Limit**: 4096 characters per chunk (configurable)
- **Splitting**: Always splits at sentence boundaries (., !, ?)
- **Smart Detection**: Finds the last complete sentence before the limit
- **Fallback**: Falls back to word boundaries if no sentence ending found
- **Preservation**: Maintains natural speech flow and pauses

## Audio Stitching

When text is split into multiple chunks:

- Each chunk is processed separately via TTS API
- Individual audio files are generated
- FFmpeg combines them seamlessly (if option enabled)
- Final output is a single, continuous audio track
- No gaps or interruptions between chunks

## Real-Time Logging

The application includes a live log viewer in the sidebar:

- **WebSocket Connection**: Real-time log streaming via WebSocket at `/logs`
- **Color-Coded Messages**: Info (blue), Success (green), Warnings (yellow), Errors (red)
- **Auto-Scroll**: Automatically scrolls to latest messages
- **Buffered History**: New connections receive last 100 log messages
- **Auto-Reconnect**: WebSocket automatically reconnects on disconnect
- **Progress Tracking**: Monitor TTS generation progress, chunk processing, and audio stitching in real-time

## API Endpoints

The application exposes the following REST API endpoints:

### Settings

- `GET /api/settings` - Retrieve current settings
- `POST /api/settings` - Save settings

### TTS

- `POST /api/tts/voices` - Get available voices from configured service
- `POST /api/tts/generate` - Generate speech from text
- `POST /api/tts/test-connection` - Test connection to TTS service

### File Management

- `GET /api/files` - List all generated audio files
- `POST /api/upload` - Upload and extract text from documents (TXT, HTML, DOCX, PDF)
- `DELETE /api/files/:filename` - Delete a specific audio file
- `PUT /api/files/:filename/rename` - Rename a file (preserves extension)

### WebSocket

- `WS /logs` - Real-time log stream for monitoring backend operations

## Development

### Local Development (without Docker)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create required directories**:
   ```bash
   mkdir -p temp output data
   ```

3. **Start the server**:
   ```bash
   npm start
   # or for auto-reload:
   npm run dev
   ```

4. **Access the app**: `http://localhost:3000`

### Project Structure

```
OpenSpeech/
├── server.js                 # Express server with WebSocket support
├── routes/
│   ├── settings.js          # Settings management endpoints
│   ├── tts.js               # TTS generation endpoints
│   ├── files.js             # File management endpoints
│   └── upload.js            # Document upload & text extraction
├── services/
│   ├── ttsService.js        # TTS API integration
│   ├── textSplitter.js      # Intelligent text chunking
│   └── audioStitcher.js     # Audio file combining (FFmpeg)
├── utils/
│   └── logger.js            # WebSocket-based logging system
├── public/
│   ├── index.html           # Main web interface
│   ├── app.js               # Client-side JavaScript (with WebSocket)
│   └── styles.css           # Styling with dark/light themes
├── data/                    # Persistent settings storage
├── temp/                    # Temporary audio processing files
├── output/                  # Generated audio files
├── Dockerfile               # Docker image definition
├── docker-compose.yml       # Docker Compose configuration
└── package.json             # Node.js dependencies
```

## Troubleshooting

### Connection Issues

- **"Connection test failed"**: Verify your API key and endpoint URL
- **"Error loading voices"**: Check that your TTS service is running and accessible
- **Docker networking**: Use `host.docker.internal` instead of `localhost` when connecting to services on the host machine
- **Log viewer not connecting**: Check WebSocket connection in browser console; ensure port 3000 is accessible

### Audio Generation Issues

- **"Generation failed"**: Check API key and quota limits; monitor real-time logs for detailed error messages
- **"Audio stitching failed"**: Ensure FFmpeg is properly installed in the container
- **Long processing times**: Normal for large text; watch the log viewer for progress updates
- **Large file upload fails**: Supported formats are TXT, HTML, DOCX, and PDF only; check file size limits

### File Management Issues

- **Upload not working**: Ensure drag-and-drop zone is visible; check supported formats (TXT, HTML, DOCX, PDF)
- **Cannot rename files**: Extension is automatically preserved; only filename can be changed
- **Files not persisting**: Ensure the `./output` volume is properly mounted in docker-compose.yml

### Settings Not Persisted

- Ensure the `./data` volume is properly mounted
- Check file permissions on the host machine

## Key Technologies

- **Backend Framework**:
  - Express.js - Web server framework
  - ws - WebSocket server for real-time logging
  - Axios - HTTP client for TTS API calls

- **File Processing**:
  - Mammoth - DOCX document parsing
  - pdf-parse (v1.1.1) - PDF text extraction
  - html-to-text - HTML to plain text conversion
  - Multer - Multipart file upload handling

- **Audio Processing**:
  - FFmpeg - Audio file manipulation and stitching
  - Fluent-ffmpeg - Node.js FFmpeg wrapper

- **System Requirements**:
  - Node.js 18+
  - FFmpeg (included in Docker image)

## License

MIT License - Feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

- OpenAI for the TTS API
- [travisvn/openai-edge-tts](https://github.com/travisvn/openai-edge-tts) for OpenAI-compatible endpoint inspiration
- FFmpeg for audio processing capabilities

## Support

For issues, questions, or feature requests, please open an issue on the repository.

---

**Made with ❤️ for the open-source community**
