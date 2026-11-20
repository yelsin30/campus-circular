import { afterNextRender, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../data/auth.service';
import { Navbar } from '../../shared/navbar/navbar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [Navbar, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    afterNextRender(() => {
      if (!this.auth.hasValidSession()) {
        void this.router.navigateByUrl('/login');
      }
    });
  }
}
