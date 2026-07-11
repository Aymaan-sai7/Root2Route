import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

// Layouts
import { ClientLayoutComponent } from './features/layout/client-layout/client-layout.component';
import { ProLayoutComponent } from './features/layout/pro-layout/pro-layout.component';
import { AdminLayoutComponent } from './features/layout/admin/layout/admin-layout/admin-layout.component'; // ← جديد

// Public
import { LandingComponent } from './features/pages/landing/landing.component';

// Auth
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { PendingReviewComponent } from './features/auth/register/components/pending-review/pending-review.component';

// Client Pages
import { FindServicesComponent } from './features/pages/client/find-services/find-services.component';
import { SpecialistsListComponent } from './features/pages/client/specialists-list/specialists-list.component';
import { SpecialistProfileComponent } from './features/pages/client/specialist-profile/specialist-profile.component';
import { OrdersComponent } from './features/pages/client/orders/orders.component';
import { OrderDetailsComponent } from './features/pages/client/order-details/order-details.component';

// Pro Pages
import { ProDashboardComponent } from './features/pages/pro/pro-dashboard/pro-dashboard.component';
import { ProRequestsComponent } from './features/pages/pro/pro-requests/pro-requests.component';
import { ProJobsComponent } from './features/pages/pro/pro-jobs/pro-jobs.component';
import { ProSettingsComponent } from './features/pages/pro/pro-settings/pro-settings.component';
import { BookingComponent } from './features/pages/client/booking/booking.component';
import { ProMessagesComponent } from './features/pages/pro/pro-messages/pro-messages.component';

// Admin Pages
import { AdminDashboardComponent } from './features/pages/admin/admin-dashboard/admin-dashboard.component'; // ← جديد
import { AdminRegistrationsComponent } from './features/pages/admin/admin-registrations/admin-registrations.component';
import { AdminReviewsComponent } from './features/pages/admin/admin-reviews/admin-reviews.component';
import { AdminBookingsComponent } from './features/pages/admin/admin-bookings/admin-bookings.component';
import { AdminUsersComponent } from './features/pages/admin/admin-users/admin-users.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { AdminCouponsComponent } from './features/pages/admin/admin-coupons/admin-coupons.component';
import { AdminLogComponent } from './features/pages/admin/admin-log/admin-log.component';
import { AdminAnalyticsComponent } from './features/pages/admin/admin-analytics/admin-analytics.component';

export const routes: Routes = [

  // ─── Public (Landing) ─────────────────────────────────────
  {
    path: '',
    component: LandingComponent,
    title: 'Sanaye3i',
  },

  // ─── Auth (بدون layout) ───────────────────────────────────
  {
    path: 'login',
    component: LoginComponent,
    title: 'Sanaye3i — تسجيل الدخول',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Sanaye3i — التسجيل',
  },
  {
  path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Sanaye3i — نسيت كلمة المرور',
},
{
  path: 'reset-password',
  component: ResetPasswordComponent,
    title: 'Sanaye3i — إعادة تعيين كلمة المرور',
},
  {
    path: 'pending-review',
    component: PendingReviewComponent,
    title: 'Sanaye3i — طلبك قيد المراجعة',
  },
  {
  path: 'messages/:otherId',
  loadComponent: () =>
    import('./features/pages/messages/chat/chat.component')
      .then(m => m.ChatComponent),
  canActivate: [authGuard],
  title: 'Sanaye3i — المحادثة',
},

  // ─── Client Layout (محمية بـ authGuard + roleGuard('client')) ──
  {
    path: '',
    component: ClientLayoutComponent,
    canActivate: [authGuard, roleGuard('client')],
    children: [
      {
        path: 'find-services',
        component: FindServicesComponent,
        title: 'Sanaye3i — ابحث عن خدمة',
      },
      {
        path: 'find-services/:trade',
        component: SpecialistsListComponent,
        title: 'Sanaye3i — الصنايعية',
      },
      {
        path: 'specialist/:id',
        component: SpecialistProfileComponent,
        title: 'Sanaye3i — بروفايل الصنايعي',
      },
      {
        path: 'orders',
        component: OrdersComponent,
        title: 'Sanaye3i — طلباتي',
      },
      {
        path: 'orders/:id',
        component: OrderDetailsComponent,
        title: 'Sanaye3i — تفاصيل الطلب',
      },
      {
  path: 'booking/:workerId',
  component: BookingComponent,
  title: 'Sanaye3i — احجز صنايعي',
},
    ],
  },

  // ─── Pro Layout (محمية بـ authGuard + roleGuard('pro')) ────────
{
  path: 'pro',
  component: ProLayoutComponent,
  canActivate: [authGuard, roleGuard('pro')],
  children: [
    {
      path: 'dashboard',
      component: ProDashboardComponent,
      title: 'Sanaye3i — داشبورد الصنايعي',
    },
    {
      path: 'requests',
      component: ProRequestsComponent,
      title: 'Sanaye3i — الطلبات',
    },
    {
      path: 'jobs',
      component: ProJobsComponent,
      title: 'Sanaye3i — الشغل',
    },
    {
      path: 'settings',
      component: ProSettingsComponent,
      title: 'Sanaye3i — إعدادات الحساب',
    },{
  path: 'messages',
  component: ProMessagesComponent,
  title: 'Sanaye3i — رسائلي',
},
  ],
},

  // ─── Admin Layout (محمية بـ authGuard + roleGuard('admin')) ← جديد ──
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard('admin')],
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        title: 'Sanaye3i — لوحة تحكم الأدمن',
      },
       {
        path: 'registrations',
        component: AdminRegistrationsComponent,
        title: 'Sanaye3i — طلبات التسجيل',
      },
      {
        path: 'users',
        component: AdminUsersComponent,
        title: 'Sanaye3i — إدارة المستخدمين',
      },
      {
        path: 'bookings',
        component: AdminBookingsComponent,
        title: 'Sanaye3i — إدارة الحجوزات',
      },
      {
        path: 'reviews',
        component: AdminReviewsComponent,
        title: 'Sanaye3i — إدارة التقييمات',
      },
      {
  path: 'coupons',
  component: AdminCouponsComponent,
        title: 'Sanaye3i — إدارة الكوبونات',
},
{
  path: 'audit-log',
  component: AdminLogComponent,
        title: 'Sanaye3i — إدارة السجلات',
},
{
  path: 'analytics',
  component: AdminAnalyticsComponent,
        title: 'Sanaye3i — التحليلات',
},
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];
