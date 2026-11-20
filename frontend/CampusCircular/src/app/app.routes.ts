import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayout } from './layouts/main-layout/main-layout';
import { ExchangesPage } from './pages/exchanges/exchanges';
import { HomePage } from './pages/home/home';
import { ImpactPage } from './pages/impact/impact';
import { LoginPage } from './pages/login/login';
import { MaterialDetailPage } from './pages/material-detail/material-detail';
import { PublishPage } from './pages/publish/publish';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', canActivate: [guestGuard], component: LoginPage },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: HomePage },
      { path: 'material/:id', component: MaterialDetailPage },
      { path: 'publicar', component: PublishPage },
      { path: 'intercambios', component: ExchangesPage },
      { path: 'mis-intercambios', component: ExchangesPage },
      { path: 'impacto', component: ImpactPage },
    ],
  },
  {
    path: 'admin/reportes',
    canActivate: [authGuard, roleGuard],
    loadComponent: () => import('./pages/admin/admin').then((module) => module.AdminPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    loadComponent: () => import('./pages/admin/admin').then((module) => module.AdminPage),
  },
  { path: '**', redirectTo: 'login' },
];
