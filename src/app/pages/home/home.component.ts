import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { CacheService } from '../../services/cache.service';
import { VideoPlayerComponent } from '../../components/video-player/video-player.component';
import { PlaylistSidebarComponent } from '../../components/playlist-sidebar/playlist-sidebar.component';
import { Video, Playlist } from '../../models/video.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VideoPlayerComponent,
    PlaylistSidebarComponent
  ],
  template: `
    <div class="home-container">
      <!-- Check if logged in -->
      <div *ngIf="!(isLoggedIn$ | async)" class="login-screen">
        <div class="login-panel">
          <h1>🎬 Welcome to Archive Player</h1>
          <p>Your personal video library and streaming platform</p>
          <button (click)="loginWithGoogle()" class="login-btn">
            🔐 Login with Google
          </button>
        </div>
      </div>

      <!-- Main content if logged in -->
      <div *ngIf="(isLoggedIn$ | async)" class="home-content">
        <!-- Sidebar with playlists -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2>📋 Playlists</h2>
            <button (click)="refreshPlaylists()" class="refresh-btn" title="Refresh">
              🔄
            </button>
          </div>

      <!-- Mobile Playlist Selector (add to template) -->
      <div class="mobile-playlist-selector" *ngIf="playlists && (playlists | keyvalue).length > 0">
        <button 
          *ngFor="let item of playlists | keyvalue"
          (click)="selectPlaylist(item.key)"
          [class.active]="selectedPlaylist === item.key"
          class="playlist-chip">
          {{ item.key }}
        </button>
      </div>

          <div class="playlists-list">
            <div 
              *ngFor="let playlist of playlists" 
              (click)="selectPlaylist(playlist.name)"
              [class.active]="selectedPlaylist === playlist.name"
              class="playlist-item"
            >
              <span class="playlist-name">{{ playlist.name }}</span>
              <span class="video-count">{{ playlist.videoCount }}</span>
            </div>

            <div *ngIf="playlists.length === 0" class="empty-state">
              <p>No playlists yet. Visit Studio to create one! 🚀</p>
            </div>
          </div>
        </aside>

        <!-- Main content area -->
        <main class="main-area">
          <!-- Selected Playlist Info -->
          <div *ngIf="selectedPlaylist && currentPlaylistInfo" class="playlist-header">
            <h2>{{ selectedPlaylist }}</h2>
            <p *ngIf="currentPlaylistInfo.description" class="description">
              {{ currentPlaylistInfo.description }}
            </p>
            <p class="video-count-text">
              {{ videos.length }} videos
            </p>
          </div>

          <!-- Video Player Section -->
          <div class="player-section" *ngIf="selectedVideo">
            <app-video-player 
              [video]="selectedVideo"
              [playlistName]="selectedPlaylist || ''"
              (onVideoEnd)="onVideoEnd()"
            ></app-video-player>

            <!-- Video Info -->
            <div class="video-info">
              <div class="info-header">
                <h3>{{ selectedVideo.title }}</h3>
                <span class="view-count">👁️ {{ getViews(selectedVideo.url) }} views</span>
              </div>
              <p class="creator" *ngIf="selectedVideo.creator">
                by {{ selectedVideo.creator }}
              </p>
              <p class="description" *ngIf="selectedVideo.description">
                {{ selectedVideo.description }}
              </p>
            </div>
          </div>

          <!-- Playlist Videos Grid -->
          <div class="videos-section">
            <h3 class="section-title">
              {{ selectedPlaylist ? 'Videos in ' + selectedPlaylist : 'Select a playlist to view videos' }}
            </h3>

            <div class="videos-grid">
              <div 
                *ngFor="let video of videos"
                (click)="selectVideo(video)"
                [class.active]="selectedVideo?.url === video.url"
                class="video-card"
              >
                <!-- Thumbnail -->
                <div class="video-thumbnail">
                  <div class="play-icon">▶</div>
                  <span class="duration">{{ video.duration }}</span>
                </div>

                <!-- Video Info -->
                <div class="video-card-info">
                  <h4>{{ video.title }}</h4>
                  <p class="meta">
                    <span class="views">👁️ {{ getViews(video.url) }}</span>
                    <span class="date">📅 {{ formatDate(video.addedAt) }}</span>
                  </p>
                </div>
              </div>

              <div *ngIf="videos.length === 0" class="empty-grid">
                <p>No videos in this playlist yet</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      width: 100%;
      height: 100%;
    }

    /* LOGIN SCREEN */
    .login-screen {
      width: 100%;
      height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1f1f1f 0%, #0f0f0f 100%);
    }

    .login-panel {
      background: #212121;
      padding: 60px 40px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      max-width: 500px;
    }

    .login-panel h1 {
      margin: 0 0 16px 0;
      font-size: 32px;
    }

    .login-panel p {
      margin: 0 0 30px 0;
      color: #aaa;
      font-size: 16px;
    }

    .login-btn {
      background: #065fd4;
      color: white;
      border: none;
      padding: 12px 32px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }

    .login-btn:hover {
      background: #0544a8;
    }

    /* HOME CONTENT */
    .home-content {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      height: 100%;
    }

    /* SIDEBAR */
    .sidebar {
      background: #212121;
      border-radius: 8px;
      padding: 16px;
      height: fit-content;
      max-height: calc(100vh - 180px);
      overflow-y: auto;
      position: sticky;
      top: 80px;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .refresh-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .refresh-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .playlists-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .playlist-item {
      padding: 12px;
      background: #333;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }

    .playlist-item:hover {
      background: #3a3a3a;
    }

    .playlist-item.active {
      background: #065fd4;
      color: white;
    }

    .playlist-name {
      font-weight: 500;
      font-size: 14px;
    }

    .video-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .empty-state {
      padding: 20px;
      text-align: center;
      color: #888;
      font-size: 12px;
    }

    /* MAIN AREA */
    .main-area {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .playlist-header {
      background: #212121;
      padding: 20px;
      border-radius: 8px;
    }

    .playlist-header h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
    }

    .playlist-header .description {
      margin: 8px 0;
      color: #aaa;
    }

    .video-count-text {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #888;
    }

    /* PLAYER SECTION */
    .player-section {
      background: #212121;
      padding: 20px;
      border-radius: 8px;
    }

    .video-info {
      margin-top: 16px;
    }

    .info-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .info-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .view-count {
      font-size: 14px;
      color: #aaa;
      white-space: nowrap;
    }

    .creator {
      margin: 8px 0;
      color: #888;
      font-size: 14px;
    }

    .video-info .description {
      margin: 12px 0 0 0;
      color: #aaa;
      line-height: 1.5;
    }

    /* VIDEOS SECTION */
    .videos-section {
      background: #212121;
      padding: 20px;
      border-radius: 8px;
    }

    .section-title {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .video-card {
      background: #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .video-card:hover {
      transform: translateY(-4px);
      border-color: #065fd4;
    }

    .video-card.active {
      border-color: #065fd4;
      background: #222;
    }

    .video-thumbnail {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%;
      background: #333;
      overflow: hidden;
    }

    .video-thumbnail::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(6, 95, 212, 0.1) 0%, transparent 100%);
    }

    .play-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 28px;
      color: white;
      opacity: 0.7;
      z-index: 2;
    }

    .video-card:hover .play-icon {
      opacity: 1;
    }

    .duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.8);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 2;
    }

    .video-card-info {
      padding: 12px;
    }

    .video-card-info h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .meta {
      margin: 0;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #888;
      gap: 8px;
    }

    .views, .date {
      white-space: nowrap;
    }

    .empty-grid {
      grid-column: 1 / -1;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    /* RESPONSIVE */
    @media (max-width: 1024px) {
      .home-content {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: relative;
        top: auto;
        max-height: 200px;
      }
    }

    @media (max-width: 768px) {
      .playlists-list {
        flex-direction: row;
        overflow-x: auto;
        padding-bottom: 8px;
      }

      .playlist-item {
        flex-shrink: 0;
        min-width: 120px;
      }

      .videos-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }

      .info-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  isLoggedIn$ = this.firebaseService.isLoggedIn$;
  
  playlists: Playlist[] = [];
  videos: Video[] = [];
  selectedPlaylist: string | null = null;
  selectedVideo: Video | null = null;
  currentPlaylistInfo: any = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private firebaseService: FirebaseService,
    private cacheService: CacheService
  ) {}

  ngOnInit(): void {
    this.loadPlaylists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadPlaylists(): Promise<void> {
    try {
      this.playlists = await this.firebaseService.getPlaylistList();
      if (this.playlists.length > 0) {
        this.selectPlaylist(this.playlists[0].name);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }

  async selectPlaylist(playlistName: string): Promise<void> {
    this.selectedPlaylist = playlistName;
    const playlist = this.playlists.find(p => p.name === playlistName);
    this.currentPlaylistInfo = playlist || {};

    try {
      this.videos = await this.firebaseService.loadPlaylist(playlistName);
      if (this.videos.length > 0) {
        this.selectVideo(this.videos[0]);
      } else {
        this.selectedVideo = null;
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  }

  selectVideo(video: Video): void {
    this.selectedVideo = video;
    // Track view
    if (this.selectedPlaylist) {
      this.firebaseService.updateVideoViews(this.selectedPlaylist, video.url);
    }
  }

  getViews(videoUrl: string): number {
    const video = this.videos.find(v => v.url === videoUrl);
    return video?.views || 0;
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  onVideoEnd(): void {
    // Auto-play next video
    if (this.selectedVideo && this.videos.length > 0) {
      const currentIndex = this.videos.findIndex(v => v.url === this.selectedVideo!.url);
      if (currentIndex < this.videos.length - 1) {
        this.selectVideo(this.videos[currentIndex + 1]);
      }
    }
  }

  refreshPlaylists(): void {
    this.cacheService.invalidate('playlists');
    this.loadPlaylists();
  }

  loginWithGoogle(): void {
    this.firebaseService.loginWithGoogle();
  }
}