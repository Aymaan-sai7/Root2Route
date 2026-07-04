import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleTimeoutService } from './core/services/timeout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'sanaye3i';

  // مجرد حقن الـ service كفاية عشان يبدأ يراقب النشاط تلقائيًا —
  // مش محتاجين نستخدمه في حاجة تانية هنا
  private idleTimeout = inject(IdleTimeoutService);
}
