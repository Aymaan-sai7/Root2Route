import { Component, input, computed, signal, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminSelectComponent, AdminSelectOption } from '../../../../../shared/components/admin-select/admin-select.component';
import { getSkillsForTrade } from '../../../../../core/constant/skills';

@Component({
  selector: 'app-step-pro-details',
  standalone: true,
  imports: [ReactiveFormsModule, AdminSelectComponent],
  templateUrl: './step-pro-details.component.html',
  styleUrl: './step-pro-details.component.css'
})
export class StepProDetailsComponent implements OnInit {
  form = input.required<FormGroup>();

  trades: AdminSelectOption[] = [
    { value: 'electrical', label: 'كهربا' },
    { value: 'plumbing', label: 'سباكة' },
    { value: 'carpentry', label: 'نجارة' },
    { value: 'painting', label: 'نقاشة' },
    { value: 'ac', label: 'تكييف وتبريد' },
    { value: 'other', label: 'تخصص تاني / مش موجود' },
  ];

  //  الفيكس: signal عادي بنحدّثه يدويًا بدل toSignal في تعريف الحقل
  // (لأن form() مش متاحة وقت field initializers، لازم نستناها لحد ngOnInit)
  private tradeValue = signal<string>('');

  isOtherTrade = computed(() => this.tradeValue() === 'other');

  //  جديد: قايمة المهارات المتاحة تتغيّر تلقائيًا حسب التخصص المختار.
  // لو "أخرى"، مفيش قايمة محددة (مالهاش معنى) فبنسيب availableSkills فاضية
  // والسكشن بيتخفي في الـ HTML أصلاً
  availableSkills = computed<string[]>(() =>
    this.isOtherTrade() ? [] : getSkillsForTrade(this.tradeValue())
  );

  private selectedSkills = signal<string[]>([]);

  ngOnInit(): void {
    const control = this.form().get('trade');
    this.tradeValue.set(control?.value ?? '');
    control?.valueChanges.subscribe((val) => this.tradeValue.set(val));

    const skillsControl = this.form().get('skills');
    this.selectedSkills.set(skillsControl?.value ?? []);
    skillsControl?.valueChanges.subscribe((val) => this.selectedSkills.set(val ?? []));
  }

  onTradeChange(val: string): void {
    const control = this.form().get('trade');
    control?.setValue(val);
    control?.markAsTouched();
  }

  isSkillSelected(skill: string): boolean {
    return this.selectedSkills().includes(skill);
  }

  toggleSkill(skill: string): void {
    const current = this.selectedSkills();
    const updated = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    this.form().get('skills')?.setValue(updated);
  }
}
