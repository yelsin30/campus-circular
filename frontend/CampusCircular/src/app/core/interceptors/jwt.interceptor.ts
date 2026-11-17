import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector, PLATFORM_ID } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../data/auth.service';

export const ACCESS_TOKEN_STORAGE_KEY = 'cc_access_token';
export const USER_STORAGE_KEY = 'cc_auth_user';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const injector = inject(Injector);

  const isApiRequest = req.url.startsWith(environment.apiUrl) || req.url.includes('/api/v1/');
  const isPublicAuthRoute = req.url.includes('/api/v1/auth/');

  if (!isPlatformBrowser(platformId) || !isApiRequest || isPublicAuthRoute) {
    return next(req);
  }

  const token = globalThis.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (!token) {
    return next(req);
  }

  const authenticatedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403)
      ) {
        globalThis.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        globalThis.localStorage.removeItem(USER_STORAGE_KEY);
        injector.get(AuthService, null)?.logout();
      }
      return throwError(() => error);
    }),
  );
};
