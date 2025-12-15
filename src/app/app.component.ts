import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="app-wrapper">
      <!-- Navbar -->
      <nav class="navbar">
        <div class="navbar-container">
          <div class="navbar-brand">
            <h1>📺 Archive Player</h1>
          </div>
          
          <div class="navbar-menu">
            <!-- Home Link -->
            <a routerLink="/home" class="nav-link">
              <span>🏠 Home</span>
            </a>

            <!-- Studio Link (only for admin) -->
            <a *ngIf="isAdmin$ | async" routerLink="/studio" class="nav-link studio-link">
              <span>🎬 Studio</span>
            </a>

            <!-- User Section -->
            <div class="navbar-user">
              <span *ngIf="(isLoggedIn$ | async)" class="user-welcome">
                👋 Welcome
              </span>
              <button 
                *ngIf="(isLoggedIn$ | async)" 
                (click)="logout()"
                class="logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="footer">
        <p>&copy; 2025 Archive Player. All rights reserved.</p>
      </footer>
    </div>
  `,
  styles: [`
    .app-wrapper {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #0f0f0f;
      color: #fff;
    }

    .navbar {
      background: #212121;
      border-bottom: 1px solid #333;
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .navbar-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-brand h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .navbar-menu {
      display: flex;
      gap: 30px;
      align-items: center;
    }

    .nav-link {
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      padding: 8px 12px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .studio-link {
      background: #065fd4;
      padding: 8px 16px;
    }

    .studio-link:hover {
      background: #0544a8;
    }

    .navbar-user {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-welcome {
      font-size: 14px;
      color: #aaa;
    }

    .logout-btn {
      background: #ff4444;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .logout-btn:hover {
      background: #cc0000;
    }

    .main-content {
      flex: 1;
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .footer {
      background: #212121;
      border-top: 1px solid #333;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .navbar-container {
        flex-direction: column;
        gap: 12px;
      }

      .navbar-menu {
        width: 100%;
        justify-content: center;
        gap: 15px;
      }

      .main-content {
        padding: 12px;
      }
    }
  `]
})
export class AppComponent {
  isLoggedIn$ = this.firebaseService.isLoggedIn$;
  isAdmin$ = this.firebaseService.isAdmin$;

  constructor(private firebaseService: FirebaseService) {}

  logout(): void {
    this.firebaseService.logout();
  }
}