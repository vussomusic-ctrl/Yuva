# Baku & Azerbaijan places — translation status

**All `ru` / `en` filled. 0 outstanding.**

- Missing `ru`: **0**
- Missing `en` (needing transliteration): **0**

Source: OpenStreetMap (Overpass API) + curated forms. `lib/places.ts` has 170
entries (78 regions incl. `baku`, 66 Baku areas, 26 metro).

Notes:
- `ru` for republic rayons keeps the OSM adjectival form ("…ский район"); the
  11 cities use bare names (Гянджа, Сумгаит, …).
- ~29 entries have `en` intentionally **equal** to `az` because the English
  spelling is identical to the Azerbaijani Latin form (e.g. Astara, Quba, Qara
  Qarayev, Nardaran, Buzovna). These are correct, not fallbacks.
- `en` transliteration rules: ə→a, x→kh, ş→sh, ç→ch, c→j, ğ→g, ü→u, ö→o, ı→i;
  `q` kept for regions / metro / proper names (Quba, Qusar, Zaqatala, Qara
  Qarayev), `q→g` for Baku everyday names (Binagadi, Gala).
