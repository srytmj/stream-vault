import os from 'node:os';

/**
 * Lightweight Asynchronous Semaphore / Process Queue
 * Limits concurrent invocations of heavy child processes (ffmpeg, ffprobe)
 * to protect memory and CPU on resource-constrained containers.
 */
class ProcessQueue {
  constructor(options = {}) {
    this.concurrency = Math.max(1, options.concurrency || 1);
    this.maxQueueLength = options.maxQueueLength || 100;
    this.minFreeMemBytes = options.minFreeMemBytes || 45 * 1024 * 1024; // 45 MB safety margin
    this.runningCount = 0;
    this.queue = [];
  }

  /**
   * Check if host/container has adequate memory to spawn a child process
   */
  hasSufficientMemory() {
    const freeMem = os.freemem();
    // If os.freemem() is available and below safety threshold, reject to avoid OOM
    if (freeMem > 0 && freeMem < this.minFreeMemBytes) {
      return false;
    }
    return true;
  }

  /**
   * Enqueue an async task that returns a Promise
   */
  async add(taskFn, { description = 'ffmpeg task' } = {}) {
    if (this.queue.length >= this.maxQueueLength) {
      throw new Error(`Process queue saturated (${this.queue.length} tasks waiting). Dropping ${description}.`);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        taskFn,
        description,
        resolve,
        reject,
      });

      this.processNext();
    });
  }

  processNext() {
    if (this.runningCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    // Check system memory before pulling next task
    if (!this.hasSufficientMemory()) {
      const item = this.queue.shift();
      item.reject(new Error(`Low system memory (${Math.round(os.freemem() / 1024 / 1024)}MB free). Skipped ${item.description} to prevent OOM.`));
      // Schedule check for remaining items after a short delay
      setTimeout(() => this.processNext(), 2000);
      return;
    }

    const { taskFn, description, resolve, reject } = this.queue.shift();
    this.runningCount++;

    Promise.resolve()
      .then(() => taskFn())
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      })
      .finally(() => {
        this.runningCount--;
        // Yield tick before processing next item
        setImmediate(() => this.processNext());
      });
  }

  getStats() {
    return {
      running: this.runningCount,
      queued: this.queue.length,
      concurrencyLimit: this.concurrency,
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    };
  }
}

// Global shared queue for all media subprocesses (ffmpeg / ffprobe)
const defaultConcurrency = parseInt(process.env.FFMPEG_MAX_CONCURRENCY || '1', 10);
export const ffmpegQueue = new ProcessQueue({ concurrency: defaultConcurrency });
