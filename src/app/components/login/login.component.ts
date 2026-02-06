import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service.enhanced';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="logo">🎬</div>
        <h1>Video Archive</h1>
        <p>Your personal YouTube-like platform</p>

        <button 
          (click)="loginWithGoogle()"
          [disabled]="isLoading"
          class="btn-google"
        >
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <div *ngIf="isLoading" class="loading">
          <div class="spinner"></div>
          <p>Signing you in...</p>
        </div>

        <div *ngIf="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="footer">
          <p>🔒 Secure login with your Google account</p>
          <p>No account creation needed</p>
        </div>
      </div>

      <div class="background-animation">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
      overflow: hidden;
    }

    .background-animation {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: 0;
    }

    .blob {
      position: absolute;
      border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
      opacity: 0.1;
      animation: blobAnimation 7s infinite;
    }

    .blob-1 {
      width: 300px;
      height: 300px;
      background: white;
      top: -100px;
      left: -100px;
      animation-delay: 0s;
    }

    .blob-2 {
      width: 200px;
      height: 200px;
      background: white;
      bottom: -50px;
      right: 50px;
      animation-delay: 2s;
    }

    .blob-3 {
      width: 250px;
      height: 250px;
      background: white;
      top: 50%;
      right: -100px;
      animation-delay: 4s;
    }

    @keyframes blobAnimation {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(30px, 30px) rotate(180deg); }
    }

    .login-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 3rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      position: relative;
      z-index: 10;
      backdrop-filter: blur(10px);
    }

    .logo {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .login-card h1 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 2rem;
    }

    .login-card > p {
      margin: 0 0 2rem 0;
      color: #666;
      font-size: 1rem;
    }

    .btn-google {
      width: 100%;
      padding: 1rem;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      transition: all 0.3s ease;
      color: #333;
    }

    .btn-google:hover:not(:disabled) {
      border-color: #667eea;
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
      transform: translateY(-2px);
    }

    .btn-google:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-google:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-icon {
      width: 24px;
      height: 24px;
    }

    .loading {
      margin-top: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading p {
      color: #667eea;
      font-weight: 600;
    }

    .error-message {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #ffebee;
      border: 1px solid #f48fb1;
      border-radius: 8px;
      color: #c2185b;
      font-size: 0.95rem;
    }

    .footer {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
    }

    .footer p {
      margin: 0.5rem 0;
      color: #999;
      font-size: 0.85rem;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 2rem;
        margin: 1rem;
      }

      .login-card h1 {
        font-size: 1.5rem;
      }

      .logo {
        font-size: 3rem;
      }

      .btn-google {
        padding: 0.75rem;
        font-size: 0.95rem;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit() {
    // Redirect if already logged in
    this.firebaseService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.router.navigate(['/home']);
      }
    });
  }

  async loginWithGoogle() {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      await this.firebaseService.loginWithGoogle();
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = error?.message || 'Failed to sign in. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
