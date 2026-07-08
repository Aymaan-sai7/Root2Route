import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

// ⚠️ فيكس معروف: Leaflet بيبني مسارات الأيقونات الافتراضية بشكل بيتكسر مع
// أدوات البناء الحديثة (Webpack/esbuild). بنستخدم CDN بدل ما نحتاج نعدّل
// angular.json عشان ننسخ ملفات الصور يدويًا
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.css',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  // ⚠️ نص البحث الأولي لتوسيط الخريطة (مثلاً "الفلل، بنها، القليوبية")
  @Input() searchHint = 'القاهرة';
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;

  @Output() locationConfirmed = new EventEmitter<{ lat: number; lng: number }>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('mapContainer', { static: true }) mapContainerRef!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private map!: L.Map;
  private marker!: L.Marker;

  loading = signal(true);
  private selectedLat = 30.0444;
  private selectedLng = 31.2357;

  ngAfterViewInit(): void {
    // لو فيه إحداثيات محفوظة من قبل (تعديل عنوان موجود)، نبدأ بيها مباشرة
    if (this.initialLat != null && this.initialLng != null) {
      this.initMap(this.initialLat, this.initialLng);
      this.loading.set(false);
    } else {
      this.geocodeAndCenter(this.searchHint);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /**
   * ⚠️ بنستخدم Nominatim (خدمة geocoding مجانية من OpenStreetMap) عشان نحول
   * اسم المكان (بلد/مدينة/محافظة) لإحداثيات تقريبية، ونوسّط الخريطة عليها.
   * المستخدم بعد كده بيسحب الدبوس للمكان الدقيق بنفسه.
   */
  private geocodeAndCenter(query: string): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=eg&q=${encodeURIComponent(query)}`;

    this.http.get<Array<{ lat: string; lon: string }>>(url).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.initMap(+results[0].lat, +results[0].lon);
        } else {
          this.initMap(30.0444, 31.2357); // fallback: وسط القاهرة
        }
        this.loading.set(false);
      },
      error: () => {
        this.initMap(30.0444, 31.2357);
        this.loading.set(false);
      },
    });
  }

  private initMap(lat: number, lng: number): void {
    this.selectedLat = lat;
    this.selectedLng = lng;

    this.map = L.map(this.mapContainerRef.nativeElement).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.selectedLat = pos.lat;
      this.selectedLng = pos.lng;
    });

    // الضغط في أي مكان على الخريطة ينقل الدبوس هناك مباشرة
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.selectedLat = e.latlng.lat;
      this.selectedLng = e.latlng.lng;
    });

    // مهم: Leaflet محتاج يعيد حساب حجم نفسه لما يتحط جوه مودال (overlay)
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  confirm(): void {
    this.locationConfirmed.emit({ lat: this.selectedLat, lng: this.selectedLng });
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('lp-overlay')) {
      this.close();
    }
  }
}
