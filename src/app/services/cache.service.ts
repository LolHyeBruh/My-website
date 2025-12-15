import { Injectable } from '@angular/core';

interface CacheEntry {
  value: any;
  timestamp: number;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private memoryCache = new Map<string, CacheEntry>();

  constructor() {}

  set(key: string, value: any, duration?: number): void {
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      duration: duration || this.CACHE_DURATION
    });
  }

  get<T = any>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const cacheDuration = cached.duration || this.CACHE_DURATION;
    if (Date.now() - cached.timestamp > cacheDuration) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  invalidate(key: string): void {
    this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
  }

  has(key: string): boolean {
    const cached = this.memoryCache.get(key);
    if (!cached) return false;

    const cacheDuration = cached.duration || this.CACHE_DURATION;
    if (Date.now() - cached.timestamp > cacheDuration) {
      this.memoryCache.delete(key);
      return false;
    }

    return true;
  }
}