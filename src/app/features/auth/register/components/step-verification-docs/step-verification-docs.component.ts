import { Component, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

export interface UploadedDoc {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-step-verification-docs',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-verification-docs.component.html',
  styleUrl: './step-verification-docs.component.css'
})
export class StepVerificationDocsComponent {
  form = input.required<FormGroup>();

  idFrontPreview = signal<string | null>(null);
  idBackPreview = signal<string | null>(null);
  certificatePreview = signal<string | null>(null);
  certificateFileName = signal<string | null>(null);

  private readonly MAX_SIZE_MB = 5;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  errorMessage = signal<string | null>(null);

  onFileSelected(event: Event, controlName: 'idFront' | 'idBack' | 'certificate'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorMessage.set(null);

    // تحقق من نوع الملف
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage.set('الصورة لازم تكون JPG أو PNG أو WebP بس.');
      input.value = '';
      return;
    }

    // تحقق من حجم الملف
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > this.MAX_SIZE_MB) {
      this.errorMessage.set(`حجم الصورة أكبر من ${this.MAX_SIZE_MB} ميجا، اختار صورة أصغر.`);
      input.value = '';
      return;
    }

    // نحول الملف لرابط معاينة (Preview URL) باستخدام FileReader — للعرض بس
    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = reader.result as string;
      if (controlName === 'idFront') {
        this.idFrontPreview.set(previewUrl);
      } else if (controlName === 'idBack') {
        this.idBackPreview.set(previewUrl);
      } else {
        this.certificatePreview.set(previewUrl);
        this.certificateFileName.set(file.name);
      }

      // ⚠️ نحفظ الـ File الحقيقي بس جوه الفورم (مش object ملفوف) —
      // ده اللي بيتبعت فعليًا لـ workers.uploadVerificationDocs() بعد كده
      this.form().get(controlName)?.setValue(file);
      this.form().get(controlName)?.markAsTouched();
    };
    reader.readAsDataURL(file);
  }

  removeFile(controlName: 'idFront' | 'idBack' | 'certificate'): void {
    if (controlName === 'idFront') {
      this.idFrontPreview.set(null);
    } else if (controlName === 'idBack') {
      this.idBackPreview.set(null);
    } else {
      this.certificatePreview.set(null);
      this.certificateFileName.set(null);
    }
    this.form().get(controlName)?.setValue(null);
  }
}
