# Yuva — Progress / Context Handoff

> Snapshot for continuing work in a new chat. Last feature commit: `eb3709a`
> (`feat: listing contact actions (call/whatsapp), search sort, build-type &
> baths filters + i18n fixes`), on top of `a00326f` (home category filters /
> phone field / settings), `fd6f478` (Search map), `7c66163` (Filters→results).
>
> **All ~13 MVP screens are now built (incl. Search map + Settings).** What's
> left is wiring polish + swapping mocks for Supabase (see "REMAINING" + "gaps").

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
- **react-native-maps** 1.27.2 — Search map (price pins), native only (web fallback).
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
| Advanced Filters | `app/filters.tsx` (modal) | Full UI: deal type, property type, **build type (New build / Secondary, single-select + reset)**, price AZN range, rooms, **baths (1/2/3/4+)**, area, region/district (Baku rayons), floor range, furnished + mortgage toggles. X / title / Clear header, sticky gradient Apply. **Wired to results** via `lib/filters-state.tsx` — Apply commits the draft, Clear resets narrowing facets (keeps deal type), applies immediately. `buildType` from shared `lib/buildTypes.ts` |
| Messages — chat list | `app/(tabs)/chat.tsx` | Contextual title header (no logo). Mock chats (`lib/mock/chats.ts`): avatar, peer name, one-line last-message preview, time, gradient unread badge. i18n empty state. Tap → conversation |
| Messages — conversation | `app/chat/[id].tsx` | Header back + avatar + peer name. Bubbles: mine right (violet), theirs left (card token), time under each, auto-scroll. Composer + send. **Send is LOCAL-ONLY** (in-memory `useState`, no backend) |
| My listings | `app/my-listings.tsx` | Back + title header. Vertical `PropertyCard` list of the current user's listings (`getListingsByOwner(currentUser.id)`, via `ownerId`). i18n empty state |
| Saved / Favorites | `app/saved.tsx` + `lib/favorites.tsx` | **One screen** (Profile "Saved" = Favorites). `FavoritesProvider`/`useFavorites` shared state (`ids`/`isFavorite`/`toggle`) wraps app in root layout; hearts on Home & Search write to it; Saved list reflects it reactively. i18n empty state. In-memory only (no persistence yet) |
| Notifications | `app/notifications.tsx` + `lib/mock/notifications.ts` | Back + title header (no logo). Entered via bell in Home header. Mock list of 3 types — `price_drop` (old→new ₼, listing preview), `new_match` (saved-search match), `message` (peer + preview); each with brand-colored icon, neutral time, unread row tint + magenta dot. Tap → `/property/[id]` (drop/match) or `/chat/[id]` (message); marks read in local state. i18n empty state |
| Add Listing | `app/add-listing.tsx` (modal) | 4-step flow with progress bar (`n/4`) + X-close header. **1** Photos (grid; adds from `lib/mock/photos.ts` since web file-picker is unreliable; cover badge; ≥1 required). **2** Deal type + property type (`Segmented`, shared `DEALS` / `PROPERTY_TYPES`). **3** Details (title, price ₼, area, rooms/floor/floorTotal hidden for land, region via `BottomSheet`, description, furnished/mortgage). **4** Preview (`PropertyCard` + summary). Per-step validation gates Next. Publish → `addListing()` (owner = current user) → toast → `/my-listings`. **In-memory only** |
| Settings | `app/settings.tsx` | Back + title header (no logo), reached from Profile → Settings. Sections: **Notifications** (3 local-state toggles: new matches / price drops / messages), **Account** (Edit profile / Change phone-email / Delete account [red] — stub rows), **About** (Version from `expo-constants`, Terms / Privacy / Support — stubs). Language & Theme intentionally NOT duplicated (live in Profile) |

Supporting components: `BrandGlow.tsx` (organic radial glow, no SVG),
`PropertyCard.tsx` (carousel + feed variants), `BottomTabBar.tsx`,
`BottomSheet.tsx`, `SearchBar.tsx`, `DealTypeChips.tsx`, `Segmented.tsx`,
`Button.tsx` (`PrimaryButton` gradient / `SecondaryButton` outline — reusable),
`SearchMap.tsx` + `SearchMap.web.tsx` (native price-pin map / web placeholder).
Shared state/data/utils: `lib/favorites.tsx` (FavoritesProvider + useFavorites,
app-wide saved set), `lib/filters-state.tsx` (FiltersProvider + useFilters +
`filterListings` / `activeFilterCount` — shared Search filter state, wraps app in
root layout), `lib/dealTypes.ts` (DEALS + DealKey), `lib/propertyTypes.ts`
(PROPERTY_TYPES — shared by Filters + Add Listing), `lib/buildTypes.ts`
(BUILD_TYPES + BuildKey — new build / secondary), `lib/mock/regions.ts`
(Baku rayons), `lib/mock/user.ts` (current mock user), `lib/mock/chats.ts` (mock
conversations), `lib/mock/photos.ts` (stock listing photos), `lib/i18n/languages.ts`.
`lib/mock/listings.ts` listings now carry `dealType` / `propertyType` /
`buildType` / `baths` / `furnished` / `mortgage` (faceted for filters) +
`ownerPhone` (call/WhatsApp) + `createdAt` (sort) + `lat` / `lng` (map pins) +
`ownerId`, with `getListingsByOwner` / `getListingById` / `addListing` helpers.
`lib/mock/regions.ts` also exports `BAKU_CENTER` / `rayonCoords` / `coordsForDistrict`.
`lib/mock/notifications.ts` (mock notifications + `hasUnreadNotifications`).

## Project structure
```
yuva-app/
  app/
    _layout.tsx            # root Stack: index, welcome, create-account, (tabs), property/[id], chat/[id], my-listings, saved, notifications, settings, add-listing(modal), filters(modal). Wraps app in FavoritesProvider + FiltersProvider
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
  lib/
    favorites.tsx          # FavoritesProvider + useFavorites (app-wide saved set)
    filters-state.tsx      # FiltersProvider + useFilters + filterListings/activeFilterCount
    dealTypes.ts           # DEALS array + DealKey type (sale/rent/...)
    propertyTypes.ts       # PROPERTY_TYPES (shared by Filters + Add Listing)
    buildTypes.ts          # BUILD_TYPES + BuildKey (new / secondary)
    i18n/
      index.ts             # i18next init (default lang = device locale, fallback az)
      languages.ts         # useLanguage() hook: current / setLanguage / language list
      locales/{az,ru,en}.json   # namespaces: tabs, common, splash, welcome, createAccount, home, propertyDetail, profile, search, filters, addListing, messages, myListings, saved, notifications
    theme/
      colors.ts            # brand, lightTheme, darkTheme, Theme type, bgGradient, brandTitle
      ThemeContext.tsx     # ThemeProvider (system scheme + toggle), useTheme()
    mock/
      listings.ts          # mock listings (+ownerId) + getListingDetail/getListingById/getListingsByOwner/addListing + formatPrice
      regions.ts           # Baku rayons (filters/region data)
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
- **Add Listing doesn't capture new fields yet (fix next build):** the create
  flow has no inputs for `buildType`, `baths`, or a contact phone — published
  listings get defaults (`buildType:"new"`, `baths:1`, `ownerPhone` placeholder,
  `createdAt: now`). So a user-created listing can't be filtered by build-type /
  baths and shows a placeholder phone for Call/WhatsApp until those fields are
  added to the Add Listing steps.
- **git identity** — now set globally to `Vusso <vussomusic@gmail.com>` (commits
  from `7437657` onward). Earlier commits keep the old
  `Vusso <vusso@MacBook-Pro-Vusso.local>` author (not reset).
- **NOT pushed to GitHub** — no remote configured; all work is local on `main`.

## Running the app (web preview)
`cd yuva-app && npx expo start --web --port 8081` → open `http://localhost:8081`.
Routes: `/` (Splash), `/welcome`, `/create-account`, `/home`, `/search`,
`/profile`, `/chat`, `/chat/c1`, `/my-listings`, `/saved`, `/notifications`,
`/filters`, `/add-listing`, `/property/1`.
Dark theme: toggle macOS appearance or DevTools → Rendering → emulate
`prefers-color-scheme: dark`. Language: AZ/RU/EN pill in the Home header.
