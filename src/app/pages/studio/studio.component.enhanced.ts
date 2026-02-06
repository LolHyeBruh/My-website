import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service.enhanced';
import { VideoService } from '../../services/video.service';
import { CacheService } from '../../services/cache.service';
import { Video, Playlist } from '../../models/video.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="studio-container">
      <div class="studio-header">
        <h1>📺 YouTube Studio</h1>
        <p>Create playlists and manage your video archive</p>
      </div>

      <div class="studio-content">
        <!-- Playlist Management Section -->
        <div class="section">
          <h2>📚 Playlist Management</h2>
          
          <form [formGroup]="playlistForm" (ngSubmit)="createPlaylist()">
            <div class="form-group">
              <label>Playlist Name</label>
              <input 
                type="text" 
                formControlName="playlistName"
                placeholder="Enter playlist name..."
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea 
                formControlName="playlistDescription"
                placeholder="Describe your playlist..."
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
            <button 
              type="submit" 
              [disabled]="!playlistForm.valid || isCreatingPlaylist"
              class="btn btn-primary"
            >
              {{ isCreatingPlaylist ? '⏳ Creating...' : '➕ Create Playlist' }}
            </button>
          </form>

          <div class="playlists-grid">
            <div *ngFor="let playlist of playlists" class="playlist-card">
              <div class="card-header">
                <h3>{{ playlist.name }}</h3>
                <button 
                  (click)="deletePlaylist(playlist.name)"
                  class="btn-delete"
                  title="Delete playlist"
                >
                  🗑️
                </button>
              </div>
              <p class="description">{{ playlist.description }}</p>
              <div class="meta">
                <span>📹 {{ playlist.videoCount }} videos</span>
              </div>
              <button 
                (click)="selectPlaylistForVideos(playlist.name)"
                [class.active]="selectedPlaylist === playlist.name"
                class="btn btn-secondary"
              >
                Manage Videos
              </button>
            </div>
          </div>

          <div *ngIf="playlists.length === 0" class="empty-state">
            No playlists yet. Create one above! 🚀
          </div>
        </div>

        <!-- Video Management Section -->
        <div class="section" *ngIf="selectedPlaylist">
          <h2>🎬 Video Management - {{ selectedPlaylist }}</h2>
          
          <form [formGroup]="videoForm" (ngSubmit)="addVideo()">
            <div class="form-group">
              <label>Video URL</label>
              <input 
                type="text" 
                formControlName="videoUrl"
                placeholder="https://youtu.be/... or video file URL"
                class="form-input"
              >
              <small>Supports YouTube, MP4, WebM, HLS (m3u8), and DASH (mpd)</small>
            </div>

            <div class="form-group">
              <label>Title</label>
              <input 
                type="text" 
                formControlName="title"
                placeholder="Video title..."
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label>Creator</label>
              <input 
                type="text" 
                formControlName="creator"
                placeholder="Creator name..."
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea 
                formControlName="description"
                placeholder="Video description..."
                class="form-textarea"
                rows="4"
              ></textarea>
            </div>

            <div class="form-group">
              <label>Category</label>
              <input 
                type="text" 
                formControlName="category"
                placeholder="e.g., Education, Entertainment..."
                class="form-input"
              >
            </div>

            <button 
              type="submit" 
              [disabled]="!videoForm.valid || isAddingVideo"
              class="btn btn-primary"
            >
              {{ isAddingVideo ? '⏳ Adding...' : '➕ Add Video' }}
            </button>
          </form>

          <!-- Videos in Playlist -->
          <div class="videos-list">
            <h3>Videos in "{{ selectedPlaylist }}"</h3>
            
            <div *ngFor="let video of videosInPlaylist" class="video-item">
              <div class="video-info">
                <h4>{{ video.title }}</h4>
                <p class="url">{{ video.url | slice:0:60 }}...</p>
                <p><strong>Creator:</strong> {{ video.creator }}</p>
                <p><strong>Description:</strong> {{ video.description }}</p>
                <div class="meta">
                  <span>⏱️ {{ formatDuration(video.duration) }}</span>
                  <span>👁️ {{ video.views || 0 }} views</span>
                  <span>📁 {{ video.category }}</span>
                </div>
              </div>
              <button 
                (click)="deleteVideo(video.url)"
                class="btn-delete"
                title="Delete video"
              >
                🗑️
              </button>
            </div>

            <div *ngIf="videosInPlaylist.length === 0" class="empty-state">
              No videos in this playlist. Add one above! ➕
            </div>
          </div>
        </div>
      </div>

      <!-- Error Toast -->
      <div *ngIf="errorMessage" class="error-toast">
        ⚠️ {{ errorMessage }}
        <button (click)="clearError()" class="close-btn">×</button>
      </div>

      <!-- Success Toast -->
      <div *ngIf="successMessage" class="success-toast">
        ✅ {{ successMessage }}
      </div>

      <!-- Loading Indicator -->
      <div *ngIf="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  `,
  styles: [`
    .studio-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .studio-header {
      max-width: 1200px;
      margin: 0 auto 2rem;
    }

    .studio-header h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
    }

    .studio-header p {
      margin: 0;
      opacity: 0.9;
    }

    .studio-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .section h2 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }

    .section h3 {
      margin-top: 0;
      margin-bottom: 1rem;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      font-size: 1rem;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(100, 200, 255, 0.8);
      box-shadow: 0 0 0 3px rgba(100, 200, 255, 0.2);
    }

    .form-input::placeholder,
    .form-textarea::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    .form-group small {
      display: block;
      margin-top: 0.25rem;
      opacity: 0.7;
      font-size: 0.85rem;
    }

    /* Button Styles */
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 165, 245, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(100, 200, 255, 0.2);
      color: #64c8ff;
      border: 1px solid rgba(100, 200, 255, 0.5);
      margin-top: 1rem;
      width: 100%;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(100, 200, 255, 0.3);
      border-color: rgba(100, 200, 255, 0.8);
    }

    .btn-secondary.active {
      background: rgba(100, 200, 255, 0.4);
      border-color: rgba(100, 200, 255, 1);
    }

    .btn-delete {
      background: rgba(255, 68, 68, 0.2);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-delete:hover {
      background: rgba(255, 68, 68, 0.4);
      color: #ff4444;
    }

    /* Playlist Grid */
    .playlists-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .playlist-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .playlist-card:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(100, 200, 255, 0.5);
      transform: translateY(-4px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1.2rem;
      word-break: break-word;
    }

    .description {
      opacity: 0.8;
      margin: 0.5rem 0;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .meta {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      opacity: 0.7;
      margin: 1rem 0;
    }

    /* Videos List */
    .videos-list {
      margin-top: 2rem;
    }

    .video-item {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      transition: all 0.2s ease;
    }

    .video-item:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(100, 200, 255, 0.3);
    }

    .video-info {
      flex: 1;
      min-width: 0;
    }

    .video-info h4 {
      margin: 0 0 0.5rem 0;
      word-break: break-word;
    }

    .url {
      font-size: 0.8rem;
      opacity: 0.6;
      word-break: break-all;
      margin: 0.25rem 0;
    }

    .video-info p {
      margin: 0.25rem 0;
      font-size: 0.9rem;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 2rem;
      opacity: 0.6;
    }

    /* Toasts */
    .error-toast,
    .success-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    }

    .error-toast {
      background: #d32f2f;
    }

    .success-toast {
      background: #388e3c;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
    }

    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      gap: 1rem;
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

    @media (max-width: 768px) {
      .studio-container {
        padding: 1rem;
      }

      .studio-header h1 {
        font-size: 1.8rem;
      }

      .section {
        padding: 1.5rem;
      }

      .playlists-grid {
        grid-template-columns: 1fr;
      }

      .video-item {
        flex-direction: column;
      }
    }
  `]
})

export class StudioComponent implements OnInit, OnDestroy {
  playlistForm!: FormGroup;
  videoForm!: FormGroup;

  playlists: Playlist[] = [];
  selectedPlaylist: string = '';
  videosInPlaylist: Video[] = [];

  isCreatingPlaylist = false;
  isAddingVideo = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private videoService: VideoService,
    private cacheService: CacheService
  ) {
    this.playlistForm = this.fb.group({
      playlistName: ['', [Validators.required, Validators.minLength(3)]],
      playlistDescription: ['']
    });

    this.videoForm = this.fb.group({
      videoUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      title: ['', [Validators.required, Validators.minLength(3)]],
      creator: ['', Validators.required],
      description: ['', Validators.minLength(10)],
      category: ['']
    });
  }

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
    } catch (error) {
      console.error('Error loading playlists:', error);
      this.showError('Failed to load playlists');
    } finally {
      this.isLoading = false;
    }
  }

  async createPlaylist() {
    if (!this.playlistForm.valid) return;

    try {
      this.isCreatingPlaylist = true;
      const { playlistName, playlistDescription } = this.playlistForm.value;
      await this.firebaseService.createPlaylist(playlistName, playlistDescription);
      
      this.showSuccess(`Playlist "${playlistName}" created!`);
      this.playlistForm.reset();
      await this.loadPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      this.showError('Failed to create playlist');
    } finally {
      this.isCreatingPlaylist = false;
    }
  }

  async deletePlaylist(name: string) {
    if (!confirm(`Delete playlist "${name}"? This cannot be undone.`)) return;

    try {
      await this.firebaseService.deletePlaylist(name);
      this.showSuccess(`Playlist "${name}" deleted`);
      if (this.selectedPlaylist === name) {
        this.selectedPlaylist = '';
        this.videosInPlaylist = [];
      }
      await this.loadPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      this.showError('Failed to delete playlist');
    }
  }

  async selectPlaylistForVideos(playlistName: string) {
    try {
      this.selectedPlaylist = playlistName;
      this.videosInPlaylist = await this.firebaseService.loadPlaylist(playlistName);
    } catch (error) {
      console.error('Error loading playlist videos:', error);
      this.showError('Failed to load videos');
    }
  }

  async addVideo() {
    if (!this.videoForm.valid || !this.selectedPlaylist) return;

    try {
      this.isAddingVideo = true;
      const formValue = this.videoForm.value;
      
      // Get video duration
      let duration = '0:00';
      try {
        const durationSeconds = await this.videoService.getVideoDuration(formValue.videoUrl);
        duration = this.videoService.formatDuration(durationSeconds);
      } catch (e) {
        console.warn('Could not get video duration:', e);
      }

      const video: Video = {
        url: formValue.videoUrl,
        title: formValue.title,
        creator: formValue.creator,
        description: formValue.description,
        category: formValue.category || 'Uncategorized',
        duration: duration,
        views: 0,
        addedAt: Date.now(),
        lastTime: 0
      };

      await this.firebaseService.addVideo(this.selectedPlaylist, video);
      this.showSuccess('Video added successfully!');
      this.videoForm.reset();
      await this.selectPlaylistForVideos(this.selectedPlaylist);
    } catch (error) {
      console.error('Error adding video:', error);
      this.showError('Failed to add video');
    } finally {
      this.isAddingVideo = false;
    }
  }

  async deleteVideo(url: string) {
    if (!confirm('Delete this video? This cannot be undone.')) return;

    try {
      await this.firebaseService.deleteVideo(this.selectedPlaylist, url);
      this.showSuccess('Video deleted');
      await this.selectPlaylistForVideos(this.selectedPlaylist);
    } catch (error) {
      console.error('Error deleting video:', error);
      this.showError('Failed to delete video');
    }
  }

  formatDuration(duration: string | undefined): string {
    return this.videoService.formatDuration(
      this.videoService.parseDuration(duration)
    );
  }

  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  showSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  clearError() {
    this.errorMessage = '';
  }
}
