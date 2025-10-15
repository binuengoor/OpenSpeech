FROM node:18-alpine

# Install ffmpeg for audio stitching
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p /app/temp /app/output /app/data

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
