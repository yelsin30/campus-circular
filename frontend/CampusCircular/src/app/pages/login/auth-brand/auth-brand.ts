import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-brand',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-brand.html',
  styleUrl: './auth-brand.scss',
})
export class AuthBrand {}