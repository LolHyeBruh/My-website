import { Component, OnInit, OnDestroy, ViewChild, ElementRef, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { CacheService } from '../../services/cache.service';
import { Video, Playlist } from '../../models/video.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-playlist-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar-container">
      <div class="sidebar-header">
        <h2>📋 Playlists</h2>
        <button (click)="refreshPlaylists()" class="refresh-btn">🔄</button>
      </div>

      <div class="playlists-list" #playlistsContainer>
        <div 
          *ngFor="let playlist of playlistList" 
          (click)="selectPlaylist(playlist.name)"
          [class.active]="selectedPlaylist === playlist.name"
          class="playlist-item"
        >
          <span>{{ playlist.name }}</span>
          <span class="count">{{ playlist.videoCount }}</span>
        </div>

        <div *ngIf="playlistList.length === 0" class="empty">
          No playlists yet
        </div>
      </div>

      <div class="sidebar-form" *ngIf="selectedPlaylist">
        <h3>Add Video</h3>
        <input 
          [(ngModel)]="newVideo.url" 
          placeholder="Video URL"
          class="input-field"
        />
        <input 
          [(ngModel)]="newVideo.title" 
          placeholder="Title"
          class="input-field"
        />
        <textarea 
          [(ngModel)]="newVideo.description" 
          placeholder="Description"
          class="input-field"
        ></textarea>
        <input 
          [(ngModel)]="newVideo.duration" 
          placeholder="Duration (MM:SS)"
          class="input-field"
        />
        <button (click)="addVideo()" class="btn-add">➕ Add</button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-container {
      padding: 16px;
      background: #212121;
      border-radius: 8px;
      height: 100%;
      overflow-y: auto;
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
    }

    .refresh-btn {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 18px;
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
      margin-bottom: 16px;
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

    .count {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .empty {
      padding: 20px;
      text-align: center;
      color: #888;
      font-size: 12px;
    }

    .sidebar-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sidebar-form h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .input-field {
      padding: 8px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      font-family: inherit;
    }

    .input-field:focus {
      outline: none;
      border-color: #065fd4;
    }

    .btn-add {
      padding: 8px;
      background: #065fd4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }

    .btn-add:hover {
      background: #0544a8;
    }
  `]
})
export class PlaylistSidebarComponent implements OnInit, OnDestroy {
  @Output() playlistSelected = new EventEmitter<string>();
  @Output() videoSelected = new EventEmitter<Video>();
  @Input() currentPlaylistVideos: Video[] = [];

  playlistList: Playlist[] = [];
  selectedPlaylist: string | null = null;
  sortBy: 'asc' | 'desc' = 'asc';
  
  newVideo = {
    url: '',
    title: '',
    description: '',
    category: 'Uncategorized',
    duration: ''
  };

  @ViewChild('playlistsContainer') playlistsContainer: ElementRef | null = null;

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
      this.playlistList = await this.firebaseService.getPlaylistList();
      const savedPlaylist = localStorage.getItem('lastPlaylist');
      if (savedPlaylist && this.playlistList.find(p => p.name === savedPlaylist)) {
        this.selectPlaylist(savedPlaylist);
      } else if (this.playlistList.length > 0) {
        this.selectPlaylist(this.playlistList[0].name);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  }

  async selectPlaylist(name: string): Promise<void> {
    this.selectedPlaylist = name;
    localStorage.setItem('lastPlaylist', name);
    this.playlistSelected.emit(name);
  }

  async addVideo(): Promise<void> {
    if (!this.selectedPlaylist || !this.newVideo.url || !this.newVideo.title) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const video: Video = {
        url: this.newVideo.url,
        title: this.newVideo.title,
        description: this.newVideo.description,
        duration: this.newVideo.duration,
        category: this.newVideo.category,
        addedAt: Date.now(),
        views: 0,
        lastTime: 0
      };

      await this.firebaseService.addVideo(this.selectedPlaylist, video);
      
      this.newVideo = {
        url: '',
        title: '',
        description: '',
        category: 'Uncategorized',
        duration: ''
      };

      alert('✅ Video added!');
      this.cacheService.invalidate(`playlist_${this.selectedPlaylist}`);
    } catch (error) {
      console.error('Error adding video:', error);
      alert('❌ Error adding video');
    }
  }

  refreshPlaylists(): void {
    this.cacheService.clear();
    this.loadPlaylists();
  }
}