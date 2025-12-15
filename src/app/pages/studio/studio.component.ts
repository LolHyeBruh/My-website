import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { CacheService } from '../../services/cache.service';
import { Video, Playlist } from '../../models/video.model';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="studio-container">
      <!-- Check if admin -->
      <div *ngIf="!(isAdmin$ | async)" class="access-denied">
        <h2>❌ Access Denied</h2>
        <p>Only admins can access the studio</p>
      </div>

      <!-- Studio Dashboard -->
      <div *ngIf="(isAdmin$ | async)" class="studio-content">
        <!-- Header -->
        <header class="studio-header">
          <h1>🎬 Video Studio</h1>
          <p>Manage your playlists and videos</p>
        </header>

        <!-- Main Grid -->
        <div class="studio-grid">
          <!-- Left: Forms -->
          <div class="forms-panel">
            <!-- Create Playlist Section -->
            <div class="form-section">
              <h2>📋 Create Playlist</h2>
              <form [formGroup]="playlistForm" (ngSubmit)="createPlaylist()">
                <div class="form-group">
                  <label>Playlist Name *</label>
                  <input 
                    type="text" 
                    formControlName="name"
                    placeholder="Enter playlist name"
                    class="form-input"
                  />
                  <span class="error" *ngIf="playlistForm.get('name')?.invalid && playlistForm.get('name')?.touched">
                    ⚠️ Playlist name is required
                  </span>
                </div>

                <div class="form-group">
                  <label>Description</label>
                  <textarea 
                    formControlName="description"
                    placeholder="Enter playlist description"
                    rows="3"
                    class="form-input"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  [disabled]="playlistForm.invalid || creatingPlaylist"
                  class="btn btn-primary"
                >
                  {{ creatingPlaylist ? '⏳ Creating...' : '✨ Create Playlist' }}
                </button>
              </form>
            </div>

            <hr class="divider" />

            <!-- Add Video Section -->
            <div class="form-section">
              <h2>🎥 Add Video</h2>
              
              <div class="form-group">
                <label>Select Playlist *</label>
                <select [(ngModel)]="selectedPlaylistForVideo" class="form-input">
                  <option value="">-- Choose a playlist --</option>
                  <option *ngFor="let p of playlists" [value]="p.name">
                    {{ p.name }} ({{ p.videoCount }} videos)
                  </option>
                </select>
              </div>

              <form [formGroup]="videoForm" (ngSubmit)="addVideo()" *ngIf="selectedPlaylistForVideo">
                <div class="form-group">
                  <label>Video URL *</label>
                  <input 
                    type="url" 
                    formControlName="url"
                    placeholder="https://example.com/video.mp4"
                    class="form-input"
                  />
                  <span class="error" *ngIf="videoForm.get('url')?.invalid && videoForm.get('url')?.touched">
                    ⚠️ Valid URL is required
                  </span>
                </div>

                <div class="form-group">
                  <label>Video Title *</label>
                  <input 
                    type="text" 
                    formControlName="title"
                    placeholder="Enter video title"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label>Description</label>
                  <textarea 
                    formControlName="description"
                    placeholder="Enter video description"
                    rows="3"
                    class="form-input"
                  ></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Duration (MM:SS) *</label>
                    <input 
                      type="text" 
                      formControlName="duration"
                      placeholder="10:30"
                      pattern="\\d{1,2}:\\d{2}"
                      class="form-input"
                    />
                  </div>

                  <div class="form-group">
                    <label>Creator</label>
                    <input 
                      type="text" 
                      formControlName="creator"
                      placeholder="Your name"
                      class="form-input"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  [disabled]="videoForm.invalid || addingVideo"
                  class="btn btn-primary"
                >
                  {{ addingVideo ? '⏳ Adding...' : '➕ Add Video' }}
                </button>
              </form>

              <div *ngIf="!selectedPlaylistForVideo" class="info-box">
                👆 Select a playlist first to add videos
              </div>
            </div>
          </div>

          <!-- Right: Playlists & Videos -->
          <div class="content-panel">
            <!-- Playlists List -->
            <div class="section">
              <div class="section-header">
                <h2>📚 Your Playlists</h2>
                <button (click)="refreshPlaylists()" class="btn-small" title="Refresh">
                  🔄 Refresh
                </button>
              </div>

              <div class="playlists-table">
                <div class="table-header">
                  <div class="col-name">Name</div>
                  <div class="col-videos">Videos</div>
                  <div class="col-created">Created</div>
                  <div class="col-action">Action</div>
                </div>

                <div *ngFor="let playlist of playlists" class="table-row">
                  <div class="col-name">
                    <strong>{{ playlist.name }}</strong>
                    <p *ngIf="playlist.description" class="desc">{{ playlist.description }}</p>
                  </div>
                  <div class="col-videos">{{ playlist.videoCount }}</div>
                  <div class="col-created">{{ formatDate(playlist.createdAt) }}</div>
                  <div class="col-action">
                    <button 
                      (click)="deletePlaylist(playlist.name)"
                      [disabled]="deletingPlaylist === playlist.name"
                      class="btn-danger btn-small"
                    >
                      {{ deletingPlaylist === playlist.name ? '⏳' : '🗑️ Delete' }}
                    </button>
                  </div>
                </div>

                <div *ngIf="playlists.length === 0" class="empty-table">
                  <p>No playlists yet. Create one above! 🚀</p>
                </div>
              </div>
            </div>

            <!-- Videos in Selected Playlist -->
            <div class="section" *ngIf="selectedPlaylistForVideo">
              <h2>🎬 Videos in {{ selectedPlaylistForVideo }}</h2>

              <div class="videos-table">
                <div class="table-header">
                  <div class="col-title">Title</div>
                  <div class="col-duration">Duration</div>
                  <div class="col-views">Views</div>
                  <div class="col-date">Added</div>
                  <div class="col-action">Action</div>
                </div>

                <div *ngFor="let video of videosInPlaylist" class="table-row">
                  <div class="col-title">
                    <strong>{{ video.title }}</strong>
                    <p class="url">{{ video.url | slice:0:50 }}...</p>
                  </div>
                  <div class="col-duration">{{ video.duration }}</div>
                  <div class="col-views">{{ video.views }}</div>
                  <div class="col-date">{{ formatDate(video.addedAt) }}</div>
                  <div class="col-action">
                    <button 
                      (click)="deleteVideo(selectedPlaylistForVideo, video.url)"
                      [disabled]="deletingVideo === video.url"
                      class="btn-danger btn-small"
                    >
                      {{ deletingVideo === video.url ? '⏳' : '🗑️' }}
                    </button>
                  </div>
                </div>

                <div *ngIf="videosInPlaylist.length === 0" class="empty-table">
                  <p>No videos in this playlist. Add one above! ➕</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .studio-container {
      width: 100%;
      background: #0f0f0f;
      color: #fff;
      border-radius: 8px;
      overflow: hidden;
    }

    .access-denied {
      padding: 60px 20px;
      text-align: center;
      background: #212121;
      border-radius: 8px;
    }

    .access-denied h2 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }

    .access-denied p {
      margin: 0;
      color: #aaa;
    }

    .studio-content {
      width: 100%;
    }

    .studio-header {
      background: linear-gradient(135deg, #065fd4 0%, #0544a8 100%);
      padding: 30px 20px;
      text-align: center;
    }

    .studio-header h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
    }

    .studio-header p {
      margin: 0;
      color: rgba(255, 255, 255, 0.8);
    }

    .studio-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 30px;
      padding: 30px;
    }

    /* FORMS PANEL */
    .forms-panel {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .form-section {
      background: #1a1a1a;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #333;
    }

    .form-section h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #ddd;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #065fd4;
      box-shadow: 0 0 0 2px rgba(6, 95, 212, 0.2);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .error {
      display: block;
      margin-top: 4px;
      color: #ff6b6b;
      font-size: 12px;
    }

    .info-box {
      background: rgba(6, 95, 212, 0.1);
      border: 1px solid rgba(6, 95, 212, 0.3);
      padding: 12px;
      border-radius: 6px;
      color: #aaa;
      font-size: 14px;
      text-align: center;
    }

    .divider {
      background: #333;
      border: none;
      height: 1px;
      margin: 0;
    }

    /* BUTTONS */
    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }

    .btn-primary {
      background: #065fd4;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0544a8;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-danger {
      background: #ff4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #cc0000;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 13px;
      width: auto;
    }

    /* CONTENT PANEL */
    .content-panel {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .section {
      background: #1a1a1a;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #333;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
    }

    /* TABLES */
    .playlists-table, .videos-table {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: #333;
      border-radius: 6px;
      overflow: hidden;
    }

    .table-header {
      display: grid;
      gap: 1px;
      background: #333;
      padding: 1px;
    }

    .playlists-table .table-header {
      grid-template-columns: 2fr 1fr 1.5fr 1fr;
    }

    .videos-table .table-header {
      grid-template-columns: 2fr 0.8fr 0.8fr 1fr 0.6fr;
    }

    .table-header > div {
      background: #212121;
      padding: 12px;
      font-weight: 600;
      font-size: 13px;
      color: #aaa;
      text-transform: uppercase;
    }

    .table-row {
      display: grid;
      gap: 1px;
      background: #333;
      padding: 1px;
    }

    .playlists-table .table-row {
      grid-template-columns: 2fr 1fr 1.5fr 1fr;
    }

    .videos-table .table-row {
      grid-template-columns: 2fr 0.8fr 0.8fr 1fr 0.6fr;
    }

    .table-row > div {
      background: #1a1a1a;
      padding: 12px;
      font-size: 14px;
    }

    .col-name {
      display: flex;
      flex-direction: column;
    }

    .col-name strong {
      margin-bottom: 4px;
    }

    .desc, .url {
      margin: 0;
      font-size: 12px;
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-action {
      text-align: center;
    }

    .empty-table {
      grid-column: 1 / -1;
      padding: 30px;
      text-align: center;
      color: #666;
      background: #1a1a1a;
    }

    /* RESPONSIVE */
    @media (max-width: 1200px) {
      .studio-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .studio-grid {
        padding: 15px;
        gap: 20px;
      }

      .playlists-table .table-header,
      .playlists-table .table-row {
        grid-template-columns: 1fr !important;
      }

      .videos-table .table-header,
      .videos-table .table-row {
        grid-template-columns: 1fr !important;
      }

      .col-videos, .col-created, .col-duration, .col-views, .col-date {
        display: none;
      }
    }
  `]
})
export class StudioComponent implements OnInit {
  isAdmin$ = this.firebaseService.isAdmin$;

  playlistForm: FormGroup;
  videoForm: FormGroup;

  playlists: Playlist[] = [];
  videosInPlaylist: Video[] = [];
  selectedPlaylistForVideo: string = '';

  creatingPlaylist = false;
  addingVideo = false;
  deletingPlaylist: string | null = null;
  deletingVideo: string | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private cacheService: CacheService,
    private fb: FormBuilder
  ) {
    this.playlistForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });

    this.videoForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      duration: ['', [Validators.required, Validators.pattern(/^\\d{1,2}:\\d{2}$/)]],
      creator: ['']
    });
  }

  ngOnInit(): void {
    this.loadPlaylists();
  }

  async loadPlaylists(): Promise<void> {
    try {
      this.playlists = await this.firebaseService.getPlaylistList();
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }

  async createPlaylist(): Promise<void> {
    if (!this.playlistForm.valid) return;

    this.creatingPlaylist = true;
    try {
      const { name, description } = this.playlistForm.value;
      await this.firebaseService.createPlaylist(name, description);
      this.playlistForm.reset();
      await this.loadPlaylists();
      alert('✅ Playlist created successfully!');
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('❌ Error creating playlist');
    } finally {
      this.creatingPlaylist = false;
    }
  }

  async deletePlaylist(name: string): Promise<void> {
    if (!confirm(`Delete playlist "${name}"?`)) return;

    this.deletingPlaylist = name;
    try {
      await this.firebaseService.deletePlaylist(name);
      await this.loadPlaylists();
      if (this.selectedPlaylistForVideo === name) {
        this.selectedPlaylistForVideo = '';
        this.videosInPlaylist = [];
      }
      alert('✅ Playlist deleted');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('❌ Error deleting playlist');
    } finally {
      this.deletingPlaylist = null;
    }
  }

  async addVideo(): Promise<void> {
    if (!this.videoForm.valid || !this.selectedPlaylistForVideo) return;

    this.addingVideo = true;
    try {
      const video: Video = {
        ...this.videoForm.value,
        views: 0,
        addedAt: Date.now(),
        category: 'Uncategorized',
        lastTime: 0
      };

      await this.firebaseService.addVideo(this.selectedPlaylistForVideo, video);
      this.videoForm.reset();
      await this.loadPlaylistVideos(this.selectedPlaylistForVideo);
      alert('✅ Video added successfully!');
    } catch (error) {
      console.error('Error adding video:', error);
      alert('❌ Error adding video');
    } finally {
      this.addingVideo = false;
    }
  }

  async deleteVideo(playlistName: string, videoUrl: string): Promise<void> {
    if (!confirm('Delete this video?')) return;

    this.deletingVideo = videoUrl;
    try {
      await this.firebaseService.deleteVideo(playlistName, videoUrl);
      await this.loadPlaylistVideos(playlistName);
      alert('✅ Video deleted');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('❌ Error deleting video');
    } finally {
      this.deletingVideo = null;
    }
  }

  async loadPlaylistVideos(playlistName: string): Promise<void> {
    try {
      this.videosInPlaylist = await this.firebaseService.loadPlaylist(playlistName);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  }

  selectPlaylistForVideo(playlistName: string): void {
    this.selectedPlaylistForVideo = playlistName;
    this.loadPlaylistVideos(playlistName);
  }

  refreshPlaylists(): void {
    this.cacheService.invalidate('playlists');
    this.loadPlaylists();
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}