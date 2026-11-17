import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ACCESS_TOKEN_STORAGE_KEY } from '../core/interceptors/jwt.interceptor';

export type UserStatus = 'INACTIVO' | 'ACTIVO' | 'SUSPENDIDO';
export type UserRole = 'USUARIO' | 'ADMIN' | 'ADMIN_AUDITOR';

export interface RegisterRequest {
  nombres: string;
  apellidos: string;
  codigoAlumno: string;
  email: string;
  password: string;
}

export interface RegistrationResponse {
  userId: number;
  email: string;
  estado: UserStatus;
  message: string;
}

export interface VerifyRequest {
  email: string;
  token: string;
}

export interface VerificationResponse {
  userId: number;
  email: string;
  estado: UserStatus;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUserSummary {
  id: number;
  rol: UserRole | string;
  reputacion: number | null;
  email?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUserSummary;
}

const USER_STORAGE_KEY = 'cc_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly userSignal = signal<AuthUserSummary | null>(this.readStoredUser());

  readonly accessToken = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));

  register(payload: RegisterRequest): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${this.baseUrl}/register`, payload);
  }

  verifyToken(payload: VerifyRequest): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.baseUrl}/verify`, payload);
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => {
        const enrichedUser: AuthUserSummary = {
          ...response.user,
          email: payload.email.trim().toLowerCase(),
        };
        this.persistSession(response.accessToken, enrichedUser);
      }),
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      globalThis.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      globalThis.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  private persistSession(token: string, user: AuthUserSummary): void {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    if (isPlatformBrowser(this.platformId)) {
      globalThis.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      globalThis.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }

  private readStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return globalThis.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  private readStoredUser(): AuthUserSummary | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const raw = globalThis.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUserSummary;
    } catch {
      return null;
    }
  }
}
