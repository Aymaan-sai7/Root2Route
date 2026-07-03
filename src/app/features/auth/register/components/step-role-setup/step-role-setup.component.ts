import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-step-role-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-role-setup.component.html',
  styleUrl: './step-role-setup.component.css'
})
export class StepRoleSetupComponent {
  form = input.required<FormGroup>();
}
