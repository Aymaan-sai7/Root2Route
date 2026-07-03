import { Injectable, signal, computed, effect } from '@angular/core';
import { AppLanguage, LANGUAGES } from '../../shared/interface/language';

const STORAGE_KEY = 'sanaye3i_lang';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly _lang = signal<AppLanguage>(this.getInitialLanguage());

  readonly lang = this._lang.asReadonly();

  readonly dir = computed<'rtl' | 'ltr'>(() =>
    LANGUAGES.find((l) => l.code === this._lang())?.dir ?? 'rtl'
  );

  readonly isRtl = computed(() => this.dir() === 'rtl');

  constructor() {
    // بيحدث <html lang> و <html dir> تلقائيًا كل ما اللغة تتغير
    effect(() => {
      const current = this._lang();
      const direction = this.dir();
      document.documentElement.setAttribute('lang', current);
      document.documentElement.setAttribute('dir', direction);
      localStorage.setItem(STORAGE_KEY, current);
    });
  }

  setLanguage(lang: AppLanguage): void {
    this._lang.set(lang);
  }

  toggle(): void {
    this._lang.set(this._lang() === 'ar' ? 'en' : 'ar');
  }

  private getInitialLanguage(): AppLanguage {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'ar' || saved === 'en') return saved;
    return 'ar';
  }
}
