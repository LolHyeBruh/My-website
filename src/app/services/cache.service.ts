import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private memoryCache = new Map<string, { value: any; timestamp: number; duration?: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  set(key: string, value: any, duration?: number): void {
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      duration: duration || this.CACHE_DURATION
    });
  }

  get<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const cacheDuration = cached.duration || this.CACHE_DURATION;
    if (Date.now() - cached.timestamp > cacheDuration) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  remove(key: string): void {
    this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
  }

  getLocalStorage(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  setLocalStorage(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn('LocalStorage quota exceeded or disabled');
    }
  }

  removeLocalStorage(key: string): void {
    localStorage.removeItem(key);
  }
}