import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Worker } from '../../../../core/models/worker.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { getSkillsForTrade } from '../../../../core/constant/skills';
import { ComponentCanDeactivate } from '../../../../core/guards/unsaved.guard';

//  استبدلها بإيميل الدعم الحقيقي بتاعك
const SUPPORT_EMAIL = 'support@sanaye3i.com';

@Component({
  selector: 'app-pro-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pro-settings.component.html',
  styleUrl: './pro-settings.component.css',
})
export class ProSettingsComponent implements OnInit, ComponentCanDeactivate {
  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private workers = inject(WorkersService);
  private http    = inject(HttpClient);

  worker       = signal<Worker | null>(null);
  loading      = signal(true);
  saving       = signal(false);
  saved        = signal(false);
  error        = signal<string | null>(null);

  //  رابط "تواصل مع الدعم" — mailto بموضوع جاهز، أسهل من رقم واتساب
  // وهمي ممكن يلخبط حد لو دوس عليه بجد
  supportLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('طلب تعديل بيانات - صنايعي')}`;

  //  بنخزن القيم الأصلية اللي جاية من السيرفر عشان زرار "رجّع القيم
  // الأصلية" يقدر يرجّعها من غير ما يعمل reload كامل للصفحة
  private originalFormValue: Record<string, unknown> = {};

  trades = [
    { value: 'electrical', label: 'كهربا' },
    { value: 'plumbing',   label: 'سباكة' },
    { value: 'carpentry',  label: 'نجارة' },
    { value: 'painting',   label: 'نقاشة' },
    { value: 'ac',         label: 'تكييف وتبريد' },
    { value: 'other',      label: 'خدمات أخرى' },
  ];

  form: FormGroup = this.fb.group({
    fullName:          ['', [Validators.required, Validators.minLength(3)]],
    hourlyRate:        [null, [Validators.required, Validators.min(1)]],
    yearsOfExperience: [null, [Validators.required, Validators.min(0)]],
    serviceRadius:     [null, [Validators.required, Validators.min(1)]],
    bio:               ['', Validators.maxLength(300)],
    skills:            [[] as string[]],
    isAvailable:       [true],
  });

  availableSkills = computed<string[]>(() => {
    const trade = this.worker()?.trade;
    return trade && trade !== 'other' ? getSkillsForTrade(trade) : [];
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.workers.getByUserId(user.id).subscribe({
      next: (list) => {
        const w = list[0];
        if (!w) { this.error.set('مش لاقي بيانات الصنايعي.'); this.loading.set(false); return; }
        this.worker.set(w);

        const patch = {
          fullName:          w.fullName,
          hourlyRate:        w.hourlyRate,
          yearsOfExperience: w.yearsOfExperience,
          serviceRadius:     w.serviceRadius,
          bio:               w.bio,
          skills:            w.skills ?? [],
          isAvailable:       w.isAvailable,
        };
        this.form.patchValue(patch);
        //  نسخة منفصلة (مش reference) عشان لو skills اتعدلت في الفورم
        // متلخبطش النسخة الأصلية المحفوظة هنا
        this.originalFormValue = { ...patch, skills: [...(w.skills ?? [])] };

        this.loading.set(false);
      },
      error: () => {
        this.error.set('مش قادر يجيب البيانات.');
        this.loading.set(false);
      },
    });
  }

  // ── CanDeactivate ────────────────────────────────────────
  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  // بيغطي حالة قفل التاب/تحديث الصفحة (مش تنقل جوه الأنجولار روتر،
  // ده الـ guard بيغطيه لوحده) — نفس فكرة الـ guard بالظبط
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  // ── Reset ────────────────────────────────────────────────
  resetForm(): void {
    this.form.reset(this.originalFormValue);
  }

  isSkillSelected(skill: string): boolean {
    const current: string[] = this.form.get('skills')?.value ?? [];
    return current.includes(skill);
  }

  toggleSkill(skill: string): void {
    const current: string[] = this.form.get('skills')?.value ?? [];
    const updated = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    this.form.get('skills')?.setValue(updated);
    this.form.markAsDirty();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const w = this.worker();
    if (!w) return;

    this.saving.set(true);
    this.saved.set(false);

    const updated = { ...w, ...this.form.value };

    this.http.put<Worker>(`${environment.apiUrl}/workers/${w.id}`, updated).subscribe({
      next: (savedWorker) => {
        this.worker.set(savedWorker);
        this.saving.set(false);
        this.saved.set(true);

        //  بعد الحفظ بنجاح، القيم دي بقت "الأصل" الجديد — الفورم يرجع
        // pristine (مفيش تعديلات معلقة) وزرار Reset يرجّع للنقطة دي بقى
        this.originalFormValue = { ...this.form.value, skills: [...(this.form.value.skills ?? [])] };
        this.form.markAsPristine();

        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => {
        this.error.set('مش قادر يحفظ التغييرات.');
        this.saving.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }

  getTradeLabel(value: string | undefined): string {
    if (!value) return '';
    return this.trades.find((t) => t.value === value)?.label ?? value;
  }

  get bioLength(): number {
    return this.form.get('bio')?.value?.length ?? 0;
  }
}
