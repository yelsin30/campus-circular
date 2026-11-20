import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../data/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get isAdmin(): boolean {
    const role = (this.auth.currentUser()?.rol ?? '').toUpperCase();
    return role === 'ADMIN' || role === 'ADMIN_AUDITOR';
  }

  get userDisplay(): string {
    const user = this.auth.currentUser();
    if (user?.email) return user.email.split('@')[0];
    if (user?.id !== undefined) return `Usuario #${user.id}`;
    return 'Iniciar sesión';
  }

  get userInitials(): string {
    const user = this.auth.currentUser();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'UP';
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
