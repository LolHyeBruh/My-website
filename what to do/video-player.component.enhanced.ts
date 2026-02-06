import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService } from '../../services/video.service';
import { FirebaseService } from '../../services/firebase.service';
import { CacheService } from '../../services/cache.service';
import { Video } from '../../models/video.model';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-player-container" (mousemove)="showControls()" (mouseleave)="hideControls()">
      <!-- Video Element -->
      <video
        #videoElement
        class="video-element"
        (loadedmetadata)="onVideoLoadedMetadata()"
        (play)="onVideoPlay()"
        (pause)="onVideoPause()"
        (ended)="onVideoEnded()"
        (timeupdate)="onTimeUpdate()"
        (click)="togglePlayPause()"
        (dblclick)="handleDoubleTap($event)"
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
      >
        <source [src]="videoUrl" [type]="videoType">
        Your browser does not support the video tag.
      </video>

      <!-- Mobile Gesture Indicators -->
      <div *ngIf="isDoubleTapSkip" class="double-tap-indicator">
        <span class="skip-direction" [class.forward]="isSkipForward">
          {{ isSkipForward ? '⏩ +10s' : '⏪ -10s' }}
        </span>
      </div>

      <!-- Controls (Show on hover/touch) -->
      <div class="controls-wrapper" [class.show]="showControlsPanel" [class.touch-mode]="isTouchDevice">
        <!-- Progress Bar -->
        <div class="progress-bar-container">
          <div class="progress-bar" [style.width.%]="progressPercent">
            <div class="progress-dot"></div>
          </div>
          <input 
            type="range" 
            min="0" 
            [max]="videoDuration" 
            [value]="currentTime" 
            class="progress-slider"
            (input)="onProgressSeek($event)"
          />
        </div>

        <!-- Bottom Controls -->
        <div class="controls-bottom">
          <!-- Left Controls -->
          <div class="controls-left">
            <button class="control-btn" (click)="togglePlayPause()" title="Play/Pause">
              <span class="icon">{{ isPlaying ? '⏸' : '▶' }}</span>
            </button>
            <button class="control-btn" (click)="skipBackward()" title="Skip -10s">
              <span class="icon">⏪</span>
            </button>
            <button class="control-btn" (click)="skipForward()" title="Skip +10s">
              <span class="icon">⏩</span>
            </button>
            <span class="time-display">
              {{ formatTime(currentTime) }} / {{ formatTime(videoDuration) }}
            </span>
          </div>

          <!-- Right Controls -->
          <div class="controls-right">
            <button class="control-btn" (click)="toggleFullscreen()" title="Fullscreen">
              <span class="icon">⛶</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Touch Controls Overlay (Mobile) -->
      <div class="touch-controls" *ngIf="isTouchDevice && showControlsPanel">
        <div class="touch-control-section left-section" (click)="skipBackward()">
          <span class="touch-icon">⏪</span>
          <span class="touch-label">-10s</span>
        </div>
        <div class="touch-control-section center-section" (click)="togglePlayPause()">
          <span class="touch-icon play-pause">{{ isPlaying ? '⏸' : '▶' }}</span>
        </div>
        <div class="touch-control-section right-section" (click)="skipForward()">
          <span class="touch-icon">⏩</span>
          <span class="touch-label">+10s</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-player-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .video-element {
      width: 100%;
      height: 100%;
      object-fit: contain;
      cursor: pointer;
    }

    /* Double Tap Indicator */
    .double-tap-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      animation: fadeInOut 0.6s ease-out;
    }

    .skip-direction {
      display: block;
      font-size: 3rem;
      font-weight: bold;
      color: white;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      animation: popIn 0.6s ease-out;
    }

    @keyframes fadeInOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    @keyframes popIn {
      0% {
        transform: scale(0.5);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    /* Controls Wrapper */
    .controls-wrapper {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      padding: 2rem 1rem 1rem 1rem;
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .controls-wrapper.show {
      opacity: 1;
    }

    .controls-wrapper.touch-mode {
      opacity: 1;
    }

    /* Progress Bar */
    .progress-bar-container {
      position: relative;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      cursor: pointer;
      transition: height 0.2s ease;
    }

    .progress-bar-container:hover {
      height: 6px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #ff0000, #ff6b6b);
      border-radius: 2px;
      transition: width 0.1s linear;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .progress-dot {
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
      margin-right: -6px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .progress-bar-container:hover .progress-dot {
      opacity: 1;
    }

    .progress-slider {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
      opacity: 0;
      z-index: 10;
    }

    /* Controls Bottom */
    .controls-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .controls-left,
    .controls-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .control-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.5rem;
      border-radius: 4px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .control-btn:active {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(0.95);
    }

    .time-display {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.8);
      white-space: nowrap;
    }

    /* Touch Controls */
    .touch-controls {
      position: absolute;
      bottom: 60px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
    }

    .touch-control-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      flex: 1;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.2s ease;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }

    .touch-control-section:active {
      background: rgba(255, 255, 255, 0.1);
    }

    .touch-icon {
      font-size: 2.5rem;
    }

    .touch-icon.play-pause {
      font-size: 3rem;
    }

    .touch-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.8);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .controls-wrapper {
        padding: 1rem 0.75rem 0.75rem 0.75rem;
        gap: 0.5rem;
      }

      .control-btn {
        font-size: 1rem;
        padding: 0.35rem;
      }

      .time-display {
        font-size: 0.75rem;
      }

      .touch-controls {
        bottom: 50px;
        padding: 0.75rem;
        gap: 0.5rem;
      }

      .touch-icon {
        font-size: 2rem;
      }

      .touch-icon.play-pause {
        font-size: 2.5rem;
      }
    }

    @media (max-width: 480px) {
      .controls-left {
        flex: 1;
        gap: 0.25rem;
      }

      .time-display {
        font-size: 0.65rem;
      }

      .control-btn {
        font-size: 0.9rem;
        padding: 0.25rem;
      }
    }
  `]
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @Input() video!: Video;
  @Input() playlistName!: string;
  @Output() videoEnded = new EventEmitter<void>();
  @Output() videoPlaying = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  videoUrl: string = '';
  videoType: string = '';
  currentTime: number = 0;
  videoDuration: number = 0;
  progressPercent: number = 0;
  isPlaying: boolean = false;
  showControlsPanel: boolean = false;
  isTouchDevice: boolean = false;

  isDoubleTapSkip: boolean = false;
  isSkipForward: boolean = false;
  lastTapTime: number = 0;
  lastTapX: number = 0;
  lastTapY: number = 0;

  private controlsHideTimer: any;
  private timeUpdateSubject = new Subject<number>();
  private destroy$ = new Subject<void>();

  constructor(
    private videoService: VideoService,
    private firebaseService: FirebaseService,
    private cacheService: CacheService,
    private cdr: ChangeDetectorRef
  ) {
    this.isTouchDevice = this.detectTouchDevice();
  }

  ngOnInit() {
    this.setupVideo();
    this.setupTimeUpdateDebounce();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.controlsHideTimer) {
      clearTimeout(this.controlsHideTimer);
    }
  }

  private detectTouchDevice(): boolean {
    return (
      (typeof window !== 'undefined' && ('ontouchstart' in window)) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
    );
  }

  private setupVideo() {
    const source = this.videoService.getVideoSource(this.video);
    this.videoType = source.type;
    this.videoUrl = source.src;
    this.cdr.detectChanges();
  }

  private setupTimeUpdateDebounce() {
    this.timeUpdateSubject
      .pipe(debounceTime(2000))
      .subscribe((time) => {
        this.saveWatchPosition(time);
      });
  }

  onVideoLoadedMetadata() {
    const video = this.videoElement.nativeElement;
    this.videoDuration = video.duration || 0;

    // Load saved watch position
    this.loadWatchPosition();

    // Get video duration for database
    if (!this.video.duration) {
      const formattedDuration = this.videoService.formatDuration(this.videoDuration);
      this.video.duration = formattedDuration;
    }

    this.cdr.detectChanges();
  }

  onVideoPlay() {
    this.isPlaying = true;
    this.videoPlaying.emit();
    this.cdr.detectChanges();
  }

  onVideoPause() {
    this.isPlaying = false;
    this.cdr.detectChanges();
  }

  onVideoEnded() {
    this.isPlaying = false;
    this.saveWatchPosition(0);
    this.incrementViewCount();
    this.videoEnded.emit();
    this.cdr.detectChanges();
  }

  onTimeUpdate() {
    const video = this.videoElement.nativeElement;
    this.currentTime = video.currentTime;
    this.progressPercent = (this.currentTime / this.videoDuration) * 100;
    
    // Debounce watch position save
    this.timeUpdateSubject.next(this.currentTime);
    
    this.cdr.detectChanges();
  }

  onProgressSeek(event: Event) {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    const video = this.videoElement.nativeElement;
    video.currentTime = time;
  }

  togglePlayPause() {
    const video = this.videoElement.nativeElement;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  skipForward() {
    const video = this.videoElement.nativeElement;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }

  skipBackward() {
    const video = this.videoElement.nativeElement;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  }

  toggleFullscreen() {
    const elem = this.videoElement.nativeElement.parentElement;
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  }

  showControls() {
    this.showControlsPanel = true;
    if (this.controlsHideTimer) {
      clearTimeout(this.controlsHideTimer);
    }
    if (!this.isTouchDevice) {
      this.controlsHideTimer = setTimeout(() => {
        if (this.isPlaying) {
          this.showControlsPanel = false;
          this.cdr.detectChanges();
        }
      }, 3000);
    }
  }

  hideControls() {
    if (this.isPlaying && !this.isTouchDevice) {
      this.showControlsPanel = false;
    }
  }

  onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    this.lastTapTime = Date.now();
    this.lastTapX = touch.clientX;
    this.lastTapY = touch.clientY;
    this.showControls();
  }

  onTouchEnd(event: TouchEvent) {
    const now = Date.now();
    const distance = Math.sqrt(
      Math.pow(this.lastTapX - event.changedTouches[0].clientX, 2) +
      Math.pow(this.lastTapY - event.changedTouches[0].clientY, 2)
    );

    // Double tap detection (200ms, <50px movement)
    if (now - this.lastTapTime < 300 && distance < 50) {
      const centerX = this.videoElement.nativeElement.parentElement?.offsetWidth / 2;
      const isRightSide = event.changedTouches[0].clientX > (centerX || 0);
      
      this.isSkipForward = isRightSide;
      this.isDoubleTapSkip = true;
      
      if (isRightSide) {
        this.skipForward();
      } else {
        this.skipBackward();
      }

      setTimeout(() => {
        this.isDoubleTapSkip = false;
      }, 600);
    }

    this.lastTapTime = 0;
  }

  handleDoubleTap(event: MouseEvent) {
    const video = this.videoElement.nativeElement;
    const containerWidth = video.parentElement?.offsetWidth || 0;
    const isRightSide = event.clientX > containerWidth / 2;
    
    this.isSkipForward = isRightSide;
    this.isDoubleTapSkip = true;
    
    if (isRightSide) {
      this.skipForward();
    } else {
      this.skipBackward();
    }

    setTimeout(() => {
      this.isDoubleTapSkip = false;
    }, 600);
  }

  private async loadWatchPosition() {
    try {
      const watchHistory = this.cacheService.get(`watch_${this.video.url}`);
      if (watchHistory && typeof watchHistory === 'number') {
        const video = this.videoElement.nativeElement;
        video.currentTime = watchHistory;
      }
    } catch (error) {
      console.error('Error loading watch position:', error);
    }
  }

  private async saveWatchPosition(time: number) {
    try {
      this.cacheService.set(`watch_${this.video.url}`, time, 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Save to Firebase in background
      await this.firebaseService.updateVideoWatchPosition(
        this.playlistName,
        this.video.url,
        time
      );
    } catch (error) {
      console.error('Error saving watch position:', error);
    }
  }

  private async incrementViewCount() {
    try {
      await this.firebaseService.updateVideoViews(this.playlistName, this.video.url, 1);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
