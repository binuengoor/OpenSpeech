const EventEmitter = require('events');
const logger = require('../utils/logger');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.currentJob = null;
    this.jobIdCounter = 1;
  }

  // Add a job to the queue
  addJob(jobData) {
    const job = {
      id: this.jobIdCounter++,
      status: 'queued',
      createdAt: new Date(),
      progress: 0,
      ...jobData
    };

    this.queue.push(job);
    logger.info(`Job #${job.id} added to queue`, { text: jobData.text.substring(0, 50) + '...' });
    
    this.emit('job-added', job);
    
    // Start processing if not already processing
    if (!this.processing) {
      this.processNext();
    }

    return job.id;
  }

  // Get all jobs (queue + current + completed recent)
  getAllJobs() {
    const jobs = [...this.queue];
    if (this.currentJob) {
      jobs.unshift(this.currentJob);
    }
    return jobs;
  }

  // Get job by ID
  getJob(jobId) {
    if (this.currentJob && this.currentJob.id === jobId) {
      return this.currentJob;
    }
    return this.queue.find(job => job.id === jobId);
  }

  // Update job progress
  updateJobProgress(jobId, progress, message) {
    const job = this.getJob(jobId);
    if (job) {
      job.progress = progress;
      job.progressMessage = message;
      this.emit('job-progress', job);
    }
  }

  // Process next job in queue
  async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      this.currentJob = null;
      logger.info('Queue empty, processing complete');
      return;
    }

    this.processing = true;
    this.currentJob = this.queue.shift();
    this.currentJob.status = 'processing';
    this.currentJob.startedAt = new Date();

    logger.info(`Processing job #${this.currentJob.id}`);
    this.emit('job-started', this.currentJob);

    try {
      // Process the job using the provided processor function
      if (this.currentJob.processor) {
        await this.currentJob.processor(this.currentJob);
      }

      this.currentJob.status = 'completed';
      this.currentJob.completedAt = new Date();
      this.currentJob.progress = 100;
      
      logger.success(`Job #${this.currentJob.id} completed`);
      this.emit('job-completed', this.currentJob);
      
    } catch (error) {
      this.currentJob.status = 'failed';
      this.currentJob.error = error.message;
      this.currentJob.completedAt = new Date();
      
      logger.error(`Job #${this.currentJob.id} failed`, error.message);
      this.emit('job-failed', this.currentJob);
    }

    // Process next job
    setTimeout(() => this.processNext(), 500);
  }

  // Cancel a job
  cancelJob(jobId) {
    const index = this.queue.findIndex(job => job.id === jobId);
    if (index !== -1) {
      const job = this.queue.splice(index, 1)[0];
      job.status = 'cancelled';
      logger.info(`Job #${jobId} cancelled`);
      this.emit('job-cancelled', job);
      return true;
    }
    return false;
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        status: this.currentJob.status,
        progress: this.currentJob.progress,
        progressMessage: this.currentJob.progressMessage
      } : null
    };
  }
}

module.exports = new JobQueue();
