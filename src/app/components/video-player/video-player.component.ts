import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Video } from '../../models/video.model';
import { VideoService } from '../../services/video.service';
import { FirebaseService } from '../../services/firebase.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-player-container" (mousemove)="onMouseMove()">
      <!-- Video Element -->
      <video
        #videoElement
        class="video-player"
        preload="metadata"
        crossorigin="anonymous">
        (play)="onPlay()"
        (pause)="onPause()"
        (timeupdate)="onTimeUpdate()">
        Your browser does not support the video tag.
      </video>

      <!-- Loading Spinner -->
      <div class="loading-spinner" *ngIf="isLoading">
        <div class="spinner"></div>
      </div>

      <!-- Overlay Controls for Mobile -->
      <div class="overlay-controls" #overlayControls [class.show]="showOverlay">
        <button
          class="overlay-btn prev-btn"
          (click)="previousVideo()"
          [attr.aria-label]="'Previous video'">
          <i class="fas fa-backward"></i>
        </button>
        <button
          class="overlay-btn play-pause-btn"
          (click)="togglePlayPause()"
          [attr.aria-label]="showOverlay ? 'Play/Pause' : 'Show controls'">
          <i [class.fas]="true" [ngClass]="isPlaying ? 'fa-pause' : 'fa-play'"></i>
        </button>
        <button
          class="overlay-btn next-btn"
          (click)="nextVideo()"
          [attr.aria-label]="'Next video'">
          <i class="fas fa-forward"></i>
        </button>
        <button
          class="overlay-btn fullscreen-btn"
          (click)="toggleFullscreen($event)"
          [attr.aria-label]="'Toggle fullscreen'">
          <i class="fas fa-expand"></i>
        </button>
      </div>

      <!-- Video Info -->
      <div class="video-info" *ngIf="selectedVideo">
        <h2>{{ selectedVideo.title }}</h2>
        <p *ngIf="selectedVideo.description">{{ selectedVideo.description }}</p>
        <div class="video-meta">
          <span *ngIf="selectedVideo.duration">{{ selectedVideo.duration }}</span>
          <span *ngIf="selectedVideo.views">({{ selectedVideo.views }} views)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-player-container {
      position: relative;
      width: 100%;
      background: #000;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .video-player {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }

    .loading-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .overlay-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 20;
    }

    .overlay-controls.show {
      opacity: 1;
    }

    .overlay-btn {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    }

    .overlay-btn:hover {
      background: rgba(0, 0, 0, 0.9);
    }

    .video-info {
      padding: 16px;
      background: #1a1a1a;
      color: #fff;
      border-top: 1px solid #333;
    }

    .video-info h2 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }

    .video-info p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #ccc;
    }

    .video-meta {
      font-size: 12px;
      color: #999;
    }

    .video-meta span {
      margin-right: 16px;
    }

    @media (max-width: 768px) {
      .overlay-btn {
        padding: 8px 12px;
        font-size: 14px;
      }

      .video-info {
        padding: 12px;
      }

      .video-info h2 {
        font-size: 16px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPlayerComponent implements OnInit {
  @Input() selectedVideo: Video | null = null;
  @Input() isAdmin = false;

  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayControls', { static: false }) overlayControls!: ElementRef;

  isPlaying = false;
  isLoading = false;
  showOverlay = false;
  currentTime = 0;
  duration = 0;

  private overlayTimeout: any;
  private lastMouseMove = 0;

  constructor(
    private videoService: VideoService,
    private firebaseService: FirebaseService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupTouchControls();
  }

  private setupTouchControls(): void {
    // Safe check for videoElement
    if (!this.videoElement || !this.videoElement.nativeElement) {
      console.warn('Video element not available');
      return;
    }

    const video = this.videoElement.nativeElement;

    // Tap to show/hide controls
    video.addEventListener('click', () => this.toggleOverlay());

    // Prevent default fullscreen on double-tap
    let lastTap = 0;
    video.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 500 && tapLength > 0) {
        e.preventDefault();
      }
      lastTap = currentTime;
    }, false);
  }

  togglePlayPause(): void {
    if (!this.videoElement?.nativeElement) return;
    const video = this.videoElement.nativeElement;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  toggleOverlay(): void {
    this.showOverlay = !this.showOverlay;
    this.cdr.markForCheck();

    clearTimeout(this.overlayTimeout);
    if (this.showOverlay && this.isPlaying) {
      this.overlayTimeout = setTimeout(() => {
        this.showOverlay = false;
        this.cdr.markForCheck();
      }, 5000);
    }
  }

  onMouseMove(): void {
    const now = Date.now();
    if (now - this.lastMouseMove > 500) {
      this.showOverlay = true;
      this.cdr.markForCheck();
      this.lastMouseMove = now;

      clearTimeout(this.overlayTimeout);
      if (this.isPlaying) {
        this.overlayTimeout = setTimeout(() => {
          this.showOverlay = false;
          this.cdr.markForCheck();
        }, 3000);
      }
    }
  }

  toggleFullscreen(event: any): void {
    event.preventDefault();
    if (!this.videoElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    }
  }

  onPlay(): void {
    this.isPlaying = true;
    this.cdr.markForCheck();
    if (this.selectedVideo) {
      this.analyticsService.trackVideoPlay(this.selectedVideo.title);
    }
  }

  onPause(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onTimeUpdate(): void {
    if (!this.videoElement?.nativeElement) return;
    const video = this.videoElement.nativeElement;
    this.currentTime = video.currentTime;
  }

  previousVideo(): void {
    console.log('Previous video');
  }

  nextVideo(): void {
    console.log('Next video');
  }
}