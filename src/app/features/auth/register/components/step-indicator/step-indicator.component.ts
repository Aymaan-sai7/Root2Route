import { Component, input, computed } from '@angular/core';

export interface RegisterStep {
  number: number;
  label: string;
}

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [],
  templateUrl: './step-indicator.component.html',
  styleUrl: './step-indicator.component.css'
})
export class StepIndicatorComponent {
  currentStep = input.required<number>();
  totalSteps = input<number>(3);

  steps = computed<RegisterStep[]>(() => {
    const baseSteps: RegisterStep[] = [
      { number: 1, label: 'بيانات الحساب' },
      { number: 2, label: 'نوع الحساب' },
    ];

    if (this.totalSteps() === 5) {
      baseSteps.push({ number: 3, label: 'تفاصيل المهنة' });
      baseSteps.push({ number: 4, label: 'توثيق الهوية' });
      baseSteps.push({ number: 5, label: 'التأكيد' });
    } else {
      baseSteps.push({ number: 3, label: 'التأكيد' });
    }

    return baseSteps;
  });
}
