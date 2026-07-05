import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pending-review',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pending-review.component.html',
})
export class PendingReviewComponent {}
