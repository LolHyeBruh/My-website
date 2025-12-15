import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
      <!-- Login screen if NOT logged in -->
      <div class="login-screen" *ngIf="!(isLoggedIn$ | async)">
        <div class="login-panel">
          <h1>Archive Player</h1>
          <p>Please log in to access your videos</p>
          <button (click)="loginWithGoogle()" class="login-btn">
            Login as Admin
          </button>
        </div>
      </div>

      <!-- Content if logged in -->
      <div class="main-content" *ngIf="isLoggedIn$ | async">
        <div class="sidebar">
          <app-playlist-sidebar></app-playlist-sidebar>
        </div>
        
        <div class="player">
          <app-video-player></app-video-player>
        </div>

        <button (click)="logout()" class="logout-btn">Logout</button>
      </div>
    </div>
  `,
  styles: [`
    .app-container { width: 100%; height: 100vh; display: flex; }
    .login-screen { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .login-panel { background: white; padding: 40px; border-radius: 10px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .login-panel h1 { margin: 0 0 20px 0; color: #333; }
    .login-panel p { margin: 0 0 30px 0; color: #666; font-size: 16px; }
    .login-btn { background: #667eea; color: white; border: none; padding: 12px 30px; font-size: 16px; border-radius: 5px; cursor: pointer; }
    .login-btn:hover { background: #764ba2; }
    .main-content { width: 100%; height: 100%; display: flex; gap: 20px; padding: 20px; background: #f5f5f5; position: relative; }
    .sidebar { flex: 0 0 300px; background: white; border-radius: 8px; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .player { flex: 1; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .logout-btn { position: absolute; top: 20px; right: 20px; background: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    .logout-btn:hover { background: #ff5252; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'archive-player';
  
  isLoggedIn$ = this.firebaseService.isLoggedIn$;
  
  constructor(
    private firebaseService: FirebaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Auth is already initialized in FirebaseService
  }

  loginWithGoogle(): void {
    this.firebaseService.loginWithGoogle();
  }

  logout(): void {
    this.firebaseService.getAuth().signOut();
  }
}
