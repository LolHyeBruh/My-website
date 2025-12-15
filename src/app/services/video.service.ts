import { Injectable } from '@angular/core';
import { Video } from '../models/video.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private videoDurationMap = new Map<string, number>();
  private viewCountDebounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private cacheService: CacheService) {}

  getYouTubeID(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        return parsed.pathname.slice(1);
      }
      if (parsed.hostname.includes('youtube.com')) {
        return parsed.searchParams.get('v') || null;
      }
    } catch (e) {
      console.warn('Invalid URL:', url);
    }
    return null;
  }

  getVideoSource(video: Video): { type: string; src: string } {
    const url = video.url;
    const ytID = this.getYouTubeID(url);

    if (ytID) {
      return { type: 'youtube', src: ytID };
    }

    if (url.match(/\.(mp4|webm|ogg)$/)) {
      return { type: 'video/mp4', src: url };
    }

    if (url.endsWith('.m3u8')) {
      return { type: 'application/x-mpegURL', src: url };
    }

    if (url.endsWith('.mpd')) {
      return { type: 'application/dash+xml', src: url };
    }

    console.warn('Unknown video type, defaulting to mp4:', url);
    return { type: 'video/mp4', src: url };
  }

  formatDuration(seconds: number | undefined): string {
    if (!seconds || isNaN(seconds)) return '00:00:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return [h, m, s].map(n => n.toString().padStart(2, '0')).join(':');
  }

  parseDuration(durationStr: string | undefined): number {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  async getVideoDuration(url: string): Promise<number> {
    const cached = this.cacheService.get('duration_' + url) as number | null;
      if (cached !== null) return cached;

    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.preload = 'metadata';
      tempVideo.crossOrigin = 'anonymous';

      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration;
        if (!isNaN(duration)) {
          this.cacheService.set('duration_' + url, duration);
          this.videoDurationMap.set(url, duration);
          resolve(duration);
        } else {
          resolve(0);
        }
      };

      tempVideo.onerror = () => {
        console.error('Failed to load video duration:', url);
        resolve(0);
      };

      setTimeout(() => {
        tempVideo.src = '';
      }, 10000);
    });
  }

  debounceViewUpdate(url: string, callback: () => void, delay: number = 2000): void {
    const key = 'view_' + url;

    if (this.viewCountDebounce.has(key)) {
      clearTimeout(this.viewCountDebounce.get(key));
    }

    const timeout = setTimeout(() => {
      callback();
      this.viewCountDebounce.delete(key);
    }, delay);

    this.viewCountDebounce.set(key, timeout);
  }

  getEncodedUrl(url: string): string {
    return encodeURIComponent(url).replace(/\./g, '%2E');
  }

  filterByCategory(videos: Video[], category: string): Video[] {
    if (!category) return videos;

    return videos.filter(v => {
      let cat = v.category || 'Uncategorized';

      if (cat.includes('&')) {
        cat = cat.split('&').map(s => s.trim().toLowerCase()).join(' & ');
      } else {
        cat = cat.toLowerCase();
      }

      return cat === category.toLowerCase();
    });
  }

  filterByDuration(videos: Video[], filter: string): Video[] {
    if (!filter) return videos;

    if (filter === 'short') {
      return videos.filter(v => this.parseDuration(v.duration) < 300);
    } else if (filter === 'long') {
      return videos.filter(v => this.parseDuration(v.duration) >= 300);
    }

    return videos;
  }

  sortVideos(videos: Video[], sortType: string): Video[] {
    const sorted = [...videos];

    switch (sortType) {
      case 'asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'views':
        sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case 'duration':
        sorted.sort((a, b) => this.parseDuration(b.duration) - this.parseDuration(a.duration));
        break;
      case 'latest':
        sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      case 'earliest':
        sorted.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
        break;
    }

    return sorted;
  }
}