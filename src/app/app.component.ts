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
      <!-- Mobile Header -->
      <header class="mobile-header" *ngIf="isMobile">
        <div class="header-top">
          <button (click)="toggleMobileMenu()" class="menu-toggle">
            ☰
          </button>
          <h1 class="logo">📺 Archive</h1>
          <div class="spacer"></div>
        </div>

        <!-- Mobile Navigation Drawer -->
        <nav class="mobile-menu" *ngIf="showMobileMenu">
          <a routerLink="/home" (click)="closeMobileMenu()" class="nav-item">
            <span>🏠</span>
            <span>Home</span>
          </a>
          <a *ngIf="(isAdmin$ | async)" routerLink="/studio" (click)="closeMobileMenu()" class="nav-item studio-link">
            <span>🎬</span>
            <span>Studio</span>
          </a>
          <button *ngIf="(isLoggedIn$ | async)" (click)="logout(); closeMobileMenu()" class="nav-item logout-item">
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </nav>
      </header>

      <!-- Desktop Header -->
      <nav class="desktop-navbar" *ngIf="!isMobile">
        <div class="navbar-container">
          <div class="navbar-brand">
            <h1>📺 Archive Player</h1>
          </div>
          
          <div class="navbar-menu">
            <a routerLink="/home" class="nav-link">
              <span>🏠 Home</span>
            </a>

            <a *ngIf="(isAdmin$ | async)" routerLink="/studio" class="nav-link studio-link">
              <span>🎬 Studio</span>
            </a>

            <div class="navbar-user">
              <span *ngIf="(isLoggedIn$ | async)" class="user-welcome">
                👋 Welcome
              </span>
              <button 
                *ngIf="(isLoggedIn$ | async)" 
                (click)="logout()"
                class="logout-btn"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Mobile Bottom Navigation (only on home/studio when logged in) -->
      <nav class="mobile-bottom-nav" *ngIf="isMobile && (isLoggedIn$ | async)">
        <a routerLink="/home" routerLinkActive="active" class="bottom-nav-item">
          <span class="icon">🏠</span>
          <span class="label">Home</span>
        </a>
        <a *ngIf="(isAdmin$ | async)" routerLink="/studio" routerLinkActive="active" class="bottom-nav-item">
          <span class="icon">🎬</span>
          <span class="label">Studio</span>
        </a>
        <button (click)="logout()" class="bottom-nav-item">
          <span class="icon">🚪</span>
          <span class="label">Logout</span>
        </button>
      </nav>
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

    /* ===== DESKTOP NAVBAR ===== */
    .desktop-navbar {
      background: #212121;
      border-bottom: 1px solid #333;
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .navbar-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
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

    /* ===== MOBILE HEADER ===== */
    .mobile-header {
      background: #212121;
      border-bottom: 1px solid #333;
      padding: 12px 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .menu-toggle {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      padding: 4px 8px;
      flex-shrink: 0;
    }

    .logo {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      flex: 1;
    }

    .spacer {
      width: 40px;
    }

    /* Mobile Menu */
    .mobile-menu {
      background: #1a1a1a;
      border-top: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 12px;
      border-radius: 8px;
      overflow: hidden;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #333;
      color: #fff;
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .nav-item:last-child {
      border-bottom: none;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .nav-item span:first-child {
      font-size: 18px;
      min-width: 24px;
    }

    .studio-link {
      background: rgba(6, 95, 212, 0.2);
    }

    .logout-item {
      color: #ff4444;
    }

    /* ===== MAIN CONTENT ===== */
    .main-content {
      flex: 1;
      width: 100%;
      overflow-y: auto;
      padding-bottom: 80px;
    }

    /* ===== MOBILE BOTTOM NAV ===== */
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #212121;
      border-top: 1px solid #333;
      display: flex;
      justify-content: space-around;
      gap: 0;
      z-index: 99;
      height: 60px;
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      flex: 1;
      color: #aaa;
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: color 0.2s;
    }

    .bottom-nav-item:hover,
    .bottom-nav-item.active {
      color: #065fd4;
    }

    .bottom-nav-item .icon {
      font-size: 20px;
    }

    .bottom-nav-item .label {
      font-size: 10px;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .navbar-container {
        padding: 8px 12px;
      }

      .navbar-brand h1 {
        font-size: 16px;
      }

      .navbar-menu {
        gap: 15px;
      }

      .nav-link {
        font-size: 12px;
        padding: 6px 10px;
      }

      .main-content {
        padding-bottom: 100px;
      }
    }

    /* Hide desktop on mobile */
    @media (max-width: 640px) {
      .desktop-navbar {
        display: none;
      }
    }

    /* Hide mobile on desktop */
    @media (min-width: 641px) {
      .mobile-header {
        display: none;
      }

      .mobile-bottom-nav {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  isLoggedIn$ = this.firebaseService.isLoggedIn$;
  isAdmin$ = this.firebaseService.isAdmin$;
  
  showMobileMenu = false;
  isMobile = false;

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
  }

  checkMobileView(): void {
    this.isMobile = window.innerWidth <= 640;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
  }

  logout(): void {
    this.firebaseService.logout();
    this.closeMobileMenu();
  }
}