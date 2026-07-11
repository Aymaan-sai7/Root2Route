import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Worker } from '../../../../core/models/worker.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { getSkillsForTrade } from '../../../../core/constant/skills';

@Component({
  selector: 'app-pro-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pro-settings.component.html',
  styleUrl: './pro-settings.component.css',
})
export class ProSettingsComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private workers = inject(WorkersService);
  private http    = inject(HttpClient);

  worker       = signal<Worker | null>(null);
  loading      = signal(true);
  saving       = signal(false);
  saved        = signal(false);
  error        = signal<string | null>(null);

  trades = [
    { value: 'electrical', label: 'كهربا' },
    { value: 'plumbing',   label: 'سباكة' },
    { value: 'carpentry',  label: 'نجارة' },
    { value: 'painting',   label: 'نقاشة' },
    { value: 'ac',         label: 'تكييف وتبريد' },
    { value: 'other',      label: 'خدمات أخرى' },
  ];

cities = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'البحيرة',
  'كفر الشيخ',
  'الغربية',
  'المنوفية',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح'
];
  form: FormGroup = this.fb.group({
    fullName:          ['', [Validators.required, Validators.minLength(3)]],
    trade:             ['', Validators.required],
    city:              ['', Validators.required],
    hourlyRate:        [null, [Validators.required, Validators.min(1)]],
    yearsOfExperience: [null, [Validators.required, Validators.min(0)]],
    serviceRadius:     [null, [Validators.required, Validators.min(1)]],
    bio:               ['', Validators.maxLength(300)],
    // ⚠️ جديد: مهارات قابلة للتعديل بعد التسجيل — نفس القايمة المستخدمة
    // في خطوة step-pro-details وقت التسجيل بالظبط (مصدر واحد مشترك)
    skills:            [[] as string[]],
    isAvailable:       [true],
  });

  // ⚠️ جديد: قايمة المهارات المتاحة تتغيّر تلقائيًا حسب التخصص الحالي في
  // الفورم (حتى لو غيّره من نفس الصفحة)
  availableSkills = computed<string[]>(() => {
    const trade = this.form.get('trade')?.value;
    return trade && trade !== 'other' ? getSkillsForTrade(trade) : [];
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    // ⚠️ لو التخصص اتغيّر، نصفّر المهارات المختارة (زي ما بنعمل بالظبط
    // في خطوة التسجيل — مهارات تخصص قديم مالهاش معنى مع تخصص جديد)
    this.form.get('trade')?.valueChanges.subscribe(() => {
      this.form.get('skills')?.setValue([]);
    });

    this.workers.getByUserId(user.id).subscribe({
      next: (list) => {
        const w = list[0];
        if (!w) { this.error.set('مش لاقي بيانات الصنايعي.'); this.loading.set(false); return; }
        this.worker.set(w);
        this.form.patchValue({
          fullName:          w.fullName,
          trade:             w.trade,
          city:              w.city,
          hourlyRate:        w.hourlyRate,
          yearsOfExperience: w.yearsOfExperience,
          serviceRadius:     w.serviceRadius,
          bio:               w.bio,
          skills:            w.skills ?? [],
          isAvailable:       w.isAvailable,
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('مش قادر يجيب البيانات.');
        this.loading.set(false);
      },
    });
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

  getTradeLabel(value: string): string {
    return this.trades.find((t) => t.value === value)?.label ?? value;
  }

  get bioLength(): number {
    return this.form.get('bio')?.value?.length ?? 0;
  }
}
