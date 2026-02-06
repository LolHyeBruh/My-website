import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { VideoService } from '../../services/video.service';
import { CacheService } from '../../services/cache.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Video, Playlist } from '../../models/video.model';
import { VideoPlayerComponent } from '../video-player/video-player.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, VideoPlayerComponent],
  template: `
    <div class="home-container">
      <!-- Header with Playlist Selector -->
      <div class="header-section">
        <div class="playlist-selector">
          <label for="playlist-select">📚 My Playlists:</label>
          <select 
            id="playlist-select"
            [(ngModel)]="selectedPlaylist" 
            (change)="onPlaylistChange()"
            class="playlist-dropdown"
          >
            <option value="">Select a Playlist</option>
            <option *ngFor="let p of playlists" [value]="p.name">
              {{ p.name }} ({{ p.videoCount }} videos)
            </option>
          </select>
        </div>
      </div>

      <div class="content-wrapper">
        <!-- Main Video Player Area -->
        <div class="player-section">
          <div class="video-player-wrapper">
            <app-video-player
              *ngIf="selectedVideo"
              [video]="selectedVideo"
              [playlistName]="selectedPlaylist"
              (videoEnded)="onVideoEnded()"
              (videoPlaying)="onVideoPlaying()"
            ></app-video-player>
            <div *ngIf="!selectedVideo" class="no-video-placeholder">
              <p>🎬 Select a playlist and video to get started</p>
            </div>
          </div>

          <!-- Video Info Section -->
          <div *ngIf="selectedVideo" class="video-info">
            <div class="video-meta">
              <h2>{{ selectedVideo.title }}</h2>
              <div class="meta-stats">
                <span class="view-count">👁️ {{ getViews(selectedVideo.url) | number }} views</span>
                <span class="creator">by {{ selectedVideo.creator }}</span>
                <span class="upload-date">{{ getRelativeTime(selectedVideo.addedAt) }}</span>
              </div>
            </div>
            <div class="video-description">
              <p>{{ selectedVideo.description }}</p>
            </div>
          </div>
        </div>

        <!-- Playlist Sidebar -->
        <div class="playlist-sidebar" *ngIf="selectedPlaylist">
          <h3>📋 {{ selectedPlaylist }}</h3>
          <div class="playlist-info">
            <p>{{ currentPlaylistInfo.description }}</p>
            <small>{{ videos.length }} videos</small>
          </div>
          
          <div class="playlist-videos">
            <div
              *ngFor="let video of videos"
              class="playlist-item"
              [class.active]="selectedVideo?.url === video.url"
              (click)="selectVideo(video)"
            >
              <div class="video-thumbnail">
                <span class="duration">{{ formatDuration(video.duration) }}</span>
              </div>
              <div class="video-details">
                <h4>{{ video.title }}</h4>
                <small class="added-time">{{ getRelativeTime(video.addedAt) }}</small>
                <small class="view-count">{{ getViews(video.url) | number }} views</small>
              </div>
            </div>
            <div *ngIf="videos.length === 0" class="empty-state">
              No videos in this playlist
            </div>
          </div>
        </div>
      </div>

      <!-- Error Toast -->
      <div *ngIf="errorMessage" class="error-toast">
        ⚠️ {{ errorMessage }}
        <button (click)="clearError()" class="close-btn">×</button>
      </div>

      <!-- Loading Indicator -->
      <div *ngIf="isLoading" class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    .header-section {
      padding: 1.5rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .playlist-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      max-width: 600px;
    }

    .playlist-selector label {
      font-weight: 600;
      white-space: nowrap;
    }

    .playlist-dropdown {
      flex: 1;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .playlist-dropdown:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .playlist-dropdown:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(100, 200, 255, 0.4);
    }

    .playlist-dropdown option {
      background: #1e3c72;
      color: #fff;
    }

    .content-wrapper {
      display: flex;
      flex: 1;
      gap: 1.5rem;
      padding: 1.5rem;
      overflow: hidden;
    }

    .player-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      overflow-y: auto;
    }

    .video-player-wrapper {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .no-video-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      font-size: 1.5rem;
      font-weight: 600;
      text-align: center;
    }

    .video-info {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .video-meta {
      margin-bottom: 1rem;
    }

    .video-meta h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .meta-stats {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .view-count {
      font-weight: 600;
    }

    .creator {
      color: #64c8ff;
    }

    .upload-date {
      opacity: 0.7;
    }

    .video-description {
      margin-top: 1rem;
      line-height: 1.6;
      opacity: 0.95;
    }

    .video-description p {
      margin: 0;
      word-wrap: break-word;
    }

    .playlist-sidebar {
      width: 320px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .playlist-sidebar h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .playlist-info {
      font-size: 0.85rem;
      opacity: 0.8;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .playlist-info small {
      display: block;
      margin-top: 0.5rem;
    }

    .playlist-videos {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
      overflow-y: auto;
    }

    .playlist-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .playlist-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(100, 200, 255, 0.5);
    }

    .playlist-item.active {
      background: rgba(100, 200, 255, 0.2);
      border-color: rgba(100, 200, 255, 0.8);
    }

    .video-thumbnail {
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 4px;
      position: relative;
      font-size: 0.7rem;
    }

    .duration {
      background: rgba(0, 0, 0, 0.8);
      padding: 2px 4px;
      border-radius: 2px;
    }

    .video-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .video-details h4 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .added-time,
    .view-count {
      font-size: 0.75rem;
      opacity: 0.7;
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      opacity: 0.6;
      font-size: 0.9rem;
    }

    .error-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #d32f2f;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s ease;
      z-index: 1000;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .loading-indicator {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      z-index: 2000;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    @media (max-width: 1024px) {
      .content-wrapper {
        flex-direction: column;
        gap: 1rem;
      }

      .playlist-sidebar {
        width: 100%;
        max-height: 300px;
      }

      .video-player-wrapper {
        aspect-ratio: 16 / 9;
      }
    }

    @media (max-width: 768px) {
      .header-section {
        padding: 1rem;
      }

      .content-wrapper {
        padding: 1rem;
        gap: 0.75rem;
      }

      .playlist-selector {
        flex-wrap: wrap;
      }

      .video-player-wrapper {
        aspect-ratio: 16 / 9;
        min-height: 200px;
      }

      .video-meta h2 {
        font-size: 1.2rem;
      }

      .meta-stats {
        gap: 1rem;
        font-size: 0.8rem;
      }

      .playlist-sidebar {
        max-height: 250px;
      }

      .playlist-item {
        padding: 0.5rem;
      }

      .video-thumbnail {
        width: 40px;
        height: 40px;
      }

      .video-details h4 {
        font-size: 0.8rem;
      }
    }

    /* Scrollbar styling */
    .player-section::-webkit-scrollbar,
    .playlist-videos::-webkit-scrollbar,
    .playlist-sidebar::-webkit-scrollbar {
      width: 8px;
    }

    .player-section::-webkit-scrollbar-track,
    .playlist-videos::-webkit-scrollbar-track,
    .playlist-sidebar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    .player-section::-webkit-scrollbar-thumb,
    .playlist-videos::-webkit-scrollbar-thumb,
    .playlist-sidebar::-webkit-scrollbar-thumb {
      background: rgba(100, 200, 255, 0.5);
      border-radius: 4px;
    }

    .player-section::-webkit-scrollbar-thumb:hover,
    .playlist-videos::-webkit-scrollbar-thumb:hover,
    .playlist-sidebar::-webkit-scrollbar-thumb:hover {
      background: rgba(100, 200, 255, 0.8);
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  playlists: Playlist[] = [];
  selectedPlaylist: string = '';
  videos: Video[] = [];
  selectedVideo: Video | null = null;
  currentPlaylistInfo: any = {};
  errorMessage: string = '';
  isLoading = false;

  private destroy$ = new Subject<void>();
  private viewCountCache: Record<string, number> = {};

  constructor(
    private firebaseService: FirebaseService,
    private videoService: VideoService,
    private cacheService: CacheService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit() {
    this.loadPlaylists();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadPlaylists() {
    try {
      this.isLoading = true;
      this.playlists = await this.firebaseService.getPlaylistList();
      
      if (this.playlists.length > 0) {
        this.selectedPlaylist = this.playlists[0].name;
        await this.onPlaylistChange();
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      this.showError('Failed to load playlists. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async onPlaylistChange() {
    if (!this.selectedPlaylist) {
      this.videos = [];
      this.selectedVideo = null;
      return;
    }

    try {
      this.isLoading = true;
      const playlistData = await this.firebaseService.getPlaylistList();
      const playlist = playlistData.find(p => p.name === this.selectedPlaylist);
      
      if (playlist) {
        this.currentPlaylistInfo = playlist;
      }

      this.videos = await this.firebaseService.loadPlaylist(this.selectedPlaylist);
      
      // Preload view counts
      const viewCache = await this.firebaseService.preloadViewCounts(this.selectedPlaylist);
      this.viewCountCache = viewCache;

      if (this.videos.length > 0) {
        this.selectVideo(this.videos[0]);
      } else {
        this.selectedVideo = null;
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      this.showError('Failed to load playlist videos.');
    } finally {
      this.isLoading = false;
    }
  }

  selectVideo(video: Video) {
    this.selectedVideo = video;
    this.analyticsService.trackVideoSelect(video.url, this.selectedPlaylist);
  }

  getViews(url: string): number {
    return this.viewCountCache[url] || 0;
  }

  formatDuration(duration: string | undefined): string {
    return this.videoService.formatDuration(
      this.videoService.parseDuration(duration)
    );
  }

  getRelativeTime(timestamp: number): string {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  }

  onVideoEnded() {
    const currentIndex = this.videos.findIndex(v => v.url === this.selectedVideo?.url);
    if (currentIndex < this.videos.length - 1) {
      this.selectVideo(this.videos[currentIndex + 1]);
    }
  }

  onVideoPlaying() {
    if (this.selectedVideo) {
      this.analyticsService.trackVideoPlay(this.selectedVideo.url, this.selectedPlaylist);
    }
  }

  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  clearError() {
    this.errorMessage = '';
  }
}
