import { Component, input, computed } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminSelectComponent, AdminSelectOption } from '../../../../../shared/components/admin-select/admin-select.component';
// ⚠️ عدّل عدد الـ ../ لو مسار register مختلف عندك بالنسبة لـ shared/admin-select

@Component({
  selector: 'app-step-pro-details',
  standalone: true,
  imports: [ReactiveFormsModule, AdminSelectComponent],
  templateUrl: './step-pro-details.component.html',
  styleUrl: './step-pro-details.component.css'
})
export class StepProDetailsComponent {
  form = input.required<FormGroup>();

  trades: AdminSelectOption[] = [
    { value: 'electrical', label: 'كهربا' },
    { value: 'plumbing', label: 'سباكة' },
    { value: 'carpentry', label: 'نجارة' },
    { value: 'painting', label: 'نقاشة' },
    { value: 'ac', label: 'تكييف وتبريد' },
    { value: 'other', label: 'تخصص تاني / مش موجود' },
  ];

  // ⚠️ جديد: يظهر حقل كتابة التخصص لو اختار "other"
  isOtherTrade = computed(() => this.form().get('trade')?.value === 'other');

  onTradeChange(val: string): void {
    const control = this.form().get('trade');
    control?.setValue(val);
    control?.markAsTouched();
  }
}
