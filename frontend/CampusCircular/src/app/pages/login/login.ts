import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { AuthService } from '../../data/auth.service';
import { AuthBrand } from './auth-brand/auth-brand';

export type AuthMode = 'login' | 'register';

const UPN_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@upn\.pe$/i;
const RESEND_COOLDOWN_SECONDS = 30;

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, AuthBrand],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private cooldownTimerId: ReturnType<typeof setInterval> | null = null;

  readonly mode = signal<AuthMode>('login');
  readonly otpDigits = signal<string[]>(['', '', '', '', '', '']);
  readonly codeSent = signal(false);
  readonly isSubmitting = signal(false);
  readonly isResending = signal(false);
  readonly resendCooldown = signal(0);
  readonly emailError = signal('');
  readonly formError = signal('');
  readonly otpError = signal('');
  readonly statusMessage = signal('');

  readonly registerForm = this.fb.group({
    nombres: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
    apellidos: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
    codigoAlumno: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(UPN_EMAIL_REGEX)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(UPN_EMAIL_REGEX)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly verifyForm = this.fb.group({
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    afterNextRender(() => {
      if (this.authService.hasValidSession()) {
        void this.router.navigateByUrl('/inicio');
      }
    });

    this.destroyRef.onDestroy(() => this.clearCooldownTimer());
  }

  get institutionalEmailIsValid(): boolean {
    const emailControl =
      this.mode() === 'register'
        ? this.registerForm.controls.email
        : this.loginForm.controls.email;
    return UPN_EMAIL_REGEX.test(emailControl.value.trim());
  }

  switchMode(nextMode: AuthMode): void {
    this.mode.set(nextMode);
    this.emailError.set('');
    this.formError.set('');
    this.otpError.set('');
    this.statusMessage.set('');
  }

  submitRegister(): void {
    if (this.isSubmitting()) return;

    this.emailError.set('');
    this.formError.set('');
    this.otpError.set('');
    this.statusMessage.set('');
    this.registerForm.markAllAsTouched();

    if (this.registerForm.controls.email.invalid) {
      this.emailError.set('Ingresa un correo institucional válido terminado en @upn.pe.');
    }

    if (this.registerForm.invalid) {
      if (!this.emailError()) {
        this.formError.set(
          'Completa todos los campos obligatorios (contraseña mínimo 8 caracteres).',
        );
      }
      return;
    }

    const raw = this.registerForm.getRawValue();
    const payload = {
      nombres: raw.nombres.trim(),
      apellidos: raw.apellidos.trim(),
      codigoAlumno: raw.codigoAlumno.trim(),
      email: raw.email.trim().toLowerCase(),
      password: raw.password,
    };

    this.isSubmitting.set(true);
    this.authService
      .register(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (res) => {
          this.codeSent.set(true);
          this.otpDigits.set(['', '', '', '', '', '']);
          this.syncOtpControl();
          this.statusMessage.set(
            res.message ||
              `Código de verificación enviado a ${res.email}. Revisa tu bandeja institucional (MailHog).`,
          );
          this.startResendCooldown(RESEND_COOLDOWN_SECONDS);
        },
        error: (err: HttpErrorResponse) => {
          this.formError.set(this.resolveHttpError(err, 'register'));
        },
      });
  }

  resendVerificationCode(): void {
    if (this.isResending() || this.isSubmitting() || this.resendCooldown() > 0) return;

    this.emailError.set('');
    this.formError.set('');
    this.otpError.set('');
    this.statusMessage.set('');

    const email = this.registerForm.controls.email.value.trim().toLowerCase();
    if (!UPN_EMAIL_REGEX.test(email)) {
      this.emailError.set('Ingresa tu correo institucional @upn.pe para reenviar el código.');
      return;
    }

    this.isResending.set(true);
    this.authService
      .resendCode(email)
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: (res) => {
          this.codeSent.set(true);
          this.otpDigits.set(['', '', '', '', '', '']);
          this.syncOtpControl();
          this.statusMessage.set(
            res.message ||
              `Se envió un nuevo código OTP a ${email}. Revisa tu correo institucional.`,
          );
          this.startResendCooldown(RESEND_COOLDOWN_SECONDS);
        },
        error: (err: HttpErrorResponse) => {
          this.otpError.set(this.resolveHttpError(err, 'resend'));
        },
      });
  }

  submitLogin(): void {
    if (this.isSubmitting()) return;

    this.emailError.set('');
    this.formError.set('');
    this.otpError.set('');
    this.statusMessage.set('');
    this.loginForm.markAllAsTouched();

    if (this.loginForm.controls.email.invalid) {
      this.emailError.set('Ingresa un correo institucional válido terminado en @upn.pe.');
      return;
    }

    if (this.loginForm.invalid) {
      this.formError.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const raw = this.loginForm.getRawValue();
    this.isSubmitting.set(true);
    this.authService
      .login({
        email: raw.email.trim().toLowerCase(),
        password: raw.password,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/inicio');
        },
        error: (err: HttpErrorResponse) => {
          this.formError.set(this.resolveHttpError(err, 'login'));
        },
      });
  }

  updateOtpDigit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...this.otpDigits()];
    nextDigits[index] = digit;
    this.otpDigits.set(nextDigits);
    input.value = digit;
    this.syncOtpControl();
    this.otpError.set('');

    if (digit) {
      input.parentElement?.querySelectorAll<HTMLInputElement>('.otp-input')[index + 1]?.focus();
    }
  }

  handleOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits()[index]) {
      const previous = (event.target as HTMLInputElement).parentElement?.querySelectorAll<HTMLInputElement>(
        '.otp-input',
      )[index - 1];
      previous?.focus();
    }
  }

  pasteOtp(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    const nextDigits = this.otpDigits().map((_, index) => pasted[index] ?? '');
    this.otpDigits.set(nextDigits);

    const inputs = (event.target as HTMLInputElement).parentElement?.querySelectorAll<HTMLInputElement>(
      '.otp-input',
    );
    inputs?.forEach((input, index) => (input.value = nextDigits[index]));
    inputs?.[Math.min(pasted.length, 5)]?.focus();
    this.syncOtpControl();
    this.otpError.set('');
  }

  verifyCode(): void {
    if (this.isSubmitting()) return;

    this.otpError.set('');
    this.syncOtpControl();

    if (!this.codeSent()) {
      this.otpError.set('Primero completa el registro o solicita un código de verificación.');
      return;
    }

    if (this.verifyForm.invalid) {
      this.otpError.set('Ingresa los 6 dígitos numéricos del código enviado a tu correo.');
      return;
    }

    const email = this.registerForm.controls.email.value.trim().toLowerCase();
    const password = this.registerForm.controls.password.value;
    const token = this.verifyForm.controls.token.value;

    this.isSubmitting.set(true);
    this.authService
      .verifyToken({ email, token })
      .pipe(
        switchMap((verifyRes) => {
          this.statusMessage.set(verifyRes.message || 'Cuenta verificada y activada exitosamente.');
          if (password && password.length >= 8) {
            return this.authService.login({ email, password }).pipe(
              catchError(() => {
                this.switchMode('login');
                this.loginForm.patchValue({ email });
                this.statusMessage.set('Cuenta activada. Inicia sesión con tu contraseña.');
                return of(null);
              }),
            );
          }
          this.switchMode('login');
          this.loginForm.patchValue({ email });
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: (authRes) => {
          if (authRes) {
            void this.router.navigateByUrl('/inicio');
          }
        },
        error: (err: HttpErrorResponse) => {
          this.otpError.set(this.resolveHttpError(err, 'verify'));
        },
      });
  }

  private startResendCooldown(seconds: number): void {
    this.clearCooldownTimer();
    if (!isPlatformBrowser(this.platformId)) return;

    this.resendCooldown.set(seconds);
    this.cooldownTimerId = setInterval(() => {
      const remaining = this.resendCooldown() - 1;
      if (remaining <= 0) {
        this.resendCooldown.set(0);
        this.clearCooldownTimer();
      } else {
        this.resendCooldown.set(remaining);
      }
    }, 1000);
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimerId !== null) {
      clearInterval(this.cooldownTimerId);
      this.cooldownTimerId = null;
    }
  }

  private syncOtpControl(): void {
    this.verifyForm.controls.token.setValue(this.otpDigits().join(''));
  }

  private resolveHttpError(
    err: HttpErrorResponse,
    action: 'register' | 'verify' | 'login' | 'resend',
  ): string {
    const backendMessage = err.error?.message as string | undefined;
    if (err.status === 409) {
      if (action === 'resend') {
        return backendMessage || 'Tu cuenta ya está verificada. Puedes iniciar sesión.';
      }
      return backendMessage || 'Ya existe una cuenta registrada con este correo institucional.';
    }
    if (err.status === 404) {
      return backendMessage || 'No encontramos una cuenta registrada con ese correo institucional.';
    }
    if (err.status === 401) {
      return backendMessage || 'Correo institucional, contraseña o estado de cuenta inválidos.';
    }
    if (err.status === 400) {
      return (
        backendMessage ||
        (action === 'verify'
          ? 'El código de verificación no es válido o ha expirado.'
          : 'Datos inválidos. Verifica los campos ingresados.')
      );
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor (http://localhost:8080). Verifica que el backend esté en ejecución.';
    }
    return backendMessage || 'Ocurrió un error inesperado al procesar la solicitud.';
  }
}
