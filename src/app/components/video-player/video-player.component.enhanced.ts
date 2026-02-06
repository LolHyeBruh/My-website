import { Component, Input, Output, ViewChild, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service.enhanced';
import { Video } from '../../models/video.model';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-player-container">
      <video 
        #videoPlayer
        [src]="video?.url" 
        controls
        (ended)="onVideoEnded()"
        (fullscreenchange)="onFullscreenChange()"
        class="video-player"
      ></video>
      <button 
        (click)="toggleFullscreen()"
        class="fullscreen-btn"
        *ngIf="video"
      >
        ⛶ Fullscreen
      </button>
    </div>
  `,
  styles: [`
    .video-player-container {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    }

    .video-player {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .fullscreen-btn {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      z-index: 10;
    }

    .fullscreen-btn:hover {
      background: rgba(0, 0, 0, 0.9);
    }
  `]
})
export class VideoPlayerComponent {
  @Input() video: Video | null = null;
  @Input() playlistName: string = '';
  @Output() onVideoEnd = new EventEmitter<void>();
  
  @ViewChild('videoPlayer') videoPlayer: ElementRef<HTMLVideoElement> | null = null;

  constructor(private firebaseService: FirebaseService) {}

  onVideoEnded(): void {
    if (this.playlistName && this.video) {
      this.firebaseService.updateVideoViews(this.playlistName, this.video.url);
    }
    this.onVideoEnd.emit();
  }

  toggleFullscreen(): void {
    if (!this.videoPlayer) return;
    const element = this.videoPlayer.nativeElement;
    
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  onFullscreenChange(): void {
    if (this.videoPlayer?.nativeElement) {
      const element = this.videoPlayer.nativeElement;
      if (document.fullscreenElement === element) {
        console.log('Entered fullscreen');
      } else {
        console.log('Exited fullscreen');
      }
    }
  }
}