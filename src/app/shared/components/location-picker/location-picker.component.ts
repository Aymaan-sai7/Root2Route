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

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeocodeQuery {
  label: string;
  query: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.css',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  // ⚠️ بدل ما ناخد نص واحد جاهز، بناخد الأجزاء منفصلة عشان نقدر ندور
  // تدريجيًا (محافظة → مدينة → بلد) بدل بحث واحد ممكن يفشل
  @Input() governorate = '';
  @Input() city = '';
  @Input() village = '';
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;

  @Output() locationConfirmed = new EventEmitter<{ lat: number; lng: number }>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('mapContainer', { static: true }) mapContainerRef!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  private map!: L.Map;
  private marker!: L.Marker;

  loading = signal(true);
  matchedLevel = signal<'village' | 'city' | 'governorate' | null>(null);
  gpsLoading = signal(false);

  private selectedLat = 30.0444;
  private selectedLng = 31.2357;

  ngAfterViewInit(): void {
    if (this.initialLat != null && this.initialLng != null) {
      this.initMap(this.initialLat, this.initialLng);
      this.loading.set(false);
    } else {
      this.progressiveGeocode();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /**
   * ⚠️ البحث التدريجي: بندور بالتفاصيل الأدق الأول (بلد+مدينة+محافظة)،
   * لو فشل ندور بمدينة+محافظة بس، ولو فشل ندور بالمحافظة وحدها (بتنجح
   * دايمًا لأن المحافظات كلها موجودة في خرائط OpenStreetMap). كده
   * الخريطة دايمًا بتوصل لأقرب مكان معقول حتى لو اسم البلد الصغير
   * مش معروف عالميًا، وبعدين المستخدم يظبط بالظبط بنفسه أو بموقعه الحالي.
   */
  private progressiveGeocode(): void {
    const attempts: GeocodeQuery[] = [];

    if (this.village && this.city && this.governorate) {
      attempts.push({
        label: 'village',
        query: `${this.village}, ${this.city}, ${this.governorate}, مصر`,
      });
    }
    if (this.city && this.governorate) {
      attempts.push({
        label: 'city',
        query: `${this.city}, ${this.governorate}, مصر`,
      });
    }
    if (this.governorate) {
      attempts.push({
        label: 'governorate',
        query: `${this.governorate}, مصر`,
      });
    }

    this.tryNext(attempts, 0);
  }

  private tryNext(attempts: GeocodeQuery[], index: number): void {
    if (index >= attempts.length) {
      this.initMap(30.0444, 31.2357); // fallback نهائي: وسط القاهرة
      this.matchedLevel.set(null);
      this.loading.set(false);
      return;
    }

    const attempt = attempts[index];
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=eg&q=${encodeURIComponent(attempt.query)}`;

    this.http.get<Array<{ lat: string; lon: string }>>(url).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.initMap(+results[0].lat, +results[0].lon);
          this.matchedLevel.set(attempt.label as any);
          this.loading.set(false);
        } else {
          this.tryNext(attempts, index + 1);
        }
      },
      error: () => this.tryNext(attempts, index + 1),
    });
  }

  private initMap(lat: number, lng: number): void {
    this.selectedLat = lat;
    this.selectedLng = lng;

    if (this.map) {
      this.map.setView([lat, lng], 15);
      this.marker.setLatLng([lat, lng]);
      return;
    }

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

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.selectedLat = e.latlng.lat;
      this.selectedLng = e.latlng.lng;
    });

    setTimeout(() => this.map.invalidateSize(), 100);
  }

  /**
   * ⚠️ جديد: زرار "استخدم موقعي الحالي" — أسهل بكتير من السحب اليدوي،
   * بيستخدم GPS المتصفح مباشرة (يحتاج إذن الموقع من المستخدم)
   */
  useMyLocation(): void {
    if (!navigator.geolocation) return;

    this.gpsLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.initMap(position.coords.latitude, position.coords.longitude);
        this.matchedLevel.set(null);
        this.gpsLoading.set(false);
      },
      () => {
        this.gpsLoading.set(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
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
