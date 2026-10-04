export const productGroups = ["Hamısı", "Qulaqlıqlar", "Ev audio", "Portativ", "Mənbə"] as const;
export type ProductGroup = (typeof productGroups)[number];

export type CatalogProduct = {
  id: string;
  model: string;
  name: string;
  category: string;
  group: Exclude<ProductGroup, "Hamısı">;
  price: number;
  description: string;
  detail: string;
  imageAlt: string;
  accent: string;
  tone: string;
  features: string[];
  badge?: string;
  inventory: number;
};

export const catalogProducts: CatalogProduct[] = [
  {
    id: "m1",
    model: "M1",
    name: "Məkan",
    category: "Qulaqüstü qulaqlıq",
    group: "Qulaqlıqlar",
    price: 589,
    description: "Səsi qulağa deyil, ətrafına yerləşdirən gündəlik qulaqlıq.",
    detail: "Yumşaq akustik toxuma, adaptiv sakitləşdirmə və 42 saatlıq dinləmə bir bədəndə.",
    imageAlt: "SƏDA Məkan M1 tünd gavalı rəngli qulaqüstü qulaqlıq",
    accent: "#aaa2ff",
    tone: "mineral",
    features: ["Adaptiv sakitlik", "42 saat", "Spatial stereo"],
    badge: "Ən çox seçilən",
    inventory: 18,
  },
  {
    id: "i1",
    model: "I1",
    name: "İz",
    category: "Simsiz qulaqlıq",
    group: "Qulaqlıqlar",
    price: 279,
    description: "Kiçik forma, musiqidə itməyən aydın istiqamət.",
    detail: "Təzyiqsiz oturuş, danışıq üçün dörd mikrofon və korpusla birlikdə 30 saat enerji.",
    imageAlt: "SƏDA İz I1 mis rəngli simsiz qulaqlıqlar və enerji qutusu",
    accent: "#ff8b73",
    tone: "coral",
    features: ["4 mikrofon", "30 saat", "IPX5"],
    badge: "Yeni",
    inventory: 32,
  },
  {
    id: "r1",
    model: "R1",
    name: "Otaq",
    category: "Simsiz səsgücləndirici",
    group: "Ev audio",
    price: 429,
    description: "Masanın üstündə az yer, otağın içində geniş səhnə.",
    detail: "İki istiqamətli sürücü, otağa uyğun avtomatik tonlama və toxunmadan idarə edilən halqa.",
    imageAlt: "SƏDA Otaq R1 tünd gavalı rəngli simsiz səsgücləndirici",
    accent: "#ff765f",
    tone: "porcelain",
    features: ["Otaq tonlaması", "Wi-Fi + Bluetooth", "18 saat"],
    inventory: 14,
  },
  {
    id: "s1",
    model: "S1",
    name: "Xətt",
    category: "Səs paneli",
    group: "Ev audio",
    price: 749,
    description: "Ekranın altında səhnəni böyüdən sakit, tək xətt.",
    detail: "Doqquz sürücü, dialoq aydınlaşdırma və otağın ölçüsünə görə avtomatik səhnə quruluşu.",
    imageAlt: "SƏDA Xətt S1 tünd gavalı rəngli incə səs paneli",
    accent: "#b7a8ff",
    tone: "mineral",
    features: ["Dolby Atmos", "9 sürücü", "HDMI eARC"],
    inventory: 9,
  },
  {
    id: "t1",
    model: "T1",
    name: "Dönüm",
    category: "Vinil pleyer",
    group: "Mənbə",
    price: 899,
    description: "Analoq ritualı gündəlik rahatlıqla birləşdirən pleyer.",
    detail: "Kəmər ötürməsi, avtomatik sürət kalibrasiyası və simsiz dinləmə üçün daxili phono mərhələsi.",
    imageAlt: "SƏDA Dönüm T1 fırçalanmış metal və gavalı rəngli vinil pleyer",
    accent: "#d0b7aa",
    tone: "porcelain",
    features: ["33 / 45 RPM", "Bluetooth", "Daxili phono"],
    inventory: 6,
  },
  {
    id: "d1",
    model: "D1",
    name: "Axın",
    category: "DAC və qulaqlıq gücləndiricisi",
    group: "Mənbə",
    price: 349,
    description: "Rəqəmsal siqnalı masanda dəqiq və toxuna bilən edir.",
    detail: "32-bit çevirmə, balanslı çıxış və səs səviyyəsi üçün ağır, dəqiq idarəetmə halqası.",
    imageAlt: "SƏDA Axın D1 qrafit korpuslu masaüstü DAC və mis idarəetmə halqası",
    accent: "#ff765f",
    tone: "coral",
    features: ["32-bit / 384 kHz", "Balanslı çıxış", "USB-C"],
    inventory: 21,
  },
  {
    id: "b1",
    model: "B1",
    name: "Cüt",
    category: "Rəf səsgücləndiriciləri",
    group: "Ev audio",
    price: 1090,
    description: "Kiçik otaqda böyük stereo səhnə quran iki sakit forma.",
    detail: "Aktiv stereo cütlük, hər tərəfdə ayrıca gücləndirmə və otaq sərhədlərinə uyğun bass nəzarəti.",
    imageAlt: "SƏDA Cüt B1 tünd gavalı toxumalı iki rəf səsgücləndiricisi",
    accent: "#cfb29f",
    tone: "porcelain",
    features: ["2 × 80 W", "Stereo pair", "Room EQ"],
    inventory: 5,
  },
  {
    id: "p1",
    model: "P1",
    name: "Səfər",
    category: "Portativ səsgücləndirici",
    group: "Portativ",
    price: 239,
    description: "Ev səhnəsini çöldə də qoruyan suya davamlı səs.",
    detail: "Yüngül silindrik korpus, 360 dərəcə yayılma və bir həftəsonuna çatan enerji.",
    imageAlt: "SƏDA Səfər P1 tünd gavalı toxumalı portativ səsgücləndirici",
    accent: "#ff806b",
    tone: "coral",
    features: ["IP67", "24 saat", "360° səs"],
    badge: "Səfər üçün",
    inventory: 27,
  },
];
