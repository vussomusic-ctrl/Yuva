# Yuva — Progress / Context Handoff

> Snapshot for continuing work in a new chat. Last feature commit: `7ee7b2a`
> (`feat: Add Listing multi-step form + shared PROPERTY_TYPES`), on top of
> `7437657` (Notifications), `8d8e83d` (Messages / My listings / Saved),
> `259e34a` (tab bar / Profile / Search / Filters) and `83bef97` (core screens).
>
> **All ~13 MVP screens are now built.** What's left is the Search map, wiring
> polish, and swapping mocks for Supabase (see "REMAINING" + "known gaps").

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
| Home Feed | `app/(tabs)/home.tsx` | Logo header + bell (→ `/notifications`, unread dot) + AZ/RU/EN cycle, search, deal chips, category grid, "recommended" carousel, "new listings" feed, favorite hearts (shared state) |
| Property Detail | `app/property/[id].tsx` | Photo gallery + overlay back/share/favorite, price/specs, description, amenities, **map stub**, fixed seller panel (Message + WhatsApp). Reads listing by `id` |
| Custom bottom tab bar | `components/BottomTabBar.tsx` + `app/(tabs)/_layout.tsx` | Home · Search · Add(center gradient circle, opens `/add-listing` modal) · Chat · Profile. Themeable, no logo |
| Profile | `app/(tabs)/profile.tsx` | Contextual header: avatar (camera upload affordance, **TODO picker**) + name + role. Settings card: My listings (→ `/my-listings`) / Saved (→ `/saved`) / Language / Settings (**TODO**) / dark-mode toggle. Logout → `/welcome` |
| Language picker (bottom-sheet) | `components/BottomSheet.tsx` + `lib/i18n/languages.ts` | `useLanguage()` hook (current/setLanguage/list); az/ru/en selectable from Profile, persists via i18n. Reusable sheet |
| Search Results — List | `app/(tabs)/search.tsx` | Search bar (→ Filters), List/Map `Segmented`, `DealTypeChips`, results count, live text filter over mock `newListings`, feed cards, favorite hearts (shared state). **Map view = "coming soon" placeholder** |
| Advanced Filters | `app/filters.tsx` (modal) | Full UI: deal type, property type, price AZN range, rooms, area, region/district (Baku rayons), floor range, furnished + mortgage toggles. X / title / Clear header, sticky gradient Apply. **Apply currently just closes — does not yet filter results** |
| Messages — chat list | `app/(tabs)/chat.tsx` | Contextual title header (no logo). Mock chats (`lib/mock/chats.ts`): avatar, peer name, one-line last-message preview, time, gradient unread badge. i18n empty state. Tap → conversation |
| Messages — conversation | `app/chat/[id].tsx` | Header back + avatar + peer name. Bubbles: mine right (violet), theirs left (card token), time under each, auto-scroll. Composer + send. **Send is LOCAL-ONLY** (in-memory `useState`, no backend) |
| My listings | `app/my-listings.tsx` | Back + title header. Vertical `PropertyCard` list of the current user's listings (`getListingsByOwner(currentUser.id)`, via `ownerId`). i18n empty state |
| Saved / Favorites | `app/saved.tsx` + `lib/favorites.tsx` | **One screen** (Profile "Saved" = Favorites). `FavoritesProvider`/`useFavorites` shared state (`ids`/`isFavorite`/`toggle`) wraps app in root layout; hearts on Home & Search write to it; Saved list reflects it reactively. i18n empty state. In-memory only (no persistence yet) |
| Notifications | `app/notifications.tsx` + `lib/mock/notifications.ts` | Back + title header (no logo). Entered via bell in Home header. Mock list of 3 types — `price_drop` (old→new ₼, listing preview), `new_match` (saved-search match), `message` (peer + preview); each with brand-colored icon, neutral time, unread row tint + magenta dot. Tap → `/property/[id]` (drop/match) or `/chat/[id]` (message); marks read in local state. i18n empty state |
| Add Listing | `app/add-listing.tsx` (modal) | 4-step flow with progress bar (`n/4`) + X-close header. **1** Photos (grid; adds from `lib/mock/photos.ts` since web file-picker is unreliable; cover badge; ≥1 required). **2** Deal type + property type (`Segmented`, shared `DEALS` / `PROPERTY_TYPES`). **3** Details (title, price ₼, area, rooms/floor/floorTotal hidden for land, region via `BottomSheet`, description, furnished/mortgage). **4** Preview (`PropertyCard` + summary). Per-step validation gates Next. Publish → `addListing()` (owner = current user) → toast → `/my-listings`. **In-memory only** |

Supporting components: `BrandGlow.tsx` (organic radial glow, no SVG),
`PropertyCard.tsx` (carousel + feed variants), `BottomTabBar.tsx`,
`BottomSheet.tsx`, `SearchBar.tsx`, `DealTypeChips.tsx`, `Segmented.tsx`,
`Button.tsx` (`PrimaryButton` gradient / `SecondaryButton` outline — reusable).
Shared state/data/utils: `lib/favorites.tsx` (FavoritesProvider + useFavorites,
app-wide saved set), `lib/dealTypes.ts` (DEALS + DealKey), `lib/propertyTypes.ts`
(PROPERTY_TYPES — shared by Filters + Add Listing), `lib/mock/regions.ts`
(Baku rayons), `lib/mock/user.ts` (current mock user), `lib/mock/chats.ts` (mock
conversations), `lib/mock/photos.ts` (stock listing photos), `lib/i18n/languages.ts`.
`lib/mock/listings.ts` has an `ownerId` per listing + `getListingsByOwner` /
`getListingById` / `addListing` helpers.
`lib/mock/notifications.ts` (mock notifications + `hasUnreadNotifications`).

## Project structure
```
yuva-app/
  app/
    _layout.tsx            # root Stack: index, welcome, create-account, (tabs), property/[id], chat/[id], my-listings, saved, notifications, add-listing(modal), filters(modal). Wraps app in FavoritesProvider
    index.tsx              # Splash (owns "/")
    welcome.tsx
    create-account.tsx
    property/[id].tsx      # Property Detail (dynamic route)
    chat/[id].tsx          # Messages — conversation (DONE; send is local-only)
    my-listings.tsx        # My listings (DONE)
    saved.tsx              # Saved / Favorites (DONE; shared favorites state)
    notifications.tsx      # Notifications (DONE; entered via Home bell)
    add-listing.tsx        # Add Listing 4-step modal (DONE; center "+" tab; in-memory)
    filters.tsx            # Advanced Filters modal (DONE UI; apply not wired to results)
    (tabs)/
      _layout.tsx          # uses custom BottomTabBar: Home · Search · Add(center gradient) · Chat · Profile
      home.tsx             # Home Feed (DONE; was index.tsx, moved off "/" so Splash owns it)
      search.tsx           # Search Results — List (DONE; map view = placeholder)
      chat.tsx             # Messages — chat list (DONE)
      profile.tsx          # Profile (DONE; Settings row + avatar upload still TODO)
  components/
    BrandGlow.tsx
    PropertyCard.tsx
    BottomTabBar.tsx       # custom themed tab bar w/ center gradient Add button
    BottomSheet.tsx        # reusable bottom-sheet (used by language picker)
    SearchBar.tsx          # search input + filter button
    DealTypeChips.tsx      # Satılır / Kirayə / Sat chips (DealKey)
    Segmented.tsx          # segmented control (List/Map, deal type in Filters)
    Button.tsx             # PrimaryButton (gradient) / SecondaryButton (outline)
  lib/
    favorites.tsx          # FavoritesProvider + useFavorites (app-wide saved set)
    dealTypes.ts           # DEALS array + DealKey type (sale/rent/...)
    propertyTypes.ts       # PROPERTY_TYPES (shared by Filters + Add Listing)
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

All ~13 canonical MVP screens are built. What's left:

- **Search Results — Map** (price pins, clustering; needs react-native-maps) — the only unbuilt screen; search.tsx map view is a "coming soon" placeholder
- **Wiring polish** (UI exists, behaviour not connected):
  - **Filters → results** — Filters Apply doesn't filter the Search list yet
  - **"Message" button → conversation** — Property Detail's Message/"Yaz" goes to the `/chat` tab; should open/create the listing's conversation (`/chat/[id]`)
  - **Home bell ↔ read state** — the bell's unread dot is static (`hasUnreadNotifications` from the mock) and doesn't update when notifications are marked read; needs shared notifications state (like `useFavorites`)
- **Supabase** — replace all `lib/mock/*` with real DB/auth/storage/realtime; persist favorites, chat messages, listings/owners (Add Listing), notifications

## NOT done yet / known gaps
- **Supabase NOT connected.** All data is mocked in `lib/mock/*`
  (no DB, auth, photo storage, or realtime). Google/Apple sign-in is a stub.
  WhatsApp button DOES open `wa.me/...`. Map on Property Detail AND on Search
  are styled placeholders (react-native-maps later).
- **In-memory only (lost on reload):** Favorites/Saved (shared `useFavorites`
  state), chat messages (conversation send appends to local `useState`),
  published listings (Add Listing → `addListing()` prepends to the in-memory
  feed), and notification read-state (local to the screen; Home bell dot static).
- **Stubs / not wired:** Profile Settings row + avatar upload (TODOs), Filters
  Apply (UI complete, doesn't filter results yet), and Property Detail's Message
  button (→ `/chat` tab, not the listing's conversation). Add Listing photos use
  a stock set (no real `expo-image-picker` / upload yet).
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
