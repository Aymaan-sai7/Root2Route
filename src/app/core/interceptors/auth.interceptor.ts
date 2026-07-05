import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/Auth.service';

/**
 * بيحط Authorization: Bearer <token> تلقائيًا على كل request خارج من الفرونت إند.
 * لازم يتسجل في app.config.ts:
 *
 *   provideHttpClient(withInterceptors([authInterceptor]))
 *
 * من غيره، أي endpoint محمي بـ verifyToken/verifyAdmin في السيرفر (زي /admin/*)
 * هيرفض كل request جاي من الفرونت إند بـ 401 لإن الهيدر مش هيوصل أصلاً.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
