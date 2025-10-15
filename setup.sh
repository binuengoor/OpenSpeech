#!/bin/bash

echo "🔊 OpenSpeech Setup Script"
echo "=========================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data output temp

echo "🔨 Building Docker container..."
docker-compose build

echo "🚀 Starting OpenSpeech..."
docker-compose up -d

echo ""
echo "✅ OpenSpeech is now running!"
echo ""
echo "📍 Access the application at: http://localhost:3000"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo ""
