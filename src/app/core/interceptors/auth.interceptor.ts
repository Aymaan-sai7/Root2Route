import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/Auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      //  لو الطلب ده كان معاه توكن فعليًا (يعني كان طلب لمستخدم مسجل دخول)
      // والسيرفر برضو رفضه بـ 401، معناها التوكن انتهى أو بقى باطل (مثلاً
      // الأدمن حظر الحساب فجأة) — نسجّل خروج تلقائي ونوديه /login فورًا
      // بدل ما نسيب الصفحة واقفة أو فاضية من غير أي توضيح.
      //
      // لاحظ الشرط `&& token`: طلبات /auth/login نفسها بترجع 401 لو الباسورد
      // غلط، بس ده طلب من غير Authorization header خالص (مفيش token وقتها)،
      // فمش هيدخل هنا ويعمل logout غلط وسط محاولة تسجيل دخول عادية.
      if (err.status === 401 && token) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
