const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const METADATA_FILE = path.join(__dirname, '../data/file-metadata.json');

class FileMetadata {
    constructor() {
        this.ensureMetadataFile();
    }

    async ensureMetadataFile() {
        try {
            await fs.access(METADATA_FILE);
        } catch (error) {
            // File doesn't exist, create it
            await fs.mkdir(path.dirname(METADATA_FILE), { recursive: true });
            await fs.writeFile(METADATA_FILE, JSON.stringify([]));
        }
    }

    async getAll() {
        try {
            const data = await fs.readFile(METADATA_FILE, 'utf8');
            if (!data || data.trim() === '') {
                return [];
            }
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading metadata file', error.message);
            return [];
        }
    }

    async addFile(metadata) {
        try {
            const files = await this.getAll();
            const requestedAt = metadata.requestedAt || Date.now();
            const fileMetadata = {
                filename: metadata.filename,
                voice: metadata.voice,
                text: metadata.text,
                speed: metadata.speed,
                format: metadata.format,
                chunks: metadata.chunks,
                combined: metadata.combined,
                requestedAt: requestedAt,
                createdAt: Date.now(),
                timestamp: new Date(requestedAt).toISOString()
            };
            files.push(fileMetadata);
            await fs.writeFile(METADATA_FILE, JSON.stringify(files, null, 2));
            logger.info('Saved metadata', metadata.filename);
            return fileMetadata;
        } catch (error) {
            logger.error('Error saving metadata', error.message);
            throw error;
        }
    }

    async getByFilename(filename) {
        const files = await this.getAll();
        return files.find(f => f.filename === filename);
    }

    async updateFilename(oldFilename, newFilename) {
        const files = await this.getAll();
        const file = files.find(f => f.filename === oldFilename);
        if (file) {
            file.filename = newFilename;
            await fs.writeFile(METADATA_FILE, JSON.stringify(files, null, 2));
            logger.info('Updated filename', `${oldFilename} -> ${newFilename}`);
            return file;
        }
        return null;
    }

    async removeFile(filename) {
        const files = await this.getAll();
        const filteredFiles = files.filter(f => f.filename !== filename);
        await fs.writeFile(METADATA_FILE, JSON.stringify(filteredFiles, null, 2));
    }

    async removeAll() {
        await fs.writeFile(METADATA_FILE, JSON.stringify([]));
    }

    async cleanOrphans(existingFiles) {
        // Remove metadata for files that no longer exist
        const files = await this.getAll();
        
        if (!existingFiles || existingFiles.length === 0) {
            return;
        }
        
        const existingFilenames = new Set(existingFiles.map(f => f.name));
        const validFiles = files.filter(f => existingFilenames.has(f.filename));
        
        const orphanCount = files.length - validFiles.length;
        if (orphanCount > 0) {
            logger.info('Cleaning orphaned metadata entries', orphanCount);
        }
        
        await fs.writeFile(METADATA_FILE, JSON.stringify(validFiles, null, 2));
    }
}

module.exports = new FileMetadata();
