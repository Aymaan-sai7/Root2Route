import { Component } from '@angular/core';

interface LegalLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-client-footer',
  standalone: true,
  imports: [],
  templateUrl: './client-footer.component.html',
  styleUrl: './client-footer.component.css',
})
export class ClientFooterComponent {
  currentYear = new Date().getFullYear();

  legalLinks: LegalLink[] = [
    { label: 'الشروط والأحكام', href: '#' },
    { label: 'سياسة الخصوصية', href: '#' },
  ];
}
