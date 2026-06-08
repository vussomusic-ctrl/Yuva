// Azerbaijan places directory — generated from OpenStreetMap (Overpass API).
// Two-level hierarchy via parentId:
//   kind "region" (parentId=null): 77 republic units — 11 cities (seher) + 66
//     rayons + Ağdərə (admin_level 5). Baku is a region we add manually ("baku").
//   kind "area"   (parentId="baku"): Baku's 12 city rayons + qəsəbə + microrayon.
//   kind "metro"  (parentId="baku"): Baku metro stations.
// Coordinates are real OSM. Names: az/en cleaned toponyms; ru from OSM (rayons
// keep the adjectival "…ский район"; the 11 cities use bare ru). az fallback
// where OSM lacked a translation — see docs/places-translations-todo.md.

export type PlaceType = "rayon" | "seher" | "qesebe" | "microrayon" | "metro";
export type PlaceKind = "region" | "area" | "metro";

export type Place = {
  id: string;
  az: string;
  ru: string;
  en: string;
  lat: number;
  lng: number;
  type: PlaceType;
  kind: PlaceKind;
  parentId?: string; // area/metro -> region id; region -> undefined
};

// Baku city centre — map default + fallback when a place id can't be resolved.
export const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

export const PLACES: Place[] = [
  { id: "baku", az: "Bakı", ru: "Баку", en: "Baku", lat: 40.4093, lng: 49.8671, type: "seher", kind: "region" },
  { id: "abseron_rayon", az: "Abşeron", ru: "Апшеронский район", en: "Absheron", lat: 40.33747, lng: NaN, type: "rayon", kind: "region" },
  { id: "agcabedi_rayon", az: "Ağcabədi", ru: "Агджабединский район", en: "Aghjabadi", lat: 39.99387, lng: NaN, type: "rayon", kind: "region" },
  { id: "agdam_rayon", az: "Ağdam", ru: "Агдамский район", en: "Aghdam", lat: 40.04304, lng: NaN, type: "rayon", kind: "region" },
  { id: "agdas_rayon", az: "Ağdaş", ru: "Агдашский район", en: "Agdash", lat: 40.56008, lng: NaN, type: "rayon", kind: "region" },
  { id: "agdere_rayon", az: "Ağdərə", ru: "Агдеринский район", en: "Agdere", lat: 40.20332, lng: NaN, type: "rayon", kind: "region" },
  { id: "agstafa_rayon", az: "Ağstafa", ru: "Акстафинский район", en: "Aghstafa", lat: 41.21632, lng: NaN, type: "rayon", kind: "region" },
  { id: "agsu_rayon", az: "Ağsu", ru: "Ахсуинский район", en: "Agsu", lat: 40.55746, lng: NaN, type: "rayon", kind: "region" },
  { id: "astara_rayon", az: "Astara", ru: "Астаринский район", en: "Astara", lat: 38.51573, lng: NaN, type: "rayon", kind: "region" },
  { id: "babek_rayon", az: "Babək", ru: "Бабекский район", en: "Babek", lat: 39.25176, lng: NaN, type: "rayon", kind: "region" },
  { id: "balaken_rayon", az: "Balakən", ru: "Белоканский район", en: "Balakan", lat: 41.73225, lng: NaN, type: "rayon", kind: "region" },
  { id: "beyleqan_rayon", az: "Beyləqan", ru: "Бейлаганский район", en: "Beylagan", lat: 39.85678, lng: NaN, type: "rayon", kind: "region" },
  { id: "berde_rayon", az: "Bərdə", ru: "Бардинский район", en: "Barda", lat: 40.36106, lng: NaN, type: "rayon", kind: "region" },
  { id: "bilesuvar_rayon", az: "Biləsuvar", ru: "Билясуварский район", en: "Bilasuvar", lat: 39.52781, lng: NaN, type: "rayon", kind: "region" },
  { id: "cebrayil_rayon", az: "Cəbrayıl", ru: "Джебраильский район", en: "Jabrayil", lat: 39.31887, lng: NaN, type: "rayon", kind: "region" },
  { id: "celilabad_rayon", az: "Cəlilabad", ru: "Джалилабадский район", en: "Jalilabad", lat: 39.23163, lng: NaN, type: "rayon", kind: "region" },
  { id: "culfa_rayon", az: "Culfa", ru: "Джульфинский район", en: "Julfa", lat: 39.14429, lng: NaN, type: "rayon", kind: "region" },
  { id: "daskesen_rayon", az: "Daşkəsən", ru: "Дашкесанский район", en: "Dashkasan", lat: 40.48072, lng: NaN, type: "rayon", kind: "region" },
  { id: "fuzuli_rayon", az: "Füzuli", ru: "Физулинский район", en: "Fizuli", lat: 39.584, lng: NaN, type: "rayon", kind: "region" },
  { id: "gedebey_rayon", az: "Gədəbəy", ru: "Кедабекский район", en: "Gedebey", lat: 40.555, lng: NaN, type: "rayon", kind: "region" },
  { id: "goranboy_rayon", az: "Goranboy", ru: "Геранбойский район", en: "Goranboy", lat: 40.60294, lng: NaN, type: "rayon", kind: "region" },
  { id: "goycay_rayon", az: "Göyçay", ru: "Геокчайский район", en: "Goychay", lat: 40.57089, lng: NaN, type: "rayon", kind: "region" },
  { id: "goygol_rayon", az: "Göygöl", ru: "Гёйгёльский район", en: "Goygol", lat: 40.52789, lng: NaN, type: "rayon", kind: "region" },
  { id: "haciqabul_rayon", az: "Hacıqabul", ru: "Аджигабульский район", en: "Hajigabul", lat: 40.09845, lng: NaN, type: "rayon", kind: "region" },
  { id: "imisli_rayon", az: "İmişli", ru: "Имишлинский район", en: "Imishli", lat: 39.87519, lng: NaN, type: "rayon", kind: "region" },
  { id: "ismayilli_rayon", az: "İsmayıllı", ru: "Исмаиллинский район", en: "Ismailli", lat: 40.8003, lng: NaN, type: "rayon", kind: "region" },
  { id: "kelbecer_rayon", az: "Kəlbəcər", ru: "Кельбаджарский район", en: "Kalbajar", lat: 40.06742, lng: NaN, type: "rayon", kind: "region" },
  { id: "kengerli_rayon", az: "Kəngərli", ru: "Кенгерлинский район", en: "Kangarli", lat: 39.36323, lng: NaN, type: "rayon", kind: "region" },
  { id: "kurdemir_rayon", az: "Kürdəmir", ru: "Кюрдамирский район", en: "Kurdamir", lat: 40.27699, lng: NaN, type: "rayon", kind: "region" },
  { id: "lacin_rayon", az: "Laçın", ru: "Лачинский район", en: "Lachin", lat: 39.72008, lng: NaN, type: "rayon", kind: "region" },
  { id: "lerik_rayon", az: "Lerik", ru: "Лерикский район", en: "Lerik", lat: 38.75161, lng: NaN, type: "rayon", kind: "region" },
  { id: "lenkeran_rayon", az: "Lənkəran", ru: "Ленкоранский район", en: "Lankaran", lat: 38.94737, lng: NaN, type: "rayon", kind: "region" },
  { id: "masalli_rayon", az: "Masallı", ru: "Масаллинский район", en: "Masally", lat: 39.03012, lng: NaN, type: "rayon", kind: "region" },
  { id: "neftcala_rayon", az: "Neftçala", ru: "Нефтечалинский район", en: "Neftchala", lat: 39.25377, lng: NaN, type: "rayon", kind: "region" },
  { id: "oguz_rayon", az: "Oğuz", ru: "Огузский район", en: "Oghuz", lat: 40.99401, lng: NaN, type: "rayon", kind: "region" },
  { id: "ordubad_rayon", az: "Ordubad", ru: "Ордубадский район", en: "Ordubad", lat: 39.07705, lng: NaN, type: "rayon", kind: "region" },
  { id: "qax_rayon", az: "Qax", ru: "Кахский район", en: "Qakh", lat: 41.25656, lng: NaN, type: "rayon", kind: "region" },
  { id: "qazax_rayon", az: "Qazax", ru: "Казахский район", en: "Qazakh", lat: 41.17116, lng: NaN, type: "rayon", kind: "region" },
  { id: "qebele_rayon", az: "Qəbələ", ru: "Габалинский район", en: "Qabala", lat: 40.94399, lng: NaN, type: "rayon", kind: "region" },
  { id: "qobustan_rayon", az: "Qobustan", ru: "Гобустанский район", en: "Gobustan", lat: 40.53437, lng: NaN, type: "rayon", kind: "region" },
  { id: "quba_rayon", az: "Quba", ru: "Губинский район", en: "Quba", lat: 41.19134, lng: NaN, type: "rayon", kind: "region" },
  { id: "qubadli_rayon", az: "Qubadlı", ru: "Губадлинский район", en: "Qubadli", lat: 39.33364, lng: NaN, type: "rayon", kind: "region" },
  { id: "qusar_rayon", az: "Qusar", ru: "Гусарский район", en: "Qusar", lat: 41.45228, lng: NaN, type: "rayon", kind: "region" },
  { id: "saatli_rayon", az: "Saatlı", ru: "Саатлинский район", en: "Saatly", lat: 39.84405, lng: NaN, type: "rayon", kind: "region" },
  { id: "sabirabad_rayon", az: "Sabirabad", ru: "Сабирабадский район", en: "Sabirabad", lat: 39.8894, lng: NaN, type: "rayon", kind: "region" },
  { id: "sabran_rayon", az: "Şabran", ru: "Шабранский район", en: "Shabran", lat: 41.18306, lng: NaN, type: "rayon", kind: "region" },
  { id: "sahbuz_rayon", az: "Şahbuz", ru: "Шахбузский район", en: "Shahbuz Rayon", lat: 39.43836, lng: NaN, type: "rayon", kind: "region" },
  { id: "salyan_rayon", az: "Salyan", ru: "Сальянский район", en: "Salyan", lat: 39.65233, lng: NaN, type: "rayon", kind: "region" },
  { id: "samaxi_rayon", az: "Şamaxı", ru: "Шемахинский район", en: "Shamakhi", lat: 40.60147, lng: NaN, type: "rayon", kind: "region" },
  { id: "samux_rayon", az: "Samux", ru: "Самухский район", en: "Samukh", lat: 40.94696, lng: NaN, type: "rayon", kind: "region" },
  { id: "sederek_rayon", az: "Sədərək", ru: "Садаракский район", en: "Sadarak", lat: 39.67288, lng: NaN, type: "rayon", kind: "region" },
  { id: "seki_rayon", az: "Şəki", ru: "Шекинский район", en: "Sheki", lat: 41.11606, lng: NaN, type: "rayon", kind: "region" },
  { id: "semkir_rayon", az: "Şəmkir", ru: "Шамкирский район", en: "Shamkir", lat: 40.86876, lng: NaN, type: "rayon", kind: "region" },
  { id: "serur_rayon", az: "Şərur", ru: "Шарурский район", en: "Sharur", lat: 39.58948, lng: NaN, type: "rayon", kind: "region" },
  { id: "siyezen_rayon", az: "Siyəzən", ru: "Сиазаньский район", en: "Siazan", lat: 41.09109, lng: NaN, type: "rayon", kind: "region" },
  { id: "susa_rayon", az: "Şuşa", ru: "Шушинский район", en: "Shusha", lat: 39.70581, lng: NaN, type: "rayon", kind: "region" },
  { id: "terter_rayon", az: "Tərtər", ru: "Тертерский район", en: "Tartar", lat: 40.3463, lng: NaN, type: "rayon", kind: "region" },
  { id: "tovuz_rayon", az: "Tovuz", ru: "Товузский район", en: "Tovuz", lat: 40.93317, lng: NaN, type: "rayon", kind: "region" },
  { id: "ucar_rayon", az: "Ucar", ru: "Уджарский район", en: "Ujar", lat: 40.4329, lng: NaN, type: "rayon", kind: "region" },
  { id: "xacmaz_rayon", az: "Xaçmaz", ru: "Хачмазский район", en: "Khachmaz", lat: 41.65415, lng: NaN, type: "rayon", kind: "region" },
  { id: "xizi_rayon", az: "Xızı", ru: "Хызинский район", en: "Khizi", lat: 40.76831, lng: NaN, type: "rayon", kind: "region" },
  { id: "xocali_rayon", az: "Xocalı", ru: "Ходжалинский район", en: "Khojaly", lat: 39.84699, lng: NaN, type: "rayon", kind: "region" },
  { id: "xocavend_rayon", az: "Xocavənd", ru: "Ходжавендский район", en: "Khojavend", lat: 39.66001, lng: NaN, type: "rayon", kind: "region" },
  { id: "yardimli_rayon", az: "Yardımlı", ru: "Ярдымлинский район", en: "Yardymli", lat: 38.90292, lng: NaN, type: "rayon", kind: "region" },
  { id: "yevlax_rayon", az: "Yevlax", ru: "Евлахский район", en: "Yevlakh", lat: 40.72121, lng: NaN, type: "rayon", kind: "region" },
  { id: "zaqatala_rayon", az: "Zaqatala", ru: "Закатальский район", en: "Zaqatala", lat: 41.61796, lng: NaN, type: "rayon", kind: "region" },
  { id: "zengilan_rayon", az: "Zəngilan", ru: "Зангиланский район", en: "Zangilan", lat: 39.05373, lng: NaN, type: "rayon", kind: "region" },
  { id: "zerdab_rayon", az: "Zərdab", ru: "Зердабский район", en: "Zardab", lat: 40.24391, lng: NaN, type: "rayon", kind: "region" },
  { id: "gence_city", az: "Gəncə", ru: "Гянджа", en: "Ganja", lat: 40.67896, lng: NaN, type: "seher", kind: "region" },
  { id: "lenkeran_city", az: "Lənkəran", ru: "Лянкяран", en: "Lankaran", lat: 38.76489, lng: NaN, type: "seher", kind: "region" },
  { id: "mingecevir_city", az: "Mingəçevir", ru: "Мингечевир", en: "Mingachevir", lat: 40.80948, lng: NaN, type: "seher", kind: "region" },
  { id: "naftalan_city", az: "Naftalan", ru: "Нафталан", en: "Naftalan", lat: 40.49928, lng: NaN, type: "seher", kind: "region" },
  { id: "naxcivan_city", az: "Naxçıvan", ru: "Нахичевань", en: "Nakhchivan", lat: 39.21768, lng: NaN, type: "seher", kind: "region" },
  { id: "seki_city", az: "Şəki", ru: "Шеки", en: "Shaki", lat: 41.18244, lng: NaN, type: "seher", kind: "region" },
  { id: "sirvan_city", az: "Şirvan", ru: "Ширван", en: "Shirvan", lat: 39.92979, lng: NaN, type: "seher", kind: "region" },
  { id: "sumqayit_city", az: "Sumqayıt", ru: "Сумгаит", en: "Sumqayit", lat: 40.70077, lng: NaN, type: "seher", kind: "region" },
  { id: "xankendi_city", az: "Xankəndi", ru: "Ханкенди", en: "Khankendi", lat: 39.82608, lng: NaN, type: "seher", kind: "region" },
  { id: "yevlax_city", az: "Yevlax", ru: "Евлах", en: "Yevlakh", lat: 40.61468, lng: NaN, type: "seher", kind: "region" },
  { id: "bineqedi_rayon", az: "Binəqədi", ru: "Бинагадинский район", en: "Binagady Raion", lat: 40.463, lng: 49.829, type: "rayon", kind: "area", parentId: "baku" },
  { id: "qaradag_rayon", az: "Qaradağ", ru: "Гарадагский район", en: "Karadag Raion", lat: 40.23, lng: 49.632, type: "rayon", kind: "area", parentId: "baku" },
  { id: "yasamal_rayon", az: "Yasamal", ru: "Ясамальский район", en: "Yasamal Raion", lat: 40.378, lng: 49.815, type: "rayon", kind: "area", parentId: "baku" },
  { id: "sebail_rayon", az: "Səbail", ru: "Сабаильский район", en: "Sabail Raion", lat: 40.364, lng: 49.837, type: "rayon", kind: "area", parentId: "baku" },
  { id: "nesimi_rayon", az: "Nəsimi", ru: "Насиминский район", en: "Nasimi Raion", lat: 40.379, lng: 49.849, type: "rayon", kind: "area", parentId: "baku" },
  { id: "nerimanov_rayon", az: "Nərimanov", ru: "Нариманов", en: "Narimanov", lat: 40.406, lng: 49.887, type: "rayon", kind: "area", parentId: "baku" },
  { id: "nizami_rayon", az: "Nizami", ru: "Низаминский район", en: "Nizami Raion", lat: 40.379, lng: 49.949, type: "rayon", kind: "area", parentId: "baku" },
  { id: "xetai_rayon", az: "Xətai", ru: "Хатаинский район", en: "Khatay Raion", lat: 40.394, lng: 49.905, type: "rayon", kind: "area", parentId: "baku" },
  { id: "sabuncu_rayon", az: "Sabunçu", ru: "Сабунчинский район", en: "Sabunchu Raion", lat: 40.443, lng: 49.948, type: "rayon", kind: "area", parentId: "baku" },
  { id: "suraxani_rayon", az: "Suraxanı", ru: "Сураханский район", en: "Surakhany Raion", lat: 40.414, lng: 50.008, type: "rayon", kind: "area", parentId: "baku" },
  { id: "xezer_rayon", az: "Xəzər", ru: "Хазарский район", en: "Khazar Raion", lat: 40.422, lng: 50.048, type: "rayon", kind: "area", parentId: "baku" },
  { id: "pirallahi_rayon", az: "Pirallahı", ru: "Пираллахинский район", en: "Pirallahi Raion", lat: 40.473, lng: 50.317, type: "rayon", kind: "area", parentId: "baku" },
  { id: "20_yanvar_metro", az: "20 Yanvar", ru: "20 Января", en: "20 Yanvar", lat: 40.40414, lng: 49.8077, type: "metro", kind: "metro", parentId: "baku" },
  { id: "28_may_metro", az: "28 May", ru: "28 Мая", en: "28 May", lat: 40.37986, lng: 49.84864, type: "metro", kind: "metro", parentId: "baku" },
  { id: "8_noyabr_metro", az: "8 Noyabr", ru: "8 Ноября", en: "8 Noyabr", lat: 40.40187, lng: 49.82051, type: "metro", kind: "metro", parentId: "baku" },
  { id: "avtovagzal_metro", az: "Avtovağzal", ru: "Автовокзал", en: "Avtovagzal", lat: 40.42151, lng: 49.79522, type: "metro", kind: "metro", parentId: "baku" },
  { id: "azadliq_prospekti_metro", az: "Azadlıq prospekti", ru: "Азадлыг проспекти", en: "Azadliq prospekti", lat: 40.42596, lng: 49.84293, type: "metro", kind: "metro", parentId: "baku" },
  { id: "bakmil_metro", az: "Bakmil", ru: "Бакмил", en: "Bakmil", lat: 40.41414, lng: 49.8788, type: "metro", kind: "metro", parentId: "baku" },
  { id: "cefer_cabbarli_metro", az: "Cəfər Cabbarlı", ru: "Джафар Джаббарлы", en: "Jafar Jabbarli", lat: 40.37965, lng: 49.84895, type: "metro", kind: "metro", parentId: "baku" },
  { id: "dernegul_metro", az: "Dərnəgül", ru: "Дарнагюль", en: "Darnagul", lat: 40.4254, lng: 49.86179, type: "metro", kind: "metro", parentId: "baku" },
  { id: "elmler_akademiyasi_metro", az: "Elmlər Akademiyası", ru: "Элмляр Академиясы", en: "Elmlar Akademiyasi", lat: 40.37515, lng: 49.81548, type: "metro", kind: "metro", parentId: "baku" },
  { id: "ehmedli_metro", az: "Əhmədli", ru: "Ахмедлы", en: "Ahmadli", lat: 40.38556, lng: 49.95395, type: "metro", kind: "metro", parentId: "baku" },
  { id: "genclik_metro", az: "Gənclik", ru: "Гянджлик", en: "Ganjlik", lat: 40.39988, lng: 49.85096, type: "metro", kind: "metro", parentId: "baku" },
  { id: "hezi_aslanov_metro", az: "Həzi Aslanov", ru: "Ази Асланов", en: "Hazi Aslanov", lat: 40.37304, lng: 49.95357, type: "metro", kind: "metro", parentId: "baku" },
  { id: "iceriseher_metro", az: "İçərişəhər", ru: "Ичеришехер", en: "Icherisheher", lat: 40.36596, lng: 49.83165, type: "metro", kind: "metro", parentId: "baku" },
  { id: "insaatcilar_metro", az: "İnşaatçılar", ru: "Иншаатчылар", en: "Inshaatchilar", lat: 40.38909, lng: 49.80236, type: "metro", kind: "metro", parentId: "baku" },
  { id: "koroglu_metro", az: "Koroğlu", ru: "Короглу", en: "Koroglu", lat: 40.42086, lng: 49.91809, type: "metro", kind: "metro", parentId: "baku" },
  { id: "memar_ecemi_metro", az: "Memar Əcəmi", ru: "Мемар Аджеми", en: "Memar Ajami", lat: 40.41068, lng: 49.81394, type: "metro", kind: "metro", parentId: "baku" },
  { id: "mehemmed_hadi_metro", az: "Məhəmməd Hadi", ru: "Мамед Хади", en: "Mahammad Hadi", lat: 40.37242, lng: 49.95207, type: "metro", kind: "metro", parentId: "baku" },
  { id: "neftciler_metro", az: "Neftçilər", ru: "Нефтчиляр", en: "Neftchilar", lat: 40.41116, lng: 49.94257, type: "metro", kind: "metro", parentId: "baku" },
  { id: "neriman_nerimanov_metro", az: "Nəriman Nərimanov", ru: "Нариман Нариманов", en: "Nariman Narimanov", lat: 40.40282, lng: 49.87064, type: "metro", kind: "metro", parentId: "baku" },
  { id: "nesimi_metro", az: "Nəsimi", ru: "Насими", en: "Nasimi", lat: 40.42465, lng: 49.82628, type: "metro", kind: "metro", parentId: "baku" },
  { id: "nizami_metro", az: "Nizami", ru: "Низами", en: "Nizami", lat: 40.37932, lng: 49.83002, type: "metro", kind: "metro", parentId: "baku" },
  { id: "qara_qarayev_metro", az: "Qara Qarayev", ru: "Гара Гараев", en: "Qara Qarayev", lat: 40.41761, lng: 49.93396, type: "metro", kind: "metro", parentId: "baku" },
  { id: "sah_ismayil_xetai_metro", az: "Şah İsmayıl Xətai", ru: "Шах Исмаил Хатаи", en: "Shah Ismail Khatai", lat: 40.38325, lng: 49.87215, type: "metro", kind: "metro", parentId: "baku" },
  { id: "sahil_metro", az: "Sahil", ru: "Сахиль", en: "Sahil", lat: 40.37173, lng: 49.84457, type: "metro", kind: "metro", parentId: "baku" },
  { id: "ulduz_metro", az: "Ulduz", ru: "Улдуз", en: "Ulduz", lat: 40.41496, lng: 49.89143, type: "metro", kind: "metro", parentId: "baku" },
  { id: "xalqlar_dostlugu_metro", az: "Xalqlar Dostluğu", ru: "Халглар Достлугу", en: "Xalqlar Dostlugu", lat: 40.39689, lng: 49.95299, type: "metro", kind: "metro", parentId: "baku" },
  { id: "4_cu_mikrorayon_mr", az: "4-cü Mikrorayon", ru: "4-й микрорайон", en: "4th Microrayon", lat: 40.41648, lng: 49.81157, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "badamdar_mr", az: "Badamdar", ru: "Бадамдар", en: "Badamdar", lat: 40.34119, lng: 49.80766, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "bakixanov_mr", az: "Bakıxanov", ru: "Бакиханов", en: "Bakikhanov", lat: 40.42285, lng: 49.9616, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "bayil_mr", az: "Bayıl", ru: "Баилово", en: "Bail", lat: 40.34478, lng: 49.83706, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "bibiheybet_mr", az: "Bibiheybət", ru: "Биби-Эйбат", en: "Bibi-Heybat", lat: 40.30627, lng: 49.82236, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "bileceri_mr", az: "Biləcəri", ru: "Баладжары", en: "Baladjary", lat: 40.44148, lng: 49.80955, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "dernegul_mr", az: "Dərnəgül", ru: "Дарнагюль", en: "Darnagul", lat: 40.41873, lng: 49.84979, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "qaracuxur_mr", az: "Qaraçuxur", ru: "Карачухур", en: "Karachukhur", lat: 40.39883, lng: 49.9794, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "resulzade_mr", az: "Rəsulzadə", ru: "Расулзаде", en: "Rasulzada", lat: 40.43108, lng: 49.83625, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "subani_mr", az: "Şubanı", ru: "Шубаны", en: "Shubani", lat: 40.36324, lng: 49.76372, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "xocesen_mr", az: "Xocəsən", ru: "Ходжасан", en: "Khojasan", lat: 40.41193, lng: 49.7685, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "yasamal_mr", az: "Yasamal", ru: "Ясамал", en: "Yasamal", lat: 40.37944, lng: 49.80192, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "zig_mr", az: "Zığ", ru: "Зых", en: "Zig", lat: 40.34275, lng: 49.98038, type: "microrayon", kind: "area", parentId: "baku" },
  { id: "28_may_q", az: "28 May", ru: "28 Мая", en: "28 May", lat: 40.46154, lng: 49.63905, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "bahar_q", az: "Bahar", ru: "Бахар", en: "Bahar", lat: 40.36786, lng: 50.02964, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "balaxani_q", az: "Balaxanı", ru: "Балаханы", en: "Balakhani", lat: 40.4616, lng: 49.92142, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "bilgeh_q", az: "Bilgəh", ru: "Бильгях", en: "Bilgah", lat: 40.57416, lng: 50.04093, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "bine_q", az: "Binə", ru: "Бина", en: "Bine", lat: 40.44889, lng: 50.08939, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "bineqedi_q", az: "Binəqədi", ru: "Бинагади", en: "Binagadi", lat: 40.46792, lng: 49.82802, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "bulbule_q", az: "Bülbülə", ru: "Бюльбюля", en: "Bulbula", lat: 40.43254, lng: 49.97815, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "buzovna_q", az: "Buzovna", ru: "Бузовна", en: "Buzovna", lat: 40.52224, lng: 50.10291, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "cicek_q", az: "Çiçək", ru: "Чичек", en: "Chichak", lat: 40.43888, lng: 49.74993, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "dede_qorqud_q", az: "Dədə Qorqud", ru: "Деде Коркуд", en: "Dada Qorqud", lat: 40.38682, lng: 50.0243, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "dubendi_q", az: "Dübəndi", ru: "Дюбенди", en: "Dubandi", lat: 40.41563, lng: 50.29966, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "ehmedli_q", az: "Əhmədli", ru: "Ахмедли", en: "Ahmedli", lat: 40.38513, lng: 49.94471, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "emircan_q", az: "Əmircan", ru: "Амираджаны", en: "Amirjan", lat: 40.42198, lng: 49.99007, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "gurgan_q", az: "Gürgan", ru: "Гюрган", en: "Gurgan", lat: 40.39689, lng: 50.33447, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "hovsan_q", az: "Hövsan", ru: "Говсан", en: "Hovsan", lat: 40.36687, lng: 50.08086, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "kurdexani_q", az: "Kürdəxanı", ru: "Кюрдаханы", en: "Kurdakhani", lat: 40.5508, lng: 49.91722, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "lokbatan_q", az: "Lökbatan", ru: "Локбатан", en: "Lokbatan", lat: 40.32527, lng: 49.73083, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "mastaga_q", az: "Maştağa", ru: "Маштага", en: "Mastaga", lat: 40.53156, lng: 50.00095, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "merdekan_q", az: "Mərdəkan", ru: "Мардакан", en: "Mardakan", lat: 40.49359, lng: 50.14955, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "musfiqabad_q", az: "Müşfiqabad", ru: "Мушфигабад", en: "Mushfigabad", lat: 40.46875, lng: 49.62179, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "nardaran_q", az: "Nardaran", ru: "Нардаран", en: "Nardaran", lat: 40.55888, lng: 50.00653, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "pirallahi_q", az: "Pirallahı", ru: "Пираллахы", en: "Pirallahi", lat: 40.45918, lng: 50.33399, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "pirsagi_q", az: "Pirşağı", ru: "Пиршаги", en: "Pirshagi", lat: 40.55877, lng: 49.88734, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "puta_q", az: "Puta", ru: "Пута", en: "Puta", lat: 40.29657, lng: 49.66132, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "qala_q", az: "Qala", ru: "Гала", en: "Qala", lat: 40.44413, lng: 50.16317, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "qizildas_q", az: "Qızıldaş", ru: "Кызылдаш", en: "Qizildash", lat: 40.30802, lng: 49.59785, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "ramana_q", az: "Ramana", ru: "Раманы", en: "Ramana", lat: 40.45717, lng: 49.98261, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "sabuncu_q", az: "Sabunçu", ru: "Сабунчи", en: "Sabunchu", lat: 40.44814, lng: 49.93389, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "sagan_q", az: "Şağan", ru: "Шаган", en: "Shaghan", lat: 40.4933, lng: 50.12795, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "sahil_q", az: "Sahil", ru: "Сахиль", en: "Sahil", lat: 40.22704, lng: 49.58053, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "suraxani_q", az: "Suraxanı", ru: "Сураханы", en: "Surakhani", lat: 40.42003, lng: 50.00189, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "suvelan_q", az: "Şüvəlan", ru: "Шувелан", en: "Shuvalan", lat: 40.48674, lng: 50.18397, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "turkan_q", az: "Türkan", ru: "Тюркан", en: "Turkan", lat: 40.36628, lng: 50.21312, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "yeni_balaxani_q", az: "Yeni Balaxanı", ru: "Ени-Балаханы", en: "Yeni Balakhani", lat: 40.47496, lng: 49.91567, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "yeni_kurdexani_q", az: "Yeni Kürdəxanı", ru: "Ени-Кюрдаханы", en: "Yeni Kurdakhani", lat: 40.51087, lng: 49.94004, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "yeni_ramana_sabuncu_q", az: "Yeni Ramana Sabunçu", ru: "Ени-Рамана-Сабунчу", en: "Yeni Ramana Sabunchu", lat: 40.44228, lng: 49.97846, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "yeni_suraxani_q", az: "Yeni Suraxanı", ru: "Ени Сураханы", en: "Yeni Surakhany", lat: 40.4303, lng: 50.03742, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "yeni_turkan_q", az: "Yeni Türkan", ru: "Ени-Тюркан", en: "Yeni Turkan", lat: 40.37509, lng: 50.1767, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "zabrat_q", az: "Zabrat", ru: "Забрат", en: "Zabrat", lat: 40.48122, lng: 49.95258, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "zeferan_q", az: "Zəfəran", ru: "Зафаран", en: "Zafaran", lat: 40.54272, lng: 50.05957, type: "qesebe", kind: "area", parentId: "baku" },
  { id: "zire_q", az: "Zirə", ru: "Зиря", en: "Zire", lat: 40.36692, lng: 50.29053, type: "qesebe", kind: "area", parentId: "baku" },
];

// --- Selectors ---
export const REGIONS = PLACES.filter((p) => p.kind === "region"); // 77 republic units (incl. baku)
export const AREAS = PLACES.filter((p) => p.kind === "area");     // Baku rayon / qəsəbə / microrayon
export const RAYONS = PLACES.filter((p) => p.kind === "area" && p.type === "rayon"); // Baku 12 rayons
export const METRO = PLACES.filter((p) => p.kind === "metro");    // Baku metro

export const placeById = (id?: string | null): Place | undefined =>
  id ? PLACES.find((p) => p.id === id) : undefined;

/** Localized place name with az fallback. */
export const placeName = (p: Place, lang: "az" | "ru" | "en"): string => p[lang] || p.az;

/** Coordinates for a place id; falls back to Baku centre. */
export const coordsForPlace = (id?: string | null): { lat: number; lng: number } => {
  const p = placeById(id);
  return p ? { lat: p.lat, lng: p.lng } : BAKU_CENTER;
};

// Built once at module load: placeId -> its top region id (region = itself,
// area/metro = parentId). O(1) region rollup for filtering (used in заход 3).
const REGION_OF_PLACE: Map<string, string> = new Map(
  PLACES.map((p) => [p.id, p.kind === "region" ? p.id : p.parentId ?? p.id]),
);
export const regionOfPlace = (id?: string | null): string | undefined =>
  id ? REGION_OF_PLACE.get(id) : undefined;

/** Areas (Baku) belonging to a region id. */
export const areasOf = (regionId: string): Place[] => AREAS.filter((p) => p.parentId === regionId);
