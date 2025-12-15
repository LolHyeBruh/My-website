import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { VideoService } from '../../services/video.service';
import { CacheService } from '../../services/cache.service';
import { Video, Playlist } from '../../models/video.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-playlist-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="sidebar" #sidebar>
      <div class="sidebar-controls">
        <select
          [(ngModel)]="selectedPlaylist"
          (change)="onPlaylistChange()"
          class="playlist-select">
          <option *ngFor="let name of playlistNames" [value]="name">
            {{ name }}
          </option>
        </select>

        <select
          [(ngModel)]="sortBy"
          (change)="onSortChange()"
          class="sort-select"
          *ngIf="isAdmin">
          <option value="">Sort by...</option>
          <option value="asc">Title (A → Z)</option>
          <option value="desc">Title (Z → A)</option>
          <option value="views">View Count</option>
          <option value="duration">Duration</option>
          <option value="latest">Latest Added</option>
          <option value="earliest">Earliest Added</option>
        </select>

        <div class="filter-controls" *ngIf="isAdmin">
          <select [(ngModel)]="categoryFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Categories</option>
            <option value="Ass">Ass</option>
            <option value="Tits">Tits</option>
            <option value="Ass & Tits">Ass & Tits</option>
            <option value="Neither">Neither</option>
          </select>

          <select [(ngModel)]="durationFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Durations</option>
            <option value="short">Short (< 5 min)</option>
            <option value="long">Long (5+ min)</option>
          </select>
        </div>
      </div>

      <!-- Admin Add Video Form -->
      <div class="admin-section" *ngIf="isAdmin">
        <button (click)="createNewPlaylist()" class="admin-btn primary">Create Playlist</button>
        <button (click)="deleteCurrentPlaylist()" class="admin-btn danger">Delete Playlist</button>

        <div class="form-group">
          <input
            [(ngModel)]="newVideoUrl"
            placeholder="Video URL"
            class="form-input">
          <input
            [(ngModel)]="newVideoTitle"
            placeholder="Video Title"
            class="form-input">
          <input
            [(ngModel)]="newVideoDescription"
            placeholder="Description (optional)"
            class="form-input">

          <select [(ngModel)]="newVideoCategory" class="form-input">
            <option value="">-- Select Category --</option>
            <option value="Ass">Ass</option>
            <option value="Tits">Tits</option>
            <option value="Ass & Tits">Ass & Tits</option>
            <option value="Neither">Neither</option>
          </select>

          <button (click)="addVideo()" class="admin-btn primary">Add Video</button>
        </div>
      </div>

      <!-- Playlist Items -->
      <div class="playlist-items-container" #playlistContainer>
        <div
          *ngFor="let video of filteredVideos; let i = index"
          [class.active]="i === currentIndex"
          class="playlist-item"
          (click)="selectVideo(i)">

          <div class="item-info">
            <strong>{{ video.title }}</strong>
            <div class="item-meta">
              <span>{{ getVideoViews(video) }} views</span>
              <span>{{ video.duration || '00:00:00' }}</span>
            </div>
          </div>

          <div class="item-actions" *ngIf="isAdmin">
            <button (click)="moveUp(i, $event)" class="action-btn">↑</button>
            <button (click)="moveDown(i, $event)" class="action-btn">↓</button>
            <button (click)="deleteVideo(i, $event)" class="action-btn">🗑</button>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      flex: 0 0 320px;
      background: #1e1e1e;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      overflow-y: auto;
      border-right: 1px solid #444;
    }

    .sidebar-controls,
    .admin-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .playlist-select,
    .sort-select,
    .filter-select,
    .form-input {
      padding: 8px;
      background: #2a2a2a;
      color: #fff;
      border: 1px solid #444;
      border-radius: 4px;
      font-size: 13px;
      width: 100%;
    }

    .playlist-select:focus,
    .sort-select:focus,
    .filter-select:focus,
    .form-input:focus {
      outline: none;
      border-color: #e53935;
      box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.2);
    }

    .admin-btn {
      padding: 8px;
      background: #e53935;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .admin-btn:hover {
      background: #b71c1c;
    }

    .admin-btn.danger {
      background: #c62828;
    }

    .admin-btn.danger:hover {
      background: #ad1457;
    }

    .filter-controls {
      display: flex;
      gap: 4px;
    }

    .filter-controls .filter-select {
      flex: 1;
    }

    .playlist-items-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .playlist-item {
      display: flex;
      padding: 6px;
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 4px;
      cursor: pointer;
      align-items: center;
      justify-content: space-between;
      transition: background 0.2s;
      -webkit-user-select: none;
      user-select: none;
    }

    .playlist-item:hover {
      background: #333;
    }

    .playlist-item.active {
      background: #555;
      border-color: #e53935;
    }

    .item-info {
      flex: 1;
      min-width: 0;
      text-align: left;
    }

    .item-info strong {
      display: block;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-meta {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: #999;
      margin-top: 2px;
    }

    .item-actions {
      display: flex;
      gap: 2px;
      margin-left: 4px;
    }

    .action-btn {
      padding: 4px 6px;
      background: transparent;
      border: 1px solid #444;
      color: #fff;
      cursor: pointer;
      border-radius: 3px;
      font-size: 11px;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #e53935;
      border-color: #e53935;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Mobile responsive */
    @media (max-width: 1024px) {
      .sidebar {
        flex: 0 0 auto;
        height: auto;
        max-height: 40vh;
        border-right: none;
        border-bottom: 1px solid #444;
        flex-wrap: wrap;
        flex-direction: row;
      }

      .sidebar-controls,
      .admin-section {
        flex-direction: row;
        flex: 1;
        min-width: 200px;
      }

      .playlist-items-container {
        display: flex;
        flex-direction: row;
        overflow-x: auto;
        width: 100%;
        flex: unset;
      }

      .playlist-item {
        flex: 0 0 auto;
        min-width: 180px;
      }

      .admin-section {
        display: none;
      }
    }

    /* Prevent text selection on buttons */
    button {
      -webkit-user-select: none;
      user-select: none;
    }

    /* Remove tap highlight on mobile */
    button {
      -webkit-tap-highlight-color: rgba(229, 57, 53, 0.1);
    }

    /* Smooth scrolling */
    .playlist-items-container {
      scroll-behavior: smooth;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistSidebarComponent implements OnInit, OnDestroy {
  @Input() isAdmin = false;
  @Output() videoSelected = new EventEmitter<Video>();

  private destroy$ = new Subject<void>();
  private viewCache: Record<string, number> = {};

  playlists: Playlist = {};
  playlistNames: string[] = [];
  selectedPlaylist = '';
  currentIndex = 0;
  sortBy = '';
  categoryFilter = '';
  durationFilter = '';
  filteredVideos: Video[] = [];

  newVideoUrl = '';
  newVideoTitle = '';
  newVideoDescription = '';
  newVideoCategory = '';

  constructor(
    private firebaseService: FirebaseService,
    private videoService: VideoService,
    private cacheService: CacheService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadPlaylists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadPlaylists(): Promise<void> {
    try {
      this.playlists = await this.firebaseService.loadPlaylists();
      this.playlistNames = Object.keys(this.playlists);

      const savedPlaylist = this.cacheService.getLocalStorage('lastPlaylist');
      this.selectedPlaylist =
        savedPlaylist && this.playlists[savedPlaylist]
          ? savedPlaylist
          : this.playlistNames[0] || '';

      if (this.selectedPlaylist) {
        await this.onPlaylistChange();
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }

  async onPlaylistChange(): Promise<void> {
    if (!this.selectedPlaylist) return;

    try {
      this.cacheService.setLocalStorage('lastPlaylist', this.selectedPlaylist);
      this.viewCache = await this.firebaseService.preloadViewCounts(this.selectedPlaylist);

      const savedIndex = this.cacheService.getLocalStorage(
        this.selectedPlaylist + '_lastIndex'
      );
      this.currentIndex = savedIndex || 0;

      this.renderPlaylist();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error changing playlist:', error);
    }
  }

  async onSortChange(): Promise<void> {
    if (!this.selectedPlaylist || !this.sortBy) return;

    try {
      const videos = this.playlists[this.selectedPlaylist];
      const sorted = this.videoService.sortVideos(videos, this.sortBy);
      this.playlists[this.selectedPlaylist] = sorted;

      await this.firebaseService.savePlaylist(this.selectedPlaylist, sorted, this.sortBy);
      this.renderPlaylist();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error sorting playlist:', error);
    }
  }

  onFilterChange(): void {
    this.renderPlaylist();
  }

  renderPlaylist(): void {
    let videos = this.playlists[this.selectedPlaylist] || [];

    videos = this.videoService.filterByCategory(videos, this.categoryFilter);
    videos = this.videoService.filterByDuration(videos, this.durationFilter);

    this.filteredVideos = videos;
    this.cdr.markForCheck();
  }

  selectVideo(index: number): void {
    this.currentIndex = index;
    const video = this.filteredVideos[index];
    if (video) {
      this.videoSelected.emit(video);
      this.cacheService.setLocalStorage(
        this.selectedPlaylist + '_lastIndex',
        index
      );
    }
    this.cdr.markForCheck();
  }

  async createNewPlaylist(): Promise<void> {
    const name = prompt('Enter new playlist name:');
    if (!name) return;

    if (this.playlists[name]) {
      alert('Playlist already exists!');
      return;
    }

    this.playlists[name] = [];
    this.playlistNames.push(name);
    this.selectedPlaylist = name;

    try {
      await this.firebaseService.createPlaylistIfNotExists(name);
      this.onPlaylistChange();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Failed to create playlist');
    }
  }

  async deleteCurrentPlaylist(): Promise<void> {
    if (!this.selectedPlaylist) return;
    if (!confirm(`Delete "${this.selectedPlaylist}"?`)) return;

    try {
      await this.firebaseService.deletePlaylist(this.selectedPlaylist);
      delete this.playlists[this.selectedPlaylist];
      this.playlistNames = Object.keys(this.playlists);
      this.selectedPlaylist = this.playlistNames[0] || '';

      if (this.selectedPlaylist) {
        await this.onPlaylistChange();
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  }

  async addVideo(): Promise<void> {
    if (!this.newVideoUrl || !this.newVideoTitle) {
      alert('URL and Title required!');
      return;
    }

    if (!this.selectedPlaylist) {
      alert('Select or create a playlist first!');
      return;
    }

    try {
      const duration = await this.videoService.getVideoDuration(this.newVideoUrl);
      const video: Video = {
        url: this.newVideoUrl,
        title: this.newVideoTitle,
        description: this.newVideoDescription,
        category: this.newVideoCategory || 'Uncategorized',
        duration: this.videoService.formatDuration(duration),
        addedAt: Date.now(),
        views: 0
      };

      this.playlists[this.selectedPlaylist].push(video);
      await this.firebaseService.savePlaylist(
        this.selectedPlaylist,
        this.playlists[this.selectedPlaylist]
      );

      this.renderPlaylist();
      this.videoSelected.emit(video);

      this.newVideoUrl = '';
      this.newVideoTitle = '';
      this.newVideoDescription = '';
      this.newVideoCategory = '';

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error adding video:', error);
      alert('Failed to add video');
    }
  }

  async deleteVideo(index: number, event: Event): Promise<void> {
    event.stopPropagation();

    if (!confirm('Delete this video?')) return;

    try {
      this.playlists[this.selectedPlaylist].splice(index, 1);
      await this.firebaseService.savePlaylist(
        this.selectedPlaylist,
        this.playlists[this.selectedPlaylist]
      );

      this.renderPlaylist();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  }

  moveUp(index: number, event: Event): Promise<void> {
    return this.moveVideo(index, -1, event);
  }

  moveDown(index: number, event: Event): Promise<void> {
    return this.moveVideo(index, 1, event);
  }

  private async moveVideo(index: number, direction: number, event: Event): Promise<void> {
    event.stopPropagation();

    const newIndex = index + direction;
    const videos = this.playlists[this.selectedPlaylist];

    if (newIndex < 0 || newIndex >= videos.length) return;

    [videos[index], videos[newIndex]] = [videos[newIndex], videos[index]];

    try {
      await this.firebaseService.savePlaylist(this.selectedPlaylist, videos);
      this.renderPlaylist();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error moving video:', error);
    }
  }

  getVideoViews(video: Video): number {
    return video.views ?? this.viewCache[video.url] ?? 0;
  }
}