import { Component, input, output, signal, HostListener, ElementRef, inject, computed } from '@angular/core';

export interface AdminSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-admin-select',
  standalone: true,
  imports: [],
  templateUrl: './admin-select.component.html',
  styleUrl: './admin-select.component.css',
})
export class AdminSelectComponent {
  options = input.required<AdminSelectOption[]>();
  value = input<string>('');
  placeholder = input('الكل');
  icon = input<'role' | 'status' | 'default'>('default');

  valueChange = output<string>();

  open = signal(false);
  private elRef = inject(ElementRef);

  selectedOption = computed(() =>
    this.options().find((o) => o.value === this.value()) ?? null
  );

  toggle(): void {
    this.open.update((v) => !v);
  }

  select(val: string): void {
    this.valueChange.emit(val);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
