import { Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-step-verification',
  standalone: true,
  imports: [],
  templateUrl: './step-verification.component.html',
  styleUrl: './step-verification.component.css'
})
export class StepVerificationComponent {
  form = input.required<FormGroup>();
}
