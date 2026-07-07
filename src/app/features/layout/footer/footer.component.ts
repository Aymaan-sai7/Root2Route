import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink {
  label: string;
  path: string; // مسار حقيقي، أو anchor بيبدأ بـ '#'
  queryParams?: Record<string, string>;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: '../../../shared/styles/footer.css',
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  // ⚠️ كل اللينكات دي حقيقية 100% ومطابقة لـ app.routes.ts
  columns: FooterColumn[] = [
    {
      title: 'استكشف',
      links: [
        { label: 'الرئيسية', path: '/' },
        { label: 'الخدمات', path: '#services' },
        { label: 'إزاي بيشتغل', path: '#how-it-works' },
        { label: 'اشتغل معانا', path: '#become-pro' },
      ],
    },
    {
      title: 'الحساب',
      links: [
        { label: 'تسجيل الدخول', path: '/login' },
        { label: 'سجل كعميل', path: '/register', queryParams: { role: 'client' } },
        { label: 'سجل كصنايعي', path: '/register', queryParams: { role: 'pro' } },
      ],
    },
  ];

  isAnchor(path: string): boolean {
    return path.startsWith('#');
  }
}
