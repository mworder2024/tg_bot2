import { Queue, Job, JobOptions } from 'bull';

/**
 * Mock Bull Queue for testing
 */
export class MockBullQueue {
  private jobs = new Map<string, MockJob>();
  private processors = new Map<string, Function>();
  private jobCounter = 0;
  private isActive = true;

  constructor(public name: string, private redisUrl?: string) {}

  async add(name: string, data: any, options?: JobOptions): Promise<MockJob> {
    const jobId = ++this.jobCounter;
    const job = new MockJob(
      jobId.toString(),
      name,
      data,
      options || {},
      this
    );
    
    this.jobs.set(job.id, job);
    
    // Auto-process if processor exists
    const processor = this.processors.get(name) || this.processors.get('*');
    if (processor && this.isActive) {
      setTimeout(async () => {
        try {
          job.status = 'active';
          const result = await processor(job, data);
          job.finishedOn = new Date();
          job.returnvalue = result;
          job.status = 'completed';
        } catch (error) {
          job.failedReason = error.message;
          job.status = 'failed';
        }
      }, 0);
    }
    
    return job;
  }

  process(concurrency: number | string | Function, processor?: Function): void {
    if (typeof concurrency === 'function') {
      processor = concurrency;
      concurrency = 1;
    }
    
    if (typeof concurrency === 'string') {
      this.processors.set(concurrency, processor!);
    } else {
      this.processors.set('*', processor!);
    }
  }

  async getJobs(
    types: string[],
    start?: number,
    end?: number,
    asc?: boolean
  ): Promise<MockJob[]> {
    const allJobs = Array.from(this.jobs.values());
    const filteredJobs = allJobs.filter(job => 
      types.includes(job.status) || types.includes('*')
    );
    
    const sorted = asc 
      ? filteredJobs.sort((a, b) => parseInt(a.id) - parseInt(b.id))
      : filteredJobs.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    
    if (start !== undefined && end !== undefined) {
      return sorted.slice(start, end + 1);
    }
    
    return sorted;
  }

  async getJob(jobId: string): Promise<MockJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async clean(grace: number, type?: string, limit?: number): Promise<MockJob[]> {
    const now = Date.now();
    const cutoff = now - grace;
    const cleaned: MockJob[] = [];
    
    for (const [id, job] of this.jobs.entries()) {
      const shouldClean = (
        (!type || job.status === type) &&
        job.processedOn &&
        job.processedOn.getTime() < cutoff
      );
      
      if (shouldClean) {
        this.jobs.delete(id);
        cleaned.push(job);
        
        if (limit && cleaned.length >= limit) {
          break;
        }
      }
    }
    
    return cleaned;
  }

  async pause(isLocal?: boolean): Promise<void> {
    this.isActive = false;
  }

  async resume(isLocal?: boolean): Promise<void> {
    this.isActive = true;
  }

  async empty(): Promise<void> {
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'waiting' || job.status === 'delayed') {
        this.jobs.delete(id);
      }
    }
  }

  async close(): Promise<void> {
    this.jobs.clear();
    this.processors.clear();
    this.isActive = false;
  }

  async getWaiting(): Promise<MockJob[]> {
    return this.getJobs(['waiting']);
  }

  async getActive(): Promise<MockJob[]> {
    return this.getJobs(['active']);
  }

  async getCompleted(): Promise<MockJob[]> {
    return this.getJobs(['completed']);
  }

  async getFailed(): Promise<MockJob[]> {
    return this.getJobs(['failed']);
  }

  async getDelayed(): Promise<MockJob[]> {
    return this.getJobs(['delayed']);
  }

  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    
    return {
      waiting: jobs.filter(j => j.status === 'waiting').length,
      active: jobs.filter(j => j.status === 'active').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      delayed: jobs.filter(j => j.status === 'delayed').length,
    };
  }

  on(event: string, handler: Function): this {
    // Mock event handling
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    // Mock event emission
    return true;
  }
}

/**
 * Mock Bull Job
 */
export class MockJob implements Partial<Job> {
  public processedOn?: Date;
  public finishedOn?: Date;
  public failedReason?: string;
  public returnvalue?: any;
  public status: string = 'waiting';
  public progress: number = 0;
  public attemptsMade: number = 0;

  constructor(
    public id: string,
    public name: string,
    public data: any,
    public opts: JobOptions,
    private queue: MockBullQueue
  ) {
    this.processedOn = new Date();
  }

  async remove(): Promise<void> {
    (this.queue as any).jobs.delete(this.id);
  }

  async retry(): Promise<void> {
    this.status = 'waiting';
    this.failedReason = undefined;
    this.attemptsMade++;
  }

  async promote(): Promise<void> {
    if (this.status === 'delayed') {
      this.status = 'waiting';
    }
  }

  update(data: any): Promise<void> {
    this.data = { ...this.data, ...data };
    return Promise.resolve();
  }

  log(row: string): Promise<number> {
    // Mock logging
    return Promise.resolve(1);
  }

  progress(progress?: number): Promise<void> | number {
    if (progress !== undefined) {
      this.progress = progress;
      return Promise.resolve();
    }
    return this.progress;
  }

  moveToCompleted(returnValue?: any): Promise<void> {
    this.status = 'completed';
    this.finishedOn = new Date();
    this.returnvalue = returnValue;
    return Promise.resolve();
  }

  moveToFailed(errorInfo: { message: string }): Promise<void> {
    this.status = 'failed';
    this.failedReason = errorInfo.message;
    return Promise.resolve();
  }

  discard(): Promise<void> {
    this.status = 'failed';
    this.failedReason = 'Job discarded';
    return Promise.resolve();
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      opts: this.opts,
      progress: this.progress,
      delay: this.opts.delay || 0,
      timestamp: this.processedOn?.getTime(),
      attemptsMade: this.attemptsMade,
      failedReason: this.failedReason,
      stacktrace: null,
      returnvalue: this.returnvalue,
      finishedOn: this.finishedOn?.getTime(),
      processedOn: this.processedOn?.getTime(),
    };
  }
}

/**
 * Mock Queue Factory
 */
export const createMockQueue = (name: string, redisUrl?: string): MockBullQueue => {
  return new MockBullQueue(name, redisUrl);
};

/**
 * Jest mock for Bull Queue
 */
export const mockBullQueue = {
  add: jest.fn(),
  process: jest.fn(),
  getJobs: jest.fn(),
  getJob: jest.fn(),
  clean: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  empty: jest.fn(),
  close: jest.fn(),
  getWaiting: jest.fn(),
  getActive: jest.fn(),
  getCompleted: jest.fn(),
  getFailed: jest.fn(),
  getDelayed: jest.fn(),
  getJobCounts: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
};

/**
 * Mock Bull module
 */
export const mockBull = {
  Queue: jest.fn().mockImplementation((name: string, redisUrl?: string) => 
    createMockQueue(name, redisUrl)
  ),
  Job: MockJob,
};