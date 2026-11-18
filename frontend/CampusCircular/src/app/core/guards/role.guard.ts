import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../data/auth.service';

export const roleGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  const role = (user?.rol ?? '').toUpperCase();

  if (auth.isAuthenticated() && (role === 'ADMIN' || role === 'ADMIN_AUDITOR')) {
    return true;
  }

  return router.createUrlTree([auth.isAuthenticated() ? '/inicio' : '/login']);
};
