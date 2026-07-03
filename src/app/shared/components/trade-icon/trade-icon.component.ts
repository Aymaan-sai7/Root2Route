import { Component, input } from '@angular/core';

export type TradeIconName = 'electric' | 'plumbing' | 'carpentry' | 'painting' | 'ac' | 'more';

@Component({
  selector: 'app-trade-icon',
  standalone: true,
  imports: [],
  templateUrl: './trade-icon.component.html',
  styleUrl: './trade-icon.component.css'
})
export class TradeIconComponent {
  name = input.required<TradeIconName>();
}
