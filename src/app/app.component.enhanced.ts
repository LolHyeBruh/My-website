import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { FirebaseService } from './services/firebase.service.enhanced';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="app-wrapper">
      <!-- Navigation Header -->
      <nav class="navbar" *ngIf="isLoggedIn">
        <div class="navbar-content">
          <div class="navbar-left">
            <a href="/home" class="logo">
              <span class="logo-icon">🎬</span>
              <span class="logo-text">Archive</span>
            </a>
          </div>

          <div class="navbar-center">
            <a 
              routerLink="/home" 
              routerLinkActive="active"
              class="nav-link"
            >
              🏠 Home
            </a>
            <a 
              routerLink="/studio" 
              routerLinkActive="active"
              class="nav-link"
              *ngIf="isAdmin"
            >
              📺 Studio
            </a>
          </div>

          <div class="navbar-right">
            <div class="user-menu">
              <span class="user-avatar" [title]="currentUser?.displayName || 'User'">
                {{ getInitials() }}
              </span>
              <span class="user-name">{{ currentUser?.displayName || 'User' }}</span>
              <button (click)="logout()" class="btn-logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content" [class.with-navbar]="isLoggedIn">
        <router-outlet></router-outlet>
      </main>

      <!-- Background Animation -->
      <div class="background-blur"></div>
    </div>
  `,
  styles: [`
    .app-wrapper {
      width: 100%;
      min-height: 100vh;
      position: relative;
    }

    .background-blur {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(30, 60, 114, 0.1) 0%, rgba(42, 82, 152, 0.1) 100%);
      pointer-events: none;
      z-index: -1;
    }

    /* Navbar */
    .navbar {
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 0;
    }

    .navbar-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      gap: 2rem;
    }

    .navbar-left {
      flex: 0 0 auto;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
      transition: all 0.2s ease;
    }

    .logo:hover {
      opacity: 0.8;
      transform: scale(1.05);
    }

    .logo-icon {
      font-size: 1.5rem;
    }

    .logo-text {
      background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .navbar-center {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 0;
    }

    .nav-link {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      padding: 0.5rem 1.5rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-weight: 500;
      white-space: nowrap;
      font-size: 0.95rem;
    }

    .nav-link:hover {
      color: white;
      background: rgba(100, 200, 255, 0.1);
    }

    .nav-link.active {
      color: white;
      background: rgba(66, 165, 245, 0.2);
      border-bottom: 2px solid #42a5f5;
    }

    .navbar-right {
      flex: 0 0 auto;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-left: 1rem;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .user-name {
      color: white;
      font-weight: 500;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-logout {
      background: rgba(255, 68, 68, 0.2);
      color: #ff6b6b;
      border: 1px solid rgba(255, 68, 68, 0.5);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-logout:hover {
      background: rgba(255, 68, 68, 0.3);
      border-color: rgba(255, 68, 68, 0.8);
    }

    .btn-logout:active {
      transform: scale(0.98);
    }

    /* Main Content */
    .main-content {
      min-height: 100vh;
    }

    .main-content.with-navbar {
      min-height: calc(100vh - 64px);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .navbar-content {
        padding: 0.5rem 1rem;
      }

      .logo-text {
        display: none;
      }

      .user-name {
        display: none;
      }

      .navbar-center {
        flex: 0;
      }

      .nav-link {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
      }
    }

    @media (max-width: 768px) {
      .navbar-content {
        height: 56px;
        padding: 0.5rem 0.75rem;
        gap: 0.5rem;
      }

      .navbar-center {
        display: none;
      }

      .user-menu {
        gap: 0.5rem;
        padding-left: 0.5rem;
      }

      .btn-logout {
        padding: 0.35rem 0.75rem;
        font-size: 0.8rem;
      }

      .main-content.with-navbar {
        min-height: calc(100vh - 56px);
      }
    }

    @media (max-width: 480px) {
      .navbar-content {
        height: 48px;
      }

      .logo-icon {
        font-size: 1.25rem;
      }

      .btn-logout {
        display: none;
      }

      .main-content.with-navbar {
        min-height: calc(100vh - 48px);
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isAdmin = false;
  currentUser: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.firebaseService.isLoggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      });

    this.firebaseService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => {
        this.isAdmin = isAdmin;
      });

    this.firebaseService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    const name = this.currentUser.displayName || this.currentUser.email || '';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  async logout() {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await this.firebaseService.logout();
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  }
}
