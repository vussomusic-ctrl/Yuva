// Baku reference data — generated from OpenStreetMap (Overpass API), scoped to the
// 12 administrative rayons of Baku city. Coordinates are real OSM data.
// Names: az from OSM (generic "rayonu"/"qəsəbəsi" suffixes trimmed); ru/en from
// OSM name:ru / name:en where present, otherwise az fallback (see TODO in handoff).
// Replace with a Supabase table later.

export type PlaceType = "rayon" | "qesebe" | "microrayon" | "metro";

export type Place = {
  id: string;
  az: string;
  ru: string;
  en: string;
  lat: number;
  lng: number;
  type: PlaceType;
};

// Baku city centre — map default + fallback when a place id can't be resolved.
export const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

export const PLACES: Place[] = [
  { id: "bineqedi_rayon", az: "Binəqədi", ru: "Бинагадинский район", en: "Binagady Raion", lat: 40.5871, lng: 49.80416, type: "rayon" },
  { id: "qaradag_rayon", az: "Qaradağ", ru: "Гарадагский район", en: "Karadag Raion", lat: 40.0073, lng: 49.59572, type: "rayon" },
  { id: "yasamal_rayon", az: "Yasamal", ru: "Ясамальский район", en: "Yasamal Raion", lat: 40.38449, lng: 49.811, type: "rayon" },
  { id: "sebail_rayon", az: "Səbail", ru: "Сабаильский район", en: "Sabail Raion", lat: 40.21658, lng: 49.86518, type: "rayon" },
  { id: "nesimi_rayon", az: "Nəsimi", ru: "Насиминский район", en: "Nasimi Raion", lat: 40.37747, lng: 49.83937, type: "rayon" },
  { id: "nerimanov_rayon", az: "Nərimanov", ru: "Nərimanov", en: "Nərimanov", lat: 40.40985, lng: 49.87094, type: "rayon" },
  { id: "nizami_rayon", az: "Nizami", ru: "Низаминский район", en: "Nizami Raion", lat: 40.40793, lng: 49.92561, type: "rayon" },
  { id: "xetai_rayon", az: "Xətai", ru: "Хатаинский район", en: "Khatay Raion", lat: 40.22498, lng: 49.98034, type: "rayon" },
  { id: "sabuncu_rayon", az: "Sabunçu", ru: "Сабунчинский район", en: "Sabunchu Raion", lat: 40.60029, lng: 50.03162, type: "rayon" },
  { id: "suraxani_rayon", az: "Suraxanı", ru: "Сураханский район", en: "Surakhany Raion", lat: 40.26432, lng: 50.04523, type: "rayon" },
  { id: "xezer_rayon", az: "Xəzər", ru: "Хазарский район", en: "Khazar Raion", lat: 40.39279, lng: 50.18486, type: "rayon" },
  { id: "pirallahi_rayon", az: "Pirallahı", ru: "Пираллахинский район", en: "Pirallahi Raion", lat: 40.37757, lng: 50.71334, type: "rayon" },
  { id: "20_yanvar_metro", az: "20 Yanvar", ru: "20 Yanvar", en: "20 Yanvar", lat: 40.40414, lng: 49.8077, type: "metro" },
  { id: "28_may_metro", az: "28 May", ru: "28 May", en: "28 May", lat: 40.37986, lng: 49.84864, type: "metro" },
  { id: "8_noyabr_metro", az: "8 Noyabr", ru: "8 Noyabr", en: "8 Noyabr", lat: 40.40187, lng: 49.82051, type: "metro" },
  { id: "avtovagzal_metro", az: "Avtovağzal", ru: "Avtovağzal", en: "Avtovağzal", lat: 40.42151, lng: 49.79522, type: "metro" },
  { id: "azadliq_prospekti_metro", az: "Azadlıq prospekti", ru: "Азадлыг проспекти", en: "Azadlıq prospekti", lat: 40.42596, lng: 49.84293, type: "metro" },
  { id: "bakmil_metro", az: "Bakmil", ru: "Бакмил", en: "Bakmil", lat: 40.41414, lng: 49.8788, type: "metro" },
  { id: "cefer_cabbarli_metro", az: "Cəfər Cabbarlı", ru: "Cəfər Cabbarlı", en: "Cəfər Cabbarlı", lat: 40.37965, lng: 49.84895, type: "metro" },
  { id: "dernegul_metro", az: "Dərnəgül", ru: "Дарнагюль", en: "Dərnəgül", lat: 40.4254, lng: 49.86179, type: "metro" },
  { id: "elmler_akademiyasi_metro", az: "Elmlər Akademiyası", ru: "Элмляр Академиясы", en: "Elmlər Akademiyası", lat: 40.37515, lng: 49.81548, type: "metro" },
  { id: "ehmedli_metro", az: "Əhmədli", ru: "Ахмедлы", en: "Əhmədli", lat: 40.38556, lng: 49.95395, type: "metro" },
  { id: "genclik_metro", az: "Gənclik", ru: "Gənclik", en: "Gənclik", lat: 40.39988, lng: 49.85096, type: "metro" },
  { id: "hezi_aslanov_metro", az: "Həzi Aslanov", ru: "Ази Асланов", en: "Həzi Aslanov", lat: 40.37304, lng: 49.95357, type: "metro" },
  { id: "iceriseher_metro", az: "İçərişəhər", ru: "Ичеришехер", en: "Icherisheher", lat: 40.36596, lng: 49.83165, type: "metro" },
  { id: "insaatcilar_metro", az: "İnşaatçılar", ru: "Иншаатчылар", en: "İnşaatçılar", lat: 40.38909, lng: 49.80236, type: "metro" },
  { id: "koroglu_metro", az: "Koroğlu", ru: "Короглу", en: "Koroglu", lat: 40.42086, lng: 49.91809, type: "metro" },
  { id: "memar_ecemi_metro", az: "Memar Əcəmi", ru: "Мемар Аджеми", en: "Memar Ajami", lat: 40.41068, lng: 49.81394, type: "metro" },
  { id: "mehemmed_hadi_metro", az: "Məhəmməd Hadi", ru: "Məhəmməd Hadi", en: "Məhəmməd Hadi", lat: 40.37242, lng: 49.95207, type: "metro" },
  { id: "neftciler_metro", az: "Neftçilər", ru: "Нефтчиляр", en: "Neftçilər", lat: 40.41116, lng: 49.94257, type: "metro" },
  { id: "neriman_nerimanov_metro", az: "Nəriman Nərimanov", ru: "Нариман Нариманов", en: "Nəriman Nərimanov", lat: 40.40282, lng: 49.87064, type: "metro" },
  { id: "nesimi_metro", az: "Nəsimi", ru: "Насими", en: "Nasimi", lat: 40.42465, lng: 49.82628, type: "metro" },
  { id: "nizami_metro", az: "Nizami", ru: "Низами", en: "Nizami", lat: 40.37932, lng: 49.83002, type: "metro" },
  { id: "qara_qarayev_metro", az: "Qara Qarayev", ru: "Гара Гараев", en: "Qara Qarayev", lat: 40.41761, lng: 49.93396, type: "metro" },
  { id: "sah_ismayil_xetai_metro", az: "Şah İsmayıl Xətai", ru: "Шах Исмаил Хатаи", en: "Shah Ismail Khatai", lat: 40.38325, lng: 49.87215, type: "metro" },
  { id: "sahil_metro", az: "Sahil", ru: "Sahil", en: "Sahil", lat: 40.37173, lng: 49.84457, type: "metro" },
  { id: "ulduz_metro", az: "Ulduz", ru: "Улдуз", en: "Ulduz", lat: 40.41496, lng: 49.89143, type: "metro" },
  { id: "xalqlar_dostlugu_metro", az: "Xalqlar Dostluğu", ru: "Халглар Достлугу", en: "Xalqlar Dostluğu", lat: 40.39689, lng: 49.95299, type: "metro" },
  { id: "4_cu_mikrorayon_mr", az: "4-cü Mikrorayon", ru: "4-й микрорайон", en: "4-cü Mikrorayon", lat: 40.41648, lng: 49.81157, type: "microrayon" },
  { id: "badamdar_mr", az: "Badamdar", ru: "Бадамдар", en: "Badamdar", lat: 40.34119, lng: 49.80766, type: "microrayon" },
  { id: "bakixanov_mr", az: "Bakıxanov", ru: "Бакиханов", en: "Bakikhanov", lat: 40.42285, lng: 49.9616, type: "microrayon" },
  { id: "bayil_mr", az: "Bayıl", ru: "Баилово", en: "Bail", lat: 40.34478, lng: 49.83706, type: "microrayon" },
  { id: "bibiheybet_mr", az: "Bibiheybət", ru: "Bibiheybət", en: "Bibiheybət", lat: 40.30627, lng: 49.82236, type: "microrayon" },
  { id: "bileceri_mr", az: "Biləcəri", ru: "Баладжары", en: "Baladjary", lat: 40.44148, lng: 49.80955, type: "microrayon" },
  { id: "dernegul_mr", az: "Dərnəgül", ru: "Дарнагюль", en: "Dərnəgül", lat: 40.41873, lng: 49.84979, type: "microrayon" },
  { id: "qaracuxur_mr", az: "Qaraçuxur", ru: "Карачухур", en: "Karachukhur", lat: 40.39883, lng: 49.9794, type: "microrayon" },
  { id: "resulzade_mr", az: "Rəsulzadə", ru: "Расулзаде", en: "Rəsulzadə", lat: 40.43108, lng: 49.83625, type: "microrayon" },
  { id: "subani_mr", az: "Şubanı", ru: "Şubanı", en: "Şubanı", lat: 40.36324, lng: 49.76372, type: "microrayon" },
  { id: "xocesen_mr", az: "Xocəsən", ru: "Ходжасан", en: "Khojasan", lat: 40.41193, lng: 49.7685, type: "microrayon" },
  { id: "yasamal_mr", az: "Yasamal", ru: "Ясамал", en: "Yasamal", lat: 40.37944, lng: 49.80192, type: "microrayon" },
  { id: "zig_mr", az: "Zığ", ru: "Zığ", en: "Zığ", lat: 40.34275, lng: 49.98038, type: "microrayon" },
  { id: "28_may_q", az: "28 May", ru: "28 May", en: "28 May", lat: 40.46154, lng: 49.63905, type: "qesebe" },
  { id: "bahar_q", az: "Bahar", ru: "Bahar", en: "Bahar", lat: 40.36786, lng: 50.02964, type: "qesebe" },
  { id: "balaxani_q", az: "Balaxanı", ru: "Балаханы", en: "Balaxanı", lat: 40.4616, lng: 49.92142, type: "qesebe" },
  { id: "bilgeh_q", az: "Bilgəh", ru: "Бильгях", en: "Bilgəh", lat: 40.57416, lng: 50.04093, type: "qesebe" },
  { id: "bine_q", az: "Binə", ru: "Бина", en: "Bine", lat: 40.44889, lng: 50.08939, type: "qesebe" },
  { id: "bineqedi_q", az: "Binəqədi", ru: "Бинагади", en: "Binagadi", lat: 40.46792, lng: 49.82802, type: "qesebe" },
  { id: "bulbule_q", az: "Bülbülə", ru: "Бюльбюля", en: "Bülbülə", lat: 40.43254, lng: 49.97815, type: "qesebe" },
  { id: "buzovna_q", az: "Buzovna", ru: "Бузовна", en: "Buzovna", lat: 40.52224, lng: 50.10291, type: "qesebe" },
  { id: "cicek_q", az: "Çiçək", ru: "Çiçək", en: "Çiçək", lat: 40.43888, lng: 49.74993, type: "qesebe" },
  { id: "dede_qorqud_q", az: "Dədə Qorqud", ru: "Деде Коркуд", en: "Dədə Qorqud", lat: 40.38682, lng: 50.0243, type: "qesebe" },
  { id: "dubendi_q", az: "Dübəndi", ru: "Dübəndi", en: "Dübəndi", lat: 40.41563, lng: 50.29966, type: "qesebe" },
  { id: "ehmedli_q", az: "Əhmədli", ru: "Ахмедли", en: "Ahmedli", lat: 40.38513, lng: 49.94471, type: "qesebe" },
  { id: "emircan_q", az: "Əmircan", ru: "Əmircan", en: "Əmircan", lat: 40.42198, lng: 49.99007, type: "qesebe" },
  { id: "gurgan_q", az: "Gürgan", ru: "Gürgan", en: "Gürgan", lat: 40.39689, lng: 50.33447, type: "qesebe" },
  { id: "hovsan_q", az: "Hövsan", ru: "Hövsan", en: "Hövsan", lat: 40.36687, lng: 50.08086, type: "qesebe" },
  { id: "kurdexani_q", az: "Kürdəxanı", ru: "Kürdəxanı", en: "Kürdəxanı", lat: 40.5508, lng: 49.91722, type: "qesebe" },
  { id: "lokbatan_q", az: "Lökbatan", ru: "Локбатан", en: "Lökbatan", lat: 40.32527, lng: 49.73083, type: "qesebe" },
  { id: "mastaga_q", az: "Maştağa", ru: "Маштага", en: "Mastaga", lat: 40.53156, lng: 50.00095, type: "qesebe" },
  { id: "merdekan_q", az: "Mərdəkan", ru: "Мардакан", en: "Mardakan", lat: 40.49359, lng: 50.14955, type: "qesebe" },
  { id: "musfiqabad_q", az: "Müşfiqabad", ru: "Мушфигабад", en: "Müşfiqabad", lat: 40.46875, lng: 49.62179, type: "qesebe" },
  { id: "nardaran_q", az: "Nardaran", ru: "Нардаран", en: "Nardaran", lat: 40.55888, lng: 50.00653, type: "qesebe" },
  { id: "pirallahi_q", az: "Pirallahı", ru: "Пираллахы", en: "Pirallahı", lat: 40.45918, lng: 50.33399, type: "qesebe" },
  { id: "pirsagi_q", az: "Pirşağı", ru: "Пиршаги", en: "Pirşağı", lat: 40.55877, lng: 49.88734, type: "qesebe" },
  { id: "puta_q", az: "Puta", ru: "Пута", en: "Puta", lat: 40.29657, lng: 49.66132, type: "qesebe" },
  { id: "qala_q", az: "Qala", ru: "Qala", en: "Qala", lat: 40.44413, lng: 50.16317, type: "qesebe" },
  { id: "qizildas_q", az: "Qızıldaş", ru: "Кызылдаш", en: "Qızıldaş", lat: 40.30802, lng: 49.59785, type: "qesebe" },
  { id: "ramana_q", az: "Ramana", ru: "Ramana", en: "Ramana", lat: 40.45717, lng: 49.98261, type: "qesebe" },
  { id: "sabuncu_q", az: "Sabunçu", ru: "Сабунчи", en: "Sabunçu", lat: 40.44814, lng: 49.93389, type: "qesebe" },
  { id: "sagan_q", az: "Şağan", ru: "Шаган", en: "Shaghan", lat: 40.4933, lng: 50.12795, type: "qesebe" },
  { id: "sahil_q", az: "Sahil", ru: "Сахиль", en: "Sahil", lat: 40.22704, lng: 49.58053, type: "qesebe" },
  { id: "suraxani_q", az: "Suraxanı", ru: "Сураханы", en: "Suraxanı", lat: 40.42003, lng: 50.00189, type: "qesebe" },
  { id: "suvelan_q", az: "Şüvəlan", ru: "Шувелан", en: "Şüvəlan", lat: 40.48674, lng: 50.18397, type: "qesebe" },
  { id: "turkan_q", az: "Türkan", ru: "Тюркан", en: "Türkan", lat: 40.36628, lng: 50.21312, type: "qesebe" },
  { id: "yeni_balaxani_q", az: "Yeni Balaxanı", ru: "Yeni Balaxanı", en: "Yeni Balaxanı", lat: 40.47496, lng: 49.91567, type: "qesebe" },
  { id: "yeni_kurdexani_q", az: "Yeni Kürdəxanı", ru: "Yeni Kürdəxanı", en: "Yeni Kürdəxanı", lat: 40.51087, lng: 49.94004, type: "qesebe" },
  { id: "yeni_ramana_sabuncu_q", az: "Yeni Ramana Sabunçu", ru: "Раманы", en: "Yeni Ramana Sabunçu", lat: 40.44228, lng: 49.97846, type: "qesebe" },
  { id: "yeni_suraxani_q", az: "Yeni Suraxanı", ru: "Ени Сураханы", en: "Yeni Surakhany", lat: 40.4303, lng: 50.03742, type: "qesebe" },
  { id: "yeni_turkan_q", az: "Yeni Türkan", ru: "Yeni Türkan", en: "Yeni Türkan", lat: 40.37509, lng: 50.1767, type: "qesebe" },
  { id: "zabrat_q", az: "Zabrat", ru: "Забрат", en: "Zabrat", lat: 40.48122, lng: 49.95258, type: "qesebe" },
  { id: "zeferan_q", az: "Zəfəran", ru: "Zəfəran", en: "Zəfəran", lat: 40.54272, lng: 50.05957, type: "qesebe" },
  { id: "zire_q", az: "Zirə", ru: "Зиря", en: "Zire", lat: 40.36692, lng: 50.29053, type: "qesebe" },
];

// Areas selectable as "район" (rayon + qəsəbə + microrayon) — excludes metro.
export const AREAS = PLACES.filter((p) => p.type !== "metro");
export const RAYONS = PLACES.filter((p) => p.type === "rayon");
export const METRO = PLACES.filter((p) => p.type === "metro");

export const placeById = (id?: string | null): Place | undefined =>
  id ? PLACES.find((p) => p.id === id) : undefined;

/** Localized place name with az fallback. */
export const placeName = (p: Place, lang: "az" | "ru" | "en"): string => p[lang] || p.az;

/** Coordinates for a place id; falls back to Baku centre. */
export const coordsForPlace = (id?: string | null): { lat: number; lng: number } => {
  const p = placeById(id);
  return p ? { lat: p.lat, lng: p.lng } : BAKU_CENTER;
};
