const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const JOBS_FILE = path.join(__dirname, '../data/processing-jobs.json');

class JobTracker {
    constructor() {
        this.ensureJobsFile();
    }

    async ensureJobsFile() {
        try {
            await fs.access(JOBS_FILE);
        } catch (error) {
            // File doesn't exist, create it
            await fs.mkdir(path.dirname(JOBS_FILE), { recursive: true });
            await fs.writeFile(JOBS_FILE, JSON.stringify([]));
        }
    }

    async getJobs() {
        try {
            const data = await fs.readFile(JOBS_FILE, 'utf8');
            if (!data || data.trim() === '') {
                return [];
            }
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading jobs file', error.message);
            try {
                await fs.writeFile(JOBS_FILE, JSON.stringify([]));
            } catch (writeError) {
                logger.error('Error resetting jobs file', writeError.message);
            }
            return [];
        }
    }

    async addJob(jobData) {
        const jobs = await this.getJobs();
        const job = {
            id: Date.now(),
            voice: jobData.voice,
            textPreview: jobData.textPreview,
            text: jobData.text || '',
            requestedAt: jobData.requestTimestamp || Date.now(),
            startTime: Date.now(),
            status: 'processing'
        };
        jobs.push(job);
        await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2));
        return job;
    }

    async removeJob(voice, textPreview) {
        const jobs = await this.getJobs();
        const filteredJobs = jobs.filter(job => 
            !(job.voice === voice && job.textPreview === textPreview)
        );
        await fs.writeFile(JOBS_FILE, JSON.stringify(filteredJobs, null, 2));
    }

    async removeAllJobs() {
        await fs.writeFile(JOBS_FILE, JSON.stringify([]));
    }

    async cleanOldJobs() {
        // Remove jobs older than 1 hour (likely stale)
        const jobs = await this.getJobs();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const activeJobs = jobs.filter(job => job.startTime > oneHourAgo);
        await fs.writeFile(JOBS_FILE, JSON.stringify(activeJobs, null, 2));
    }
}

module.exports = new JobTracker();
