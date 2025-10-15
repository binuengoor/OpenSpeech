# OpenSpeech Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Frontend (index.html)                   │  │
│  │                                                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │  │Settings  │ │Cascading │ │File Mgmt │ │  Text Input  │ │  │
│  │  │  Panel   │ │  Voice   │ │  & Drag  │ │  & Player    │ │  │
│  │  │          │ │ Filters  │ │   Drop   │ │              │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │           app.js (Logic + WebSocket Client)          │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│           │                              │                       │
│           │ HTTP Requests                │ WebSocket (/logs)     │
└───────────┼──────────────────────────────┼───────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container (Node.js)                    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Express Server + WebSocket Server (server.js)      │  │
│  │                     with Logger System                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐     │
│  │   Settings   │  │   TTS Routes     │  │File/Upload   │     │
│  │   Routes     │  │   /api/tts       │  │   Routes     │     │
│  │ /api/settings│  └──────────────────┘  │/api/files    │     │
│  └──────────────┘                        │/api/upload   │     │
│                                           └──────────────┘     │
│              │                               │                  │
│              │                               ▼                  │
│              │                  ┌──────────────────────┐        │
│              │                  │   TTS Service        │        │
│              │                  │  (API Integration)   │        │
│              │                  └──────────────────────┘        │
│              │                               │                  │
│              │                  ┌────────────┼────────────┐     │
│              │                  │            │            │     │
│              │                  ▼            ▼            ▼     │
│              │         ┌──────────────┐ ┌────────┐ ┌─────────┐ │
│              │         │Text Splitter │ │OpenAI  │ │Custom   │ │
│              │         │  (Chunking)  │ │  API   │ │Endpoint │ │
│              │         └──────────────┘ └────────┘ └─────────┘ │
│              │                  │                               │
│              │                  ▼                               │
│              │         ┌──────────────────────┐                │
│              │         │  Audio Stitcher      │                │
│              │         │  (FFmpeg Wrapper)    │                │
│              │         └──────────────────────┘                │
│              │                                                  │
│              ▼                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Data Persistence                        │ │
│  │                                                             │ │
│  │  /app/data/        /app/temp/        /app/output/         │ │
│  │  settings.json     audio chunks      final audio          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Volume Mounts     │
                    │   (Host Storage)    │
                    │                     │
                    │  ./data             │
                    │  ./output           │
                    └─────────────────────┘
```

## Request Flow: Generate Speech

```
1. User Action
   │
   └─> [Click "Generate Speech"]
       │
       ▼
2. Frontend (app.js)
   │
   ├─> Validate input
   ├─> Prepare request payload
   └─> POST /api/tts/generate
       │
       ▼
3. Backend Routes (tts.js)
   │
   ├─> Extract parameters
   └─> Call textSplitter.splitText()
       │
       ▼
4. Text Splitter Service
   │
   ├─> Analyze text length
   ├─> Find sentence boundaries
   ├─> Create chunks array
   └─> Return: ["chunk1", "chunk2", "chunk3"]
       │
       ▼
5. For Each Chunk
   │
   └─> Call ttsService.generateSpeech()
       │
       ▼
6. TTS Service
   │
   ├─> Determine endpoint (OpenAI or custom)
   ├─> Build API request
   ├─> POST to TTS API
   └─> Return audio buffer
       │
       ▼
7. If combineAudio = true
   │
   └─> Call audioStitcher.stitchAudio()
       │
       ▼
8. Audio Stitcher
   │
   ├─> Save buffers to temp files
   ├─> Create FFmpeg concat list
   ├─> Run FFmpeg command
   ├─> Read combined output
   ├─> Clean up temp files
   └─> Return combined buffer
       │
       ▼
9. Backend Response
   │
   └─> Convert buffer to base64
   └─> Send JSON response
       │
       ▼
10. Frontend Receives Response
    │
    ├─> Convert base64 to Blob
    ├─> Create Object URL
    ├─> Load into audio player
    └─> Show download button
        │
        ▼
11. User Experience
    │
    └─> [Play/Download Audio]
```

## Data Flow

```
Text Input (10,000 chars)
         │
         ▼
┌─────────────────────┐
│   Text Splitter     │
│   - Max: 4096 chars │
│   - Split: Sentence │
└─────────────────────┘
         │
         ├─> Chunk 1 (4000 chars) ─┐
         ├─> Chunk 2 (4050 chars) ─┤
         └─> Chunk 3 (1950 chars) ─┤
                                    │
         ┌──────────────────────────┘
         │
         ▼
┌─────────────────────┐
│    TTS API Call     │
│  (3 parallel calls) │
└─────────────────────┘
         │
         ├─> audio_1.mp3 (buffer) ─┐
         ├─> audio_2.mp3 (buffer) ─┤
         └─> audio_3.mp3 (buffer) ─┤
                                    │
         ┌──────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Audio Stitcher     │
│  (FFmpeg concat)    │
└─────────────────────┘
         │
         ▼
   final_audio.mp3 (single file)
         │
         ▼
    Browser Player
```

## Component Interaction Matrix

```
┌─────────────────┬──────┬──────┬────────┬────────┬──────────┐
│                 │ UI   │Routes│Services│ FFmpeg │ Storage  │
├─────────────────┼──────┼──────┼────────┼────────┼──────────┤
│ User Interface  │  ●   │  →   │        │        │          │
│ API Routes      │  ←   │  ●   │   →    │        │          │
│ TTS Service     │      │  ←   │   ●    │        │          │
│ Text Splitter   │      │  ←   │   ●    │        │          │
│ Audio Stitcher  │      │  ←   │   ●    │   →    │          │
│ Settings Store  │  ←   │  ←   │        │        │    ●     │
└─────────────────┴──────┴──────┴────────┴────────┴──────────┘

Legend:
● = Main responsibility
→ = Calls/Depends on
← = Returns data to
```

## Technology Stack

```
┌─────────────────────────────────────────┐
│            Frontend Layer                │
│                                          │
│  HTML5 │ CSS3 │ Vanilla JavaScript      │
│  WebSocket Client │ Drag-Drop API       │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Application Layer               │
│                                          │
│  Node.js 18 + Express.js + WebSocket    │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│           Service Layer                  │
│                                          │
│  Axios │ Multer │ Mammoth │ pdf-parse   │
│  html-to-text │ FFmpeg Wrapper │ Logger │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          External Services               │
│                                          │
│  OpenAI API │ Custom TTS Endpoints      │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│        Infrastructure Layer              │
│                                          │
│    Docker │ FFmpeg │ Node.js Runtime    │
└─────────────────────────────────────────┘
```

## File Dependencies

```
server.js
├── ws (WebSocket server)
├── utils/logger.js
│   └── ws (broadcasting)
│
├── routes/settings.js
│   └── fs (Node.js)
│
├── routes/tts.js
│   ├── utils/logger.js
│   ├── services/ttsService.js
│   │   ├── axios
│   │   └── utils/logger.js
│   ├── services/textSplitter.js
│   └── services/audioStitcher.js
│       └── fluent-ffmpeg
│           └── FFmpeg (system)
│
├── routes/files.js
│   └── fs (Node.js)
│
├── routes/upload.js
│   ├── multer
│   ├── mammoth (DOCX parsing)
│   ├── pdf-parse (PDF extraction)
│   └── html-to-text (HTML conversion)
│
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
        ├── fetch API
        └── WebSocket (log viewer)
```

## Security Flow

```
Settings Configuration
         │
         ├─> API Key entered by user
         │
         ▼
Local Storage (Browser)
         │
         ├─> On save: POST to server
         │
         ▼
Server-side Storage
         │
         ├─> Saved to /app/data/settings.json
         ├─> File permissions: Container only
         │
         ▼
API Requests
         │
         ├─> Read from settings.json
         ├─> Add to Authorization header
         └─> Send to TTS service

Note: No database, no cloud storage
      All data stays local to container
```

## Deployment Architecture

```
Development Environment
┌─────────────────────────────────────┐
│  Host Machine                       │
│  ├── Source Code                    │
│  ├── Docker Desktop                 │
│  └── Browser                        │
│      └── http://localhost:3000      │
└─────────────────────────────────────┘

Production Environment
┌─────────────────────────────────────┐
│  Server                             │
│  ├── Docker Engine                  │
│  ├── OpenSpeech Container           │
│  │   ├── Node.js App                │
│  │   ├── FFmpeg                     │
│  │   └── Data Volumes               │
│  └── Reverse Proxy (optional)       │
│      └── nginx/Caddy                │
└─────────────────────────────────────┘
```

## Scaling Considerations

```
Current: Single Container
┌──────────────────┐
│  OpenSpeech      │
│  (All-in-One)    │
└──────────────────┘

Future: Microservices (if needed)
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Frontend   │   │   TTS API    │   │   Storage    │
│   (Static)   │──▶│  (Backend)   │──▶│  (S3/NFS)    │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │   Worker     │
                   │   (FFmpeg)   │
                   └──────────────┘
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Easy to understand and maintain
- ✅ Scalable design
- ✅ Minimal dependencies
- ✅ Docker-native deployment
