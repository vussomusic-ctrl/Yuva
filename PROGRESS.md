# Yuva — Progress / Context Handoff

> Snapshot for continuing work in a new chat. Last feature commit: `259e34a`
> (`feat: tab bar, Profile, Search, Filters, deal-types, language picker`),
> on top of `83bef97` (`feat: build core screens — Splash, Welcome, Create
> Account, Home Feed, Property Detail`).

## What this is
**Yuva** ("nest" in Azerbaijani) — a native mobile app for buying, selling and
renting real estate in **Azerbaijan**. Trilingual: **Azerbaijani (az) / Russian
(ru) / English (en)**. Founder: Vusal (AID Group). Quality target: a polished
marketplace on the level of Bayut / Bina.az / Zillow.

## Tech stack
- **Expo (React Native)** — SDK 56, native iOS + Android from one codebase.
- **Expo Router** — file-based navigation (`app/`).
- **NativeWind v4** — Tailwind for RN (configured; screens currently use RN
  `StyleSheet`-style inline styles with theme tokens).
- **i18next + react-i18next + expo-localization** — trilingual strings.
- **Theme** — LIGHT + DARK ("Obsidian") via tokens; `ThemeProvider` follows the
  system color scheme and exposes `toggleTheme` (for a future Settings screen).
- Planned but NOT yet added: **Supabase** (DB/auth/storage/realtime),
  **react-native-maps**, **EAS Build**.

## Design source
Screens designed in **Google Stitch**, pulled via the **Stitch MCP server**.
Main Stitch project (has all screens): `projects/3844482705456734788`.
The brand/component rules in `CLAUDE.md` override anything inconsistent from Stitch.

## Screens DONE (with file paths)
| Screen | Route / File | Notes |
|---|---|---|
| Splash + language select | `app/index.tsx` (route `/`) | Transparent logo + organic brand glow, az/ru/en picker drives i18n → Welcome |
| Welcome | `app/welcome.tsx` | Single smooth gradient bg, glow, primary/secondary/tertiary buttons, legal footer |
| Create Account | `app/create-account.tsx` | Controlled inputs + validation (email regex, password required), show/hide password, gradient CTA, Google/Apple **stubs** |
| Home Feed | `app/(tabs)/home.tsx` | Logo header + AZ/RU/EN cycle, search, deal chips, category grid, "recommended" carousel, "new listings" feed, favorite toggles |
| Property Detail | `app/property/[id].tsx` | Photo gallery + overlay back/share/favorite, price/specs, description, amenities, **map stub**, fixed seller panel (Message + WhatsApp). Reads listing by `id` |
| Custom bottom tab bar | `components/BottomTabBar.tsx` + `app/(tabs)/_layout.tsx` | Home · Search · Add(center gradient circle, opens `/add-listing` modal) · Chat · Profile. Themeable, no logo |
| Profile | `app/(tabs)/profile.tsx` | Contextual header: avatar (camera upload affordance, **TODO picker**) + name + role. Settings card: My listings / Saved / Language / Settings / dark-mode toggle. Logout → `/welcome`. My-listings/Saved/Settings rows are **TODO stubs** |
| Language picker (bottom-sheet) | `components/BottomSheet.tsx` + `lib/i18n/languages.ts` | `useLanguage()` hook (current/setLanguage/list); az/ru/en selectable from Profile, persists via i18n. Reusable sheet |
| Search Results — List | `app/(tabs)/search.tsx` | Search bar (→ Filters), List/Map `Segmented`, `DealTypeChips`, results count, live text filter over mock `newListings`, feed cards, local favorites. **Map view = "coming soon" placeholder** |
| Advanced Filters | `app/filters.tsx` (modal) | Full UI: deal type, property type, price AZN range, rooms, area, region/district (Baku rayons), floor range, furnished + mortgage toggles. X / title / Clear header, sticky gradient Apply. **Apply currently just closes — does not yet filter results** |

Add Listing (`app/add-listing.tsx`, center-tab modal) exists as a **stub**
("coming soon"); the multi-step flow is not built yet.

Supporting components: `BrandGlow.tsx` (organic radial glow, no SVG),
`PropertyCard.tsx` (carousel + feed variants), `BottomTabBar.tsx`,
`BottomSheet.tsx`, `SearchBar.tsx`, `DealTypeChips.tsx`, `Segmented.tsx`.
Shared data/utils: `lib/dealTypes.ts` (DEALS + DealKey), `lib/mock/regions.ts`
(Baku rayons), `lib/mock/user.ts` (current mock user), `lib/i18n/languages.ts`.

## Project structure
```
yuva-app/
  app/
    _layout.tsx            # root Stack: index, welcome, create-account, (tabs), property/[id], add-listing(modal), filters(modal)
    index.tsx              # Splash (owns "/")
    welcome.tsx
    create-account.tsx
    property/[id].tsx      # Property Detail (dynamic route)
    add-listing.tsx        # Add Listing modal (STUB — center "+" tab)
    filters.tsx            # Advanced Filters modal (DONE UI; apply not wired to results)
    (tabs)/
      _layout.tsx          # uses custom BottomTabBar: Home · Search · Add(center gradient) · Chat · Profile
      home.tsx             # Home Feed (DONE; was index.tsx, moved off "/" so Splash owns it)
      search.tsx           # Search Results — List (DONE; map view = placeholder)
      chat.tsx             # placeholder
      profile.tsx          # Profile (DONE; some rows TODO)
  components/
    BrandGlow.tsx
    PropertyCard.tsx
    BottomTabBar.tsx       # custom themed tab bar w/ center gradient Add button
    BottomSheet.tsx        # reusable bottom-sheet (used by language picker)
    SearchBar.tsx          # search input + filter button
    DealTypeChips.tsx      # Satılır / Kirayə / Sat chips (DealKey)
    Segmented.tsx          # segmented control (List/Map, deal type in Filters)
  lib/
    dealTypes.ts           # DEALS array + DealKey type (sale/rent/...)
    i18n/
      index.ts             # i18next init (default lang = device locale, fallback az)
      languages.ts         # useLanguage() hook: current / setLanguage / language list
      locales/{az,ru,en}.json   # namespaces: tabs, common, splash, welcome, createAccount, home, propertyDetail, profile, search, filters, addListing
    theme/
      colors.ts            # brand, lightTheme, darkTheme, Theme type, bgGradient, brandTitle
      ThemeContext.tsx     # ThemeProvider (system scheme + toggle), useTheme()
    mock/
      listings.ts          # 6 mock listings + getListingDetail(id) + formatPrice (Supabase later)
      regions.ts           # Baku rayons (filters/region data)
      user.ts              # current mock user (Profile)
  assets/yuva-logo.png     # transparent brand logo (Splash + Home header only)
  app.json, tailwind.config.js, metro.config.js, global.css
  CLAUDE.md / AGENTS.md    # project rules
```

## Key rules from CLAUDE.md (must follow)
- **Brand palette (exact hex, never substitute):** Violet `#8B3FD6`, Orange
  `#F5921E`, Magenta `#EC2D8E`, Blue `#2E7FE8`. Light bg `#F7F7F9`, cards
  `#FFFFFF`, text `#1B1B1F`. Dark = uniform near-black Obsidian (`#121212`).
- **Primary brand gradient = violet `#8B3FD6` → magenta `#EC2D8E`** (used for
  PRIMARY buttons, PREMIUM badge, etc.). Do NOT substitute Stitch's `#711ebc`.
- **Logo rules:** transparent PNG only; appears ONLY on Splash and Home header;
  never inside a card/box/oval/plate. All other screens use a contextual header.
- **Button hierarchy:** PRIMARY = solid brand gradient + white text;
  SECONDARY = outlined (violet border + violet text); TERTIARY = violet text link.
- **Theming:** dark is a recolor of light — SAME layouts, gradients stay vibrant,
  one continuous gradient (no hard seam), Obsidian bg edge-to-edge.
- **Currency:** AZN `₼`. **Region data:** Azerbaijan (Baku rayons, etc.).
- Listing titles/descriptions are user-generated → **NOT translated** (stay in the
  seller's language). UI labels (sections, specs, amenities) **are** localized.
- One font family across the app; keep components themeable (no hardcoded colors).

## Connected
- **Stitch MCP server** — design source; screens fetched from project
  `3844482705456734788`.

## Screens REMAINING (MVP)
- **Search Results — Map** (price pins, clustering; needs react-native-maps) — search.tsx map view is a "coming soon" placeholder
- **Add Listing** (multi-step: photos → deal type → property type → details → publish) — currently a stub modal
- **Favorites / saved** (Profile "Saved" row + favorite toggles are local-only, no persistence)
- **Messages** (chat list + conversation; "Написать" on Detail currently → `/chat` stub)
- **Notifications** (price drops, new matches)
- **Wire Filters to results** — Filters UI is built but Apply doesn't filter the Search list yet

## NOT done yet / known gaps
- **Supabase NOT connected.** All data is mocked in `lib/mock/*`
  (no DB, auth, photo storage, or realtime). Google/Apple sign-in, "Message"
  (chat), favorites persistence are stubs. WhatsApp button DOES open `wa.me/...`.
  Map on Property Detail AND on Search are styled placeholders (react-native-maps later).
- **Stubs / not wired:** Add Listing modal ("coming soon"), Profile rows
  My-listings/Saved/Settings + avatar upload (TODOs), and Filters Apply
  (UI complete, but does not filter the Search results yet).
- **git identity NOT configured** — commit author is
  `Vusso <vusso@MacBook-Pro-Vusso.local>`. Set before pushing:
  `git config --global user.name "..."` / `user.email "vusofficial@icloud.com"`,
  then optionally `git commit --amend --reset-author`.
- **NOT pushed to GitHub** — no remote configured; all work is local on `main`.

## Running the app (web preview)
`cd yuva-app && npx expo start --web --port 8081` → open `http://localhost:8081`.
Routes: `/` (Splash), `/welcome`, `/create-account`, `/home`, `/search`,
`/profile`, `/filters`, `/add-listing`, `/property/1`.
Dark theme: toggle macOS appearance or DevTools → Rendering → emulate
`prefers-color-scheme: dark`. Language: AZ/RU/EN pill in the Home header.
