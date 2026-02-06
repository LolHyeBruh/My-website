/**
 * Video Processing Web Worker
 * Handles heavy computations off the main thread
 */

// Listen for messages from the main thread
self.onmessage = ({ data }) => {
  const { requestId, task, data: payload } = data;
  
  try {
    let result;
    
    switch (task) {
      case 'processDuration':
        result = processDuration(payload.url);
        break;
      case 'batchProcess':
        result = batchProcessVideos(payload.videos);
        break;
      case 'calculateTrends':
        result = calculateViewTrends(payload.viewData);
        break;
      default:
        throw new Error(`Unknown task: ${task}`);
    }
    
    self.postMessage({ requestId, result });
  } catch (error) {
    self.postMessage({ requestId, error: (error as Error).message });
  }
};

/**
 * Process video duration from metadata
 */
function processDuration(url: string): number {
  try {
    // Extract duration from video file if possible
    // This is a placeholder - actual duration comes from video load
    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Batch process multiple videos for optimization
 */
function batchProcessVideos(videos: any[]): any[] {
  return videos.map(video => ({
    ...video,
    processed: true,
    timestamp: Date.now()
  }));
}

/**
 * Calculate view count trends and statistics
 */
function calculateViewTrends(viewData: Record<string, number[]>): any {
  const trends: any = {};
  
  for (const [videoUrl, views] of Object.entries(viewData)) {
    if (Array.isArray(views) && views.length > 0) {
      const total = views.reduce((a, b) => a + b, 0);
      const avg = total / views.length;
      const max = Math.max(...views);
      const min = Math.min(...views);
      
      trends[videoUrl] = {
        total,
        average: avg,
        max,
        min,
        count: views.length,
        trend: views[views.length - 1] > avg ? 'increasing' : 'decreasing'
      };
    }
  }
  
  return trends;
}
