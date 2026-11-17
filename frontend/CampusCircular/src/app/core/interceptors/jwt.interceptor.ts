import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

export const ACCESS_TOKEN_STORAGE_KEY = 'cc_access_token';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId) || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const token = globalThis.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
