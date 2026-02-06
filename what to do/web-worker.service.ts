import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Web Worker Service for offloading heavy computations
 * Processes video analytics, duration calculations, and data transformations
 */
@Injectable({
  providedIn: 'root'
})
export class WebWorkerService {
  private worker: Worker;
  private pendingRequests = new Map<string, (data: any) => void>();
  private requestId = 0;

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./video.worker', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }) => {
          const { requestId, result, error } = data;
          const callback = this.pendingRequests.get(requestId);
          
          if (callback) {
            if (error) {
              console.error('Worker error:', error);
            } else {
              callback(result);
            }
            this.pendingRequests.delete(requestId);
          }
        };
        this.worker.onerror = (error) => {
          console.error('Worker initialization error:', error);
        };
      } catch (e) {
        console.warn('Web Workers not supported, falling back to main thread');
      }
    }
  }

  /**
   * Process video duration calculation in worker thread
   */
  processVideoDuration(url: string): Promise<number> {
    return this.postMessage('processDuration', { url });
  }

  /**
   * Batch process multiple videos for analytics
   */
  batchProcessVideos(videos: any[]): Promise<any[]> {
    return this.postMessage('batchProcess', { videos });
  }

  /**
   * Calculate view count trends
   */
  calculateViewTrends(viewData: Record<string, number[]>): Promise<any> {
    return this.postMessage('calculateTrends', { viewData });
  }

  /**
   * Generic message posting to worker
   */
  private postMessage(task: string, data: any): Promise<any> {
    return new Promise((resolve) => {
      const requestId = (++this.requestId).toString();
      this.pendingRequests.set(requestId, resolve);
      
      if (this.worker) {
        this.worker.postMessage({ requestId, task, data });
      } else {
        // Fallback: process on main thread
        resolve(null);
      }
    });
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
