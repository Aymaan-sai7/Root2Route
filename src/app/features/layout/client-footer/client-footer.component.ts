import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface QuickLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-client-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-footer.component.html',
  styleUrl: './client-footer.component.css',
})
export class ClientFooterComponent {
  currentYear = new Date().getFullYear();

  // بدل الـ placeholders — لينكات حقيقية لصفحات موجودة فعليًا في المشروع
  serviceLinks: QuickLink[] = [
    { label: 'كهرباء',          path: '/find-services/electrical' },
    { label: 'سباكة',           path: '/find-services/plumbing' },
    { label: 'نجارة',           path: '/find-services/carpentry' },
  ];

  accountLinks: QuickLink[] = [
    { label: 'كل الخدمات',   path: '/find-services' },
    { label: 'طلباتي',       path: '/orders' },
  ];
}
