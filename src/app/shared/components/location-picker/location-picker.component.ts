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
  label: 'village' | 'city' | 'governorate';
  query: string;
}

interface SearchResult {
  lat: number;
  lng: number;
  displayName: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.css',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
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
  resolvedAddress = signal<string | null>(null);
  resolvingAddress = signal(false);


  // ⚠️ جديد: بحث يدوي بيتحكم فيه المستخدم نفسه
  manualQuery = signal('');
  manualSearching = signal(false);
  manualResults = signal<SearchResult[]>([]);
  manualSearchTried = signal(false);

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

  private progressiveGeocode(): void {
    const attempts: GeocodeQuery[] = [];

    if (this.village && this.city && this.governorate) {
      attempts.push({ label: 'village', query: `${this.village}, ${this.city}, ${this.governorate}, مصر` });
    }
    if (this.city && this.governorate) {
      attempts.push({ label: 'city', query: `${this.city}, ${this.governorate}, مصر` });
    }
    if (this.governorate) {
      attempts.push({ label: 'governorate', query: `${this.governorate}, مصر` });
    }

    this.tryNext(attempts, 0);
  }

  private tryNext(attempts: GeocodeQuery[], index: number): void {
    if (index >= attempts.length) {
      this.initMap(30.0444, 31.2357);
      this.matchedLevel.set(null);
      this.loading.set(false);
      return;
    }

    const attempt = attempts[index];
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=eg&q=${encodeURIComponent(attempt.query)}`;

    this.http.get<Array<{ lat: string; lon: string; display_name: string }>>(url).subscribe({
      next: (results) => {
        const result = results[0];

        // ⚠️ الفيكس الأساسي: نتحقق إن اسم المحافظة فعلًا موجود جوه النتيجة
        // اللي رجعت، وإلا نعتبرها تطابق غلط ونروح لمحاولة أوسع بدل ما نثق
        // فيها عمياني. ده اللي كان بيخلي البلاد الصغيرة توصل لمكان بعيد تمامًا.
        const isPlausible = result && (
          !this.governorate || result.display_name.includes(this.governorate)
        );

        if (isPlausible) {
          this.initMap(+result.lat, +result.lon);
          this.matchedLevel.set(attempt.label);
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
  this.reverseGeocode(lat, lng); // ⚠️ جديد

  if (this.map) {
    this.map.setView([lat, lng], 16);
    this.marker.setLatLng([lat, lng]);
    return;
  }

  this.map = L.map(this.mapContainerRef.nativeElement, { zoomControl: true }).setView([lat, lng], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(this.map);

  this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

  this.marker.on('dragend', () => {
    const pos = this.marker.getLatLng();
    this.selectedLat = pos.lat;
    this.selectedLng = pos.lng;
    this.reverseGeocode(pos.lat, pos.lng); // ⚠️ جديد
  });

  this.map.on('click', (e: L.LeafletMouseEvent) => {
    this.marker.setLatLng(e.latlng);
    this.selectedLat = e.latlng.lat;
    this.selectedLng = e.latlng.lng;
    this.reverseGeocode(e.latlng.lat, e.latlng.lng); // ⚠️ جديد
  });

  setTimeout(() => this.map.invalidateSize(), 150);
}
// ⚠️ جديد: اسم المكان الحقيقي بالعربي، بيتحدّث لحظيًا كل ما الدبوس يتحرك
private reverseGeocode(lat: number, lng: number): void {
  this.resolvingAddress.set(true);
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`;

  this.http.get<{ display_name: string }>(url).subscribe({
    next: (res) => {
      this.resolvedAddress.set(res.display_name ?? null);
      this.resolvingAddress.set(false);
    },
    error: () => {
      this.resolvedAddress.set(null);
      this.resolvingAddress.set(false);
    },
  });
}
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

  /**
   * ⚠️ جديد: بحث يدوي حقيقي — بيرجع لحد 5 نتائج، والمستخدم نفسه يختار
   * الصح منهم بدل ما النظام يخمّن ويوديه لمكان غلط. ده الحل الأساسي
   * لمشكلة القرى الصغيرة اللي مش متغطية كويس في خرائط OSM.
   */
  searchManually(): void {
    const q = this.manualQuery().trim();
    if (!q) return;

    this.manualSearching.set(true);
    this.manualSearchTried.set(true);
    const fullQuery = q.includes('مصر') ? q : `${q}, مصر`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=eg&q=${encodeURIComponent(fullQuery)}`;

    this.http.get<Array<{ lat: string; lon: string; display_name: string }>>(url).subscribe({
      next: (results) => {
        this.manualResults.set(
          results.map((r) => ({ lat: +r.lat, lng: +r.lon, displayName: r.display_name }))
        );
        this.manualSearching.set(false);
      },
      error: () => {
        this.manualResults.set([]);
        this.manualSearching.set(false);
      },
    });
  }

  onManualQueryInput(event: Event): void {
    this.manualQuery.set((event.target as HTMLInputElement).value);
  }

  pickManualResult(result: SearchResult): void {
    this.initMap(result.lat, result.lng);
    this.matchedLevel.set(null);
    this.manualResults.set([]);
    this.manualQuery.set('');
    this.manualSearchTried.set(false);
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
