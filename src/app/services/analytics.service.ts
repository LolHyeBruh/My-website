import { Injectable } from '@angular/core';

declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  trackEvent(eventName: string, eventData: any = {}): void {
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  trackVideoPlay(title: string): void {
    this.trackEvent('video_play', {
      video_title: title,
      timestamp: new Date().toISOString()
    });
  }

  trackVideoView(title: string, duration: number): void {
    this.trackEvent('video_view', {
      video_title: title,
      duration: duration,
      timestamp: new Date().toISOString()
    });
  }

  trackPlaylistSwitch(name: string): void {
    this.trackEvent('playlist_switch', {
      playlist_name: name,
      timestamp: new Date().toISOString()
    });
  }
}