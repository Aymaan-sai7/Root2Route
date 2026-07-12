import { CanDeactivateFn } from '@angular/router';

// أي component عايز يستخدم الـ guard ده لازم يعمل implement للـ interface ده，
// ويرجّع true لو فيه تعديلات لسه ماتحفظتش
export interface ComponentCanDeactivate {
  hasUnsavedChanges: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<ComponentCanDeactivate> = (component) => {
  if (!component.hasUnsavedChanges()) return true;

  return window.confirm(
    'تعديلاتك متحفظتش .. لو خرجت دلوقتي هتضيع. متأكد إنك عايز تكمل؟'
  );
};
