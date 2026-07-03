import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

interface TradeOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-step-pro-details',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-pro-details.component.html',
  styleUrl: './step-pro-details.component.css'
})
export class StepProDetailsComponent {
  form = input.required<FormGroup>();

  trades: TradeOption[] = [
    { value: 'electrical', label: 'كهربا' },
    { value: 'plumbing', label: 'سباكة' },
    { value: 'carpentry', label: 'نجارة' },
    { value: 'painting', label: 'نقاشة' },
    { value: 'ac', label: 'تكييف وتبريد' },
    { value: 'other', label: 'تخصص تاني' },
  ];
}
