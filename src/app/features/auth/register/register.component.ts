import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StepIndicatorComponent } from './components/step-indicator/step-indicator.component';
import { StepAccountInfoComponent } from './components/step-account-info/step-account-info.component';
import { StepRoleSetupComponent } from './components/step-role-setup/step-role-setup.component';
import { StepProDetailsComponent } from './components/step-pro-details/step-pro-details.component';
import { StepVerificationComponent } from './components/step-verification/step-verification.component';
import { StepVerificationDocsComponent } from './components/step-verification-docs/step-verification-docs.component';
import { ScrollRevealDirective } from '../../../shared/directive/scroll-reveal.directive';
import { AuthService } from '../../../core/services/Auth.service';
import { WorkersService } from '../../../core/services/workers.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    StepIndicatorComponent,
    StepAccountInfoComponent,
    StepRoleSetupComponent,
    StepProDetailsComponent,
    StepVerificationComponent,
    StepVerificationDocsComponent,
    ScrollRevealDirective,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private fb      = new FormBuilder();
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private auth    = inject(AuthService);
  private workers = inject(WorkersService);

  currentStep  = signal(1);
  loading      = signal(false);
  errorMessage = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    fullName:         ['', [Validators.required, Validators.minLength(3)]],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['', [Validators.required, Validators.minLength(8)]],
    // ⚠️ جديد: مطلوب لكل الأدوار — بيتفحص وقت التسجيل إنه مش مكرر (لأي role)
    // عشان يمنع نفس الشخص يسجل كـ client وpro مع بعض
    nationalId:       ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
    role:             ['', Validators.required],
    trade:            [''],
    hourlyRate:       [null],
    yearsOfExperience:[null],
    city:             [''],
    serviceRadius:    [null],
    idFront:          [null],
    idBack:           [null],
    certificate:      [null],
  });

  private roleValue = toSignal(this.form.get('role')!.valueChanges, {
    initialValue: this.form.get('role')!.value,
  });

  totalSteps = computed(() => (this.roleValue() === 'pro' ? 5 : 3));

  private stepFields = computed<Partial<Record<number, string[]>>>(() => {
    if (this.roleValue() === 'pro') {
      return {
        1: ['fullName', 'email', 'password', 'nationalId'],
        2: ['role'],
        3: ['trade', 'hourlyRate', 'yearsOfExperience', 'city'],
        4: ['idFront', 'idBack'],
        5: [],
      };
    }
    return {
      1: ['fullName', 'email', 'password', 'nationalId'],
      2: ['role'],
      3: [],
    };
  });

  ngOnInit(): void {
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    if (roleFromUrl === 'client' || roleFromUrl === 'pro') {
      this.form.get('role')?.setValue(roleFromUrl);
    }
    this.syncProValidators();
  }

  goNext(): void {
    const fieldsToCheck = this.stepFields()[this.currentStep()] ?? [];
    const isValid = fieldsToCheck.every((f) => this.form.get(f)?.valid);

    if (!isValid) {
      fieldsToCheck.forEach((f) => this.form.get(f)?.markAsTouched());
      return;
    }

    if (this.currentStep() === 2) this.syncProValidators();

    if (this.currentStep() < this.totalSteps()) {
      this.currentStep.update((s) => s + 1);
    }
  }

  goBack(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const v    = this.form.value;
    const role = v.role as 'client' | 'pro';

    // بيانات بروفايل الصنايعي (لو pro) بتتبعت في نفس طلب التسجيل —
    // السيرفر بيكتب الـ user والـ worker مع بعض في عملية واحدة (atomic)،
    // فمفيش سيناريو "حساب يتيم" لو أي خطوة فشلت
    const workerData = role === 'pro' ? {
      fullName:          v.fullName,
      trade:             v.trade,
      tradeLabel:        this.getTradeLabel(v.trade),
      city:              v.city,
      hourlyRate:        Number(v.hourlyRate),
      yearsOfExperience: Number(v.yearsOfExperience),
      serviceRadius:     Number(v.serviceRadius) || 15,
      bio:               '',
      avatarColor:       this.randomColor(),
    } : undefined;

    this.auth.register(
      { fullName: v.fullName, email: v.email, password: v.password, role, nationalId: v.nationalId },
      workerData
    ).subscribe({
      next: (res) => {
        this.loading.set(false);

        // لو صنايعي ومعاه ملفات هوية، ابعتهم دلوقتي باستخدام docsUploadToken —
        // توكن مؤقت (15 دقيقة) غرضه الوحيد رفع المستندات دي، مش session، مش
        // بيتحفظ في أي storage، وبيتستخدم مرة واحدة بس هنا
        if (role === 'pro' && res.worker && res.docsUploadToken &&
            (v.idFront || v.idBack || v.certificate)) {
          this.workers.uploadVerificationDocs(
            res.worker.id,
            { idFront: v.idFront, idBack: v.idBack, certificate: v.certificate },
            res.docsUploadToken
          ).subscribe({
            error: () => {
              // فشل رفع الملفات مايوقفش التسجيل نفسه — الحساب اتعمل بنجاح بالفعل،
              // ممكن يرفعهم تاني بعد ما يتوافق عليه ويسجل دخول
            },
          });
        }

        // الحساب pending دلوقتي — مفيش أي تسجيل دخول تلقائي، نوجهه لصفحة الانتظار
        this.router.navigate(['/pending-review']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private getFormErrors(): Record<string, any> {
    const errors: Record<string, any> = {};
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  private getTradeLabel(trade: string): string {
    const map: Record<string, string> = {
      electrical: 'كهربا',
      plumbing:   'سباكة',
      carpentry:  'نجارة',
      painting:   'نقاشة',
      ac:         'تكييف وتبريد',
      other:      'خدمات أخرى',
    };
    return map[trade] ?? trade;
  }

  private randomColor(): string {
    const colors = ['#2563EB', '#F97316', '#16A34A', '#7A5FA0', '#0F172A', '#1D4ED8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private syncProValidators(): void {
    const isPro = this.form.get('role')?.value === 'pro';

    const fields = ['trade', 'hourlyRate', 'yearsOfExperience', 'city', 'idFront', 'idBack'];

    fields.forEach((field) => {
      const control = this.form.get(field);
      if (isPro) {
        if (field === 'trade' || field === 'city' || field === 'idFront' || field === 'idBack') {
          control?.setValidators([Validators.required]);
        } else {
          control?.setValidators([Validators.required, Validators.min(1)]);
        }
      } else {
        control?.clearValidators();
      }
      control?.updateValueAndValidity();
    });
  }
}
