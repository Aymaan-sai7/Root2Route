export type AppLanguage = 'ar' | 'en';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  dir: 'rtl' | 'ltr';
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];
