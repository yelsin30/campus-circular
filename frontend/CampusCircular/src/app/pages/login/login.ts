import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../data/auth.service';
import { AuthBrand } from './auth-brand/auth-brand';

export type AuthMode = 'login' | 'register';

const UPN_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@upn\.pe$/i;

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

  mode: AuthMode = 'register';
  readonly otpDigits = ['', '', '', '', '', ''];

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

  codeSent = false;
  loading = false;
  emailError = '';
  formError = '';
  otpError = '';
  statusMessage = '';

  get institutionalEmailIsValid(): boolean {
    const emailControl = this.mode === 'register'
      ? this.registerForm.controls.email
      : this.loginForm.controls.email;
    return UPN_EMAIL_REGEX.test(emailControl.value.trim());
  }

  switchMode(nextMode: AuthMode): void {
    this.mode = nextMode;
    this.emailError = '';
    this.formError = '';
    this.otpError = '';
    this.statusMessage = '';
  }

  submitRegister(): void {
    this.emailError = '';
    this.formError = '';
    this.otpError = '';
    this.statusMessage = '';
    this.registerForm.markAllAsTouched();

    if (this.registerForm.controls.email.invalid) {
      this.emailError = 'Ingresa un correo institucional válido terminado en @upn.pe.';
    }

    if (this.registerForm.invalid) {
      if (!this.emailError) {
        this.formError = 'Completa todos los campos obligatorios (contraseña mínimo 8 caracteres).';
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

    this.loading = true;
    this.authService.register(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.codeSent = true;
        this.statusMessage = res.message || `Token de verificación enviado a ${res.email}. Revisa tu bandeja (MailHog).`;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.formError = this.resolveHttpError(err, 'register');
      },
    });
  }

  submitLogin(): void {
    this.emailError = '';
    this.formError = '';
    this.otpError = '';
    this.statusMessage = '';
    this.loginForm.markAllAsTouched();

    if (this.loginForm.controls.email.invalid) {
      this.emailError = 'Ingresa un correo institucional válido terminado en @upn.pe.';
      return;
    }

    if (this.loginForm.invalid) {
      this.formError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    const raw = this.loginForm.getRawValue();
    this.loading = true;
    this.authService.login({
      email: raw.email.trim().toLowerCase(),
      password: raw.password,
    }).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/inicio');
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.formError = this.resolveHttpError(err, 'login');
      },
    });
  }

  sendVerificationCode(): void {
    if (this.mode === 'register') {
      this.submitRegister();
    } else {
      this.submitLogin();
    }
  }

  updateOtpDigit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.otpDigits[index] = digit;
    input.value = digit;
    this.syncOtpControl();
    this.otpError = '';

    if (digit) {
      input.parentElement?.querySelectorAll<HTMLInputElement>('.otp-input')[index + 1]?.focus();
    }
  }

  handleOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits[index]) {
      const previous = (event.target as HTMLInputElement).parentElement
        ?.querySelectorAll<HTMLInputElement>('.otp-input')[index - 1];
      previous?.focus();
    }
  }

  pasteOtp(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';

    for (let index = 0; index < this.otpDigits.length; index += 1) {
      this.otpDigits[index] = pasted[index] ?? '';
    }

    const inputs = (event.target as HTMLInputElement).parentElement
      ?.querySelectorAll<HTMLInputElement>('.otp-input');
    inputs?.forEach((input, index) => (input.value = this.otpDigits[index]));
    inputs?.[Math.min(pasted.length, 5)]?.focus();
    this.syncOtpControl();
    this.otpError = '';
  }

  verifyCode(): void {
    this.otpError = '';
    this.syncOtpControl();

    if (!this.codeSent) {
      this.otpError = 'Primero completa el registro para recibir tu código de verificación.';
      return;
    }

    if (this.verifyForm.invalid) {
      this.otpError = 'Ingresa los 6 dígitos numéricos del código enviado a tu correo.';
      return;
    }

    const email = this.registerForm.controls.email.value.trim().toLowerCase();
    const password = this.registerForm.controls.password.value;
    const token = this.verifyForm.controls.token.value;

    this.loading = true;
    this.authService.verifyToken({ email, token }).subscribe({
      next: (verifyRes) => {
        this.statusMessage = verifyRes.message || 'Cuenta verificada y activada exitosamente.';
        if (password && password.length >= 8) {
          this.authService.login({ email, password }).subscribe({
            next: () => {
              this.loading = false;
              void this.router.navigateByUrl('/inicio');
            },
            error: () => {
              this.loading = false;
              this.switchMode('login');
              this.loginForm.patchValue({ email });
              this.statusMessage = 'Cuenta activada. Inicia sesión con tu contraseña.';
            },
          });
        } else {
          this.loading = false;
          this.switchMode('login');
          this.loginForm.patchValue({ email });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.otpError = this.resolveHttpError(err, 'verify');
      },
    });
  }

  private syncOtpControl(): void {
    this.verifyForm.controls.token.setValue(this.otpDigits.join(''));
  }

  private resolveHttpError(err: HttpErrorResponse, action: 'register' | 'verify' | 'login'): string {
    const backendMessage = err.error?.message as string | undefined;
    if (err.status === 409) {
      return backendMessage || 'Ya existe una cuenta registrada con este correo institucional.';
    }
    if (err.status === 401) {
      return backendMessage || 'Correo institucional, contraseña o estado de cuenta inválidos.';
    }
    if (err.status === 400) {
      return backendMessage || (action === 'verify'
        ? 'El código de verificación no es válido o ha expirado.'
        : 'Datos inválidos. Verifica los campos ingresados.');
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor (http://localhost:8080). Verifica que el backend esté en ejecución.';
    }
    return backendMessage || 'Ocurrió un error inesperado al procesar la solicitud.';
  }
}
