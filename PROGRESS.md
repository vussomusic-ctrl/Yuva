# Yuva — Progress / Context Handoff

> Snapshot for continuing work in a new chat. Last feature commit: `06489c4`
> (`feat: Baku places directory (OSM) — id-based matching, on-the-fly trilingual
> titles, metro picker, Район label`), on top of `878c5e3` (map picker),
> `27ebb0e` (build-type/baths/phone), `eb3709a` (contacts/sort/filters).
>
> **All ~13 MVP screens are now built (incl. Search map + Settings).** Baku has a
> real OSM **places directory** (`lib/places.ts`); listing titles are generated
> **on the fly** per UI language (no stored title). What's left: fill ru/en place
> translations, all-Azerbaijan hierarchy (phase 2), wiring polish, Supabase.

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
- **react-native-maps** 1.27.2 — Search map (price pins) + Add Listing map picker; native only (web fallback).
- **expo-location** ~56.0.16 — device location for the Map Picker start centre.
- Planned but NOT yet added: **Supabase** (DB/auth/storage/realtime), **EAS Build**.

## Design source
Screens designed in **Google Stitch**, pulled via the **Stitch MCP server**.
Main Stitch project (has all screens): `projects/3844482705456734788`.
The brand/component rules in `CLAUDE.md` override anything inconsistent from Stitch.

## Screens DONE (with file paths)
| Screen | Route / File | Notes |
|---|---|---|
| Splash + language select | `app/index.tsx` (route `/`) | Transparent logo + organic brand glow, az/ru/en picker drives i18n → Welcome |
| Welcome | `app/welcome.tsx` | Single smooth gradient bg, glow, primary/secondary/tertiary buttons, legal footer |
| Create Account | `app/create-account.tsx` | Controlled inputs + validation (name, email regex, **phone +994 required**, password), show/hide password, gradient CTA, Google/Apple **stubs**. Phone is UI-only (persists with Supabase later) |
| Home Feed | `app/(tabs)/home.tsx` | Header = logo (left) + bell (→ `/notifications`, unread dot) + AZ/RU/EN pill (no hamburger menu). Search, deal chips, **tappable category tiles** (Apartments/Houses/Land/Objects → set `propertyTypes` + carry deal type into `filters-state`, jump to Search), "recommended" carousel, "new listings" feed, favorite hearts (shared state) |
| Property Detail | `app/property/[id].tsx` | Photo gallery + overlay back/share/favorite, price/specs, description, amenities, **map stub**, fixed seller panel with **3 contact actions** — Call (`tel:`), WhatsApp (`wa.me` + prefilled i18n text w/ title+price), Message (chat). Uses `listing.ownerPhone`; `.catch` keeps web safe. Reads listing by `id` |
| Custom bottom tab bar | `components/BottomTabBar.tsx` + `app/(tabs)/_layout.tsx` | Home · Search · Add(center gradient circle, opens `/add-listing` modal) · Chat · Profile. Themeable, no logo |
| Profile | `app/(tabs)/profile.tsx` | Contextual header: avatar (camera upload affordance, **TODO picker**) + name + role. Settings card: My listings (→ `/my-listings`) / Saved (→ `/saved`) / Language / Settings (→ `/settings`) / dark-mode toggle. Logout → `/welcome` |
| Language picker (bottom-sheet) | `components/BottomSheet.tsx` + `lib/i18n/languages.ts` | `useLanguage()` hook (current/setLanguage/list); az/ru/en selectable from Profile, persists via i18n. Reusable sheet |
| Search Results — List | `app/(tabs)/search.tsx` | Search bar (→ Filters, with active-filter count badge), List/Map `Segmented`, `DealTypeChips` (bound to shared `filters.dealType`), **Sort** button → `BottomSheet` (default / price ↑ / price ↓ / newest by `createdAt`; local `useState`, applied on top of filters), live results count, real filtering (`filterListings` + text query) over mock `newListings`, feed cards, favorite hearts. i18n empty state |
| Search Results — Map | `components/SearchMap.tsx` (+ `.web.tsx`) | `react-native-maps` 1.27.2 centred on Baku. Price-pin markers for the SAME filtered set as the list; tap pin → mini preview card → Property Detail. Pins/preview use theme + brand tokens. **Web fallback** (`.web.tsx`) shows a themed placeholder — native module isn't bundled for web, browser doesn't crash. No clustering yet |
| Advanced Filters | `app/filters.tsx` (modal) | Full UI: deal type, property type, **build type (New build / Secondary, single-select + reset)**, price AZN range, rooms, **baths (1/2/3/4+)**, **Район** (multi-chips from `AREAS`), **Metro** (multi-chips from `METRO`), floor range, furnished + mortgage toggles. X / title / Clear header, sticky gradient Apply. **Wired to results** via `lib/filters-state.tsx` (id-based matching on `regionId`/`metroId`). Apply commits draft, Clear resets facets. *(Chips → searchable sheet is a planned phase-2 polish.)* |
| Messages — chat list | `app/(tabs)/chat.tsx` | Contextual title header (no logo). Mock chats (`lib/mock/chats.ts`): avatar, peer name, one-line last-message preview, time, gradient unread badge. i18n empty state. Tap → conversation |
| Messages — conversation | `app/chat/[id].tsx` | Header back + avatar + peer name. Bubbles: mine right (violet), theirs left (card token), time under each, auto-scroll. Composer + send. **Send is LOCAL-ONLY** (in-memory `useState`, no backend) |
| My listings | `app/my-listings.tsx` | Back + title header. Vertical `PropertyCard` list of the current user's listings (`getListingsByOwner(currentUser.id)`, via `ownerId`). i18n empty state |
| Saved / Favorites | `app/saved.tsx` + `lib/favorites.tsx` | **One screen** (Profile "Saved" = Favorites). `FavoritesProvider`/`useFavorites` shared state (`ids`/`isFavorite`/`toggle`) wraps app in root layout; hearts on Home & Search write to it; Saved list reflects it reactively. i18n empty state. In-memory only (no persistence yet) |
| Notifications | `app/notifications.tsx` + `lib/mock/notifications.ts` | Back + title header (no logo). Entered via bell in Home header. Mock list of 3 types — `price_drop` (old→new ₼, listing preview), `new_match` (saved-search match), `message` (peer + preview); each with brand-colored icon, neutral time, unread row tint + magenta dot. Tap → `/property/[id]` (drop/match) or `/chat/[id]` (message); marks read in local state. i18n empty state |
| Add Listing | `app/add-listing.tsx` (modal) | 4-step flow with progress bar (`n/4`) + X-close header. **1** Photos (stock set via `lib/mock/photos.ts`; cover badge; ≥1 required). **2** Deal type + property type + **build type** (hidden for land). **3** Details — **auto-title live preview** (no manual title field), price ₼, area, rooms/baths + floor/floorTotal (hidden for land), **Район via `PlacePickerSheet`** (search, single-select, from `AREAS`), **Metro** (optional, `PlacePickerSheet`, clearable), **map pin via Map Picker** (overrides place centre), **contact phone +994**, description, furnished/mortgage. **4** Preview (`PropertyCard` + summary). Validation: place OR pin, price/area, phone ≥ 9 digits. Publish → `addListing()` (`regionId`/`metroId`, coords = pin ?? `coordsForPlace`, `createdAt = now`) → toast → `/my-listings`. **No stored title** (derived). In-memory |
| Map Picker | `app/map-picker.tsx` (+ `.web.tsx`) | Fixed centre crosshair over `MapView` (PROVIDER_DEFAULT / Apple Maps, no key); map pans under the pin, coord from `onRegionChangeComplete` (Uber/Bolt pattern). Header X + title, hint chip, sticky «Set here» (gradient). Start centre: prev pin → `coordsForPlace(regionId)` → else `expo-location` (within AZ bbox, else `BAKU_CENTER`). Returns coord to the still-mounted Add Listing via `lib/map-pick.tsx` (`useMapPick`); `clear()` runs only on form mount. **Web fallback** = themed placeholder (no native module) |
| Settings | `app/settings.tsx` | Back + title header (no logo), reached from Profile → Settings. Sections: **Notifications** (3 local-state toggles: new matches / price drops / messages), **Account** (Edit profile / Change phone-email / Delete account [red] — stub rows), **About** (Version from `expo-constants`, Terms / Privacy / Support — stubs). Language & Theme intentionally NOT duplicated (live in Profile) |

Supporting components: `BrandGlow.tsx` (organic radial glow, no SVG),
`PropertyCard.tsx` (carousel + feed variants), `BottomTabBar.tsx`,
`BottomSheet.tsx`, `SearchBar.tsx`, `DealTypeChips.tsx`, `Segmented.tsx`,
`Button.tsx` (`PrimaryButton` gradient / `SecondaryButton` outline — reusable),
`SearchMap.tsx` + `SearchMap.web.tsx` (native price-pin map / web placeholder),
`PlacePickerSheet.tsx` (search + single-select sheet for Район/Metro).
Shared state/data/utils: `lib/favorites.tsx` (FavoritesProvider + useFavorites),
`lib/filters-state.tsx` (FiltersProvider + useFilters + `filterListings` /
`activeFilterCount`; id-based region/metro matching), `lib/places.ts` (**Baku
places directory from OSM** — `Place {id,az,ru,en,lat,lng,type}`, `AREAS` /
`RAYONS` / `METRO`, `placeById` / `placeName` / `coordsForPlace`, `BAKU_CENTER`;
92 entries), `lib/listingTitle.ts` (`buildListingTitle(listing,t,lang)` — derives
title on the fly, no verb), `lib/dealTypes.ts`, `lib/propertyTypes.ts`,
`lib/buildTypes.ts`, `lib/map-pick.tsx`, `lib/mock/user.ts`, `lib/mock/chats.ts`,
`lib/mock/photos.ts`, `lib/i18n/languages.ts`. *(`lib/mock/regions.ts` removed —
superseded by `lib/places.ts`.)*
`lib/mock/listings.ts` listings carry `regionId` (+ opt `metroId`) → `places.ts`,
`dealType` / `propertyType` / `buildType` / `baths` / `furnished` / `mortgage`
(filters) + `ownerPhone` + `createdAt` + `lat` / `lng`. **No `title` field** — the
title is generated on the fly via `buildListingTitle`. Helpers: `getListingById` /
`getListingsByOwner` / `addListing`.
`lib/mock/notifications.ts` (mock notifications + `hasUnreadNotifications`).

## Project structure
```
yuva-app/
  app/
    _layout.tsx            # root Stack: index, welcome, create-account, (tabs), property/[id], chat/[id], my-listings, saved, notifications, settings, add-listing(modal), filters(modal), map-picker(modal). Wraps app in FavoritesProvider + FiltersProvider + MapPickProvider
    index.tsx              # Splash (owns "/")
    welcome.tsx
    create-account.tsx
    property/[id].tsx      # Property Detail (dynamic route)
    chat/[id].tsx          # Messages — conversation (DONE; send is local-only)
    my-listings.tsx        # My listings (DONE)
    saved.tsx              # Saved / Favorites (DONE; shared favorites state)
    notifications.tsx      # Notifications (DONE; entered via Home bell)
    settings.tsx           # Settings (DONE; reached from Profile; local-state toggles + stub rows)
    add-listing.tsx        # Add Listing 4-step modal (DONE; center "+" tab; in-memory)
    map-picker.tsx         # Map Picker (DONE; crosshair pin) + .web.tsx fallback
    filters.tsx            # Advanced Filters modal (DONE; wired to Search via filters-state)
    (tabs)/
      _layout.tsx          # uses custom BottomTabBar: Home · Search · Add(center gradient) · Chat · Profile
      home.tsx             # Home Feed (DONE; was index.tsx, moved off "/" so Splash owns it)
      search.tsx           # Search Results — List + Map (DONE; real filtering; map = SearchMap)
      chat.tsx             # Messages — chat list (DONE)
      profile.tsx          # Profile (DONE; Settings row + avatar upload still TODO)
  components/
    BrandGlow.tsx
    PropertyCard.tsx
    BottomTabBar.tsx       # custom themed tab bar w/ center gradient Add button
    BottomSheet.tsx        # reusable bottom-sheet (used by language picker)
    SearchBar.tsx          # search input + filter button (active-filter badge)
    SearchMap.tsx          # native price-pin map (react-native-maps)
    SearchMap.web.tsx      # web fallback placeholder (no native module)
    DealTypeChips.tsx      # Satılır / Kirayə / Sat chips (DealKey)
    Segmented.tsx          # segmented control (List/Map, deal type in Filters)
    Button.tsx             # PrimaryButton (gradient) / SecondaryButton (outline)
    PlacePickerSheet.tsx   # search + single-select sheet (Район / Metro in Add Listing)
  lib/
    favorites.tsx          # FavoritesProvider + useFavorites (app-wide saved set)
    filters-state.tsx      # FiltersProvider + useFilters + filterListings (id-based)
    map-pick.tsx           # MapPickProvider + useMapPick (returns picked coord to Add Listing)
    places.ts              # Baku places directory (OSM): Place[], AREAS/RAYONS/METRO, placeById/placeName/coordsForPlace, BAKU_CENTER
    listingTitle.ts        # buildListingTitle(listing,t,lang) — on-the-fly trilingual title
    dealTypes.ts           # DEALS array + DealKey type (sale/rent/...)
    propertyTypes.ts       # PROPERTY_TYPES (shared by Filters + Add Listing)
    buildTypes.ts          # BUILD_TYPES + BuildKey (new / secondary)
    i18n/
      index.ts             # i18next init (default lang = device locale, fallback az)
      languages.ts         # useLanguage() hook: current / setLanguage / language list
      locales/{az,ru,en}.json   # namespaces: …, filters, addListing, mapPicker, listingTitle, messages, myListings, saved, notifications, settings
    theme/
      colors.ts            # brand, lightTheme, darkTheme, Theme type, bgGradient, brandTitle
      ThemeContext.tsx     # ThemeProvider (system scheme + toggle), useTheme()
    mock/
      listings.ts          # mock listings (regionId/metroId, no title) + getListingDetail/getListingById/getListingsByOwner/addListing + formatPrice
      user.ts              # current mock user (Profile)
      chats.ts             # mock conversations (Messages)
      notifications.ts     # mock notifications (price_drop / new_match / message)
      photos.ts            # stock listing photos (Add Listing on web)
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

## Work REMAINING

All ~13 canonical MVP screens are built (incl. Search map). What's left:

- **Finish Baku place translations** — fill `ru` / `en` for entries that fall back
  to az in `lib/places.ts` (Nərimanov + most qəsəbə/metro). Full checklist:
  `docs/places-translations-todo.md` (26 missing ru, 63 missing en).
- **Interactive map on Property Detail** — the detail map is still a styled stub;
  tapping the pin should open a full map with the listing's `lat`/`lng`.
- **Places phase 2 — all-Azerbaijan hierarchy** — extend `lib/places.ts` to
  City/region → district/settlement (`parentId`); ~77 top-level rayon/şəhər now,
  settlements of non-Baku regions on demand. UX: search on top, cascade, Baku
  first, metro as its own block. (Filter chips → searchable multi-select sheet.)
- **Wiring polish** (UI exists, behaviour not connected):
  - **"Message" button → conversation** — Property Detail's Message/"Yaz" goes to the `/chat` tab; should open/create the listing's conversation (`/chat/[id]`)
  - **Home bell ↔ read state** — the bell's unread dot is static (`hasUnreadNotifications` from the mock) and doesn't update when notifications are marked read; needs shared notifications state (like `useFavorites`)
- **Search map nice-to-haves:** marker clustering on zoom-out (skipped — not bundled with SDK), and an Android dark `customMapStyle` (pins/preview already themed).
- **Supabase** — replace all `lib/mock/*` with real DB/auth/storage/realtime; persist favorites, session-only filters, chat messages, listings/owners (Add Listing), notifications
- **Google Maps API key for production Android** — `react-native-maps` needs the config-plugin key (`androidGoogleMapsApiKey` in `app.json`) for a release Android build; iOS uses Apple Maps (no key). Not needed for dev / Expo Go.

## NOT done yet / known gaps
- **Supabase NOT connected.** All data is mocked in `lib/mock/*`
  (no DB, auth, photo storage, or realtime). Google/Apple sign-in is a stub.
  WhatsApp button DOES open `wa.me/...`. Map on Property Detail is still a
  styled placeholder (the Search map is real via react-native-maps).
- **In-memory only (lost on reload):** Favorites/Saved (shared `useFavorites`
  state), chat messages (conversation send appends to local `useState`),
  published listings (Add Listing → `addListing()` prepends to the in-memory
  feed), notification read-state (local), Settings toggles (local `useState`),
  and the signup phone field. Active Search filters are session-only.
- **Stubs / not wired:** Profile avatar upload (TODO); Property Detail's Message
  button (→ `/chat` tab, not the listing's conversation); Settings Account rows
  (Edit profile / Change contact / Delete account) and About rows (Terms /
  Privacy / Support) are placeholders. Add Listing photos use a stock set
  (no real `expo-image-picker` / upload yet).
- **(CLOSED `27ebb0e`)** Add Listing now captures `buildType` (New/Secondary,
  hidden for land), `baths`, and a required contact phone — published listings
  filter correctly by build-type / baths and Call/WhatsApp use the real number.
  `createdAt = now` (sorts as newest).
- **git identity** — now set globally to `Vusso <vussomusic@gmail.com>` (commits
  from `7437657` onward). Earlier commits keep the old
  `Vusso <vusso@MacBook-Pro-Vusso.local>` author (not reset).
- **GitHub:** pushed to `origin` (https://github.com/vussomusic-ctrl/Yuva), branch
  `main` tracks `origin/main`; auth via `gh` credential helper.

## Running the app (web preview)
`cd yuva-app && npx expo start --web --port 8081` → open `http://localhost:8081`.
Routes: `/` (Splash), `/welcome`, `/create-account`, `/home`, `/search`,
`/profile`, `/chat`, `/chat/c1`, `/my-listings`, `/saved`, `/notifications`,
`/filters`, `/add-listing`, `/property/1`.
Dark theme: toggle macOS appearance or DevTools → Rendering → emulate
`prefers-color-scheme: dark`. Language: AZ/RU/EN pill in the Home header.
