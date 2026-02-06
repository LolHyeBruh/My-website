import { Routes, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from './services/firebase.service';
import { firstValueFrom } from 'rxjs';

import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { StudioComponent } from './components/studio/studio.component';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const firebaseService = inject(FirebaseService);
  const router = inject(Router);

  try {
    const isLoggedIn = await firstValueFrom(firebaseService.isLoggedIn$);
    if (!isLoggedIn) {
      router.navigate(['/login']);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Auth guard error:', error);
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Admin Guard - Protects routes that require admin privileges
 */
export const adminGuard: CanActivateFn = async (route, state) => {
  const firebaseService = inject(FirebaseService);
  const router = inject(Router);

  try {
    const isAdmin = await firstValueFrom(firebaseService.isAdmin$);
    const isLoggedIn = await firstValueFrom(firebaseService.isLoggedIn$);

    if (!isLoggedIn) {
      router.navigate(['/login']);
      return false;
    }

    if (!isAdmin) {
      console.warn('Access denied: User is not an admin');
      router.navigate(['/home']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Admin guard error:', error);
    router.navigate(['/home']);
    return false;
  }
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
    data: { title: 'Home' }
  },
  {
    path: 'studio',
    component: StudioComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Studio' }
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
