import { Component, EventEmitter, Input, Output } from '@angular/core';

interface CategoryOption {
  label: string;
  icon: string;
}

@Component({
  selector: 'app-category-nav',
  standalone: true,
  templateUrl: './category-nav.html',
  styleUrl: './category-nav.scss',
})
export class CategoryNav {
  @Input() categories: CategoryOption[] = [];
  @Input() selectedCategory = 'Todos';
  @Output() categorySelected = new EventEmitter<string>();
}