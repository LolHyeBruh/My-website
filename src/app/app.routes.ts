import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'studio',
    loadComponent: () =>
      import('./pages/studio/studio.component').then((m) => m.StudioComponent),
  },
  { path: '**', redirectTo: '' },
];