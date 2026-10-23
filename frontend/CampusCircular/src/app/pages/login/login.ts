import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthBrand } from './auth-brand/auth-brand';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [AuthBrand],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  readonly demoCode = '482931';
  readonly otpDigits = ['', '', '', '', '', ''];

  email = '';
  codeSent = false;
  emailError = '';
  otpError = '';
  statusMessage = '';

  constructor(private readonly router: Router) {}

  get institutionalEmailIsValid(): boolean {
    return /^[a-zA-Z0-9._%+-]+@upn\.pe$/i.test(this.email.trim());
  }

  sendVerificationCode(): void {
    this.emailError = '';
    this.otpError = '';
    this.statusMessage = '';

    if (!this.institutionalEmailIsValid) {
      this.emailError = 'Ingresa un correo institucional válido terminado en @upn.pe.';
      return;
    }

    this.email = this.email.trim();
    this.codeSent = true;
    this.statusMessage = `Código de prueba listo para ${this.email}. No se envió ningún correo.`;
  }

  updateOtpDigit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.otpDigits[index] = digit;
    input.value = digit;
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
    inputs?.forEach((input, index) => input.value = this.otpDigits[index]);
    inputs?.[Math.min(pasted.length, 5)]?.focus();
    this.otpError = '';
  }

  verifyCode(): void {
    if (!this.codeSent) {
      this.otpError = 'Primero solicita tu código de verificación.';
      return;
    }

    if (this.otpDigits.join('') !== this.demoCode) {
      this.otpError = 'El código no coincide. Revisa los 6 dígitos de prueba.';
      return;
    }

    void this.router.navigateByUrl('/inicio');
  }
}