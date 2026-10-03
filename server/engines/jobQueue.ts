import { BackgroundJob, JobStatus } from '../types.ts';

class JobQueueManager {
  private jobs: Map<string, BackgroundJob> = new Map();

  createJob(type: BackgroundJob['type'], target: string, details?: string): BackgroundJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BackgroundJob = {
      id,
      type,
      target,
      status: 'Queued',
      progress: 0,
      startedAt: new Date().toISOString(),
      details: details || `Initialized ${type} on ${target}`,
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): BackgroundJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  updateProgress(id: string, progress: number, status: JobStatus = 'Running', details?: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.progress = Math.min(100, Math.max(0, progress));
    job.status = status;
    if (details) job.details = details;
    if (status === 'Completed' || status === 'Failed') {
      job.completedAt = new Date().toISOString();
      if (status === 'Completed') job.progress = 100;
    }
  }

  failJob(id: string, error: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'Failed';
    job.error = error;
    job.completedAt = new Date().toISOString();
  }
}

export const jobQueue = new JobQueueManager();
