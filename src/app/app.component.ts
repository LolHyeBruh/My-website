import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { PlaylistSidebarComponent } from './components/playlist-sidebar/playlist-sidebar.component';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VideoPlayerComponent,
    PlaylistSidebarComponent
  ],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>Archive Player</h1>
        <button
          id="login-btn"
          class="login-btn"
          (click)="loginAsAdmin()"
          [style.display]="isAdmin ? 'none' : 'inline-block'">
          Login as Admin
        </button>
      </header>

      <main class="main-content">
        <app-playlist-sidebar
          [isAdmin]="isAdmin"
          (videoSelected)="onVideoSelected($event)">
        </app-playlist-sidebar>

        <app-video-player
          [selectedVideo]="selectedVideo"
          [isAdmin]="isAdmin">
        </app-video-player>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      background: #222;
      color: #fff;
      overflow: hidden;
    }

    .app-header {
      background: #111;
      padding: 12px 16px;
      border-bottom: 1px solid #444;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .app-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: bold;
    }

    .login-btn {
      padding: 8px 16px;
      background: #e53935;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .login-btn:hover {
      background: #b71c1c;
    }

    .main-content {
      display: flex;
      flex: 1;
      width: 100%;
      overflow: hidden;
      gap: 0;
    }

    @media (max-width: 1024px) {
      .main-content {
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  isAdmin = false;
  selectedVideo: any = null;

  constructor(
    private firebaseService: FirebaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.firebaseService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
      this.cdr.markForCheck();
    });
  }

  async loginAsAdmin(): Promise<void> {
    try {
      await this.firebaseService.loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  onVideoSelected(video: any): void {
    this.selectedVideo = video;
  }
}