import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Worker } from '../../../../core/models/worker.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { switchMap } from 'rxjs';

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

  cities = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'أسيوط', 'الأقصر'];

  form: FormGroup = this.fb.group({
    fullName:          ['', [Validators.required, Validators.minLength(3)]],
    trade:             ['', Validators.required],
    city:              ['', Validators.required],
    hourlyRate:        [null, [Validators.required, Validators.min(1)]],
    yearsOfExperience: [null, [Validators.required, Validators.min(0)]],
    serviceRadius:     [null, [Validators.required, Validators.min(1)]],
    bio:               ['', Validators.maxLength(300)],
    isAvailable:       [true],
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;

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
