# Baltic Challenges — Product Roadmap

> A gamified Baltic exploration platform, not another generic travel guide.
>
> **Core loop:** Discover → Choose challenge → Go there → Complete → Prove → Earn XP → Unlock badges → Level up → Complete collection → Discover next challenge
>
> Every screen should answer: **"What should I do next?"**

---

## How to use this file

- `- [ ]` = not started / in progress, `- [x]` = done. Tick boxes as work lands.
- Put `🚧` before an item that is in progress, and `⏸️` before one that is parked or deferred.
- Each phase ends with an **Exit criteria** list. Don't call a phase finished until all of its exit criteria are ticked.
- Release milestones (v1.0, v1.1, v1.5, v2.0) at the bottom list which phases they need, plus the release-only tasks.

## Progress overview

| Phase | Name | Est. | Status |
|---|---|---|---|
| 0 | Product Foundation | 1–2 wks | 🟨 In progress |
| 1 | Core MVP | 4–6 wks | 🟨 In progress |
| 2 | Make It Actually Fun | 3–5 wks | 🟨 In progress |
| 3 | Social | 4–6 wks | 🟨 In progress |
| 3.5 | Trust, Safety & Launch Monetization | 2–3 wks | 🟨 In progress |
| 4 | Advanced Exploration | 4–6 wks | ⬜ Not started |
| 5 | Baltic Content Expansion | 3–6 wks (ongoing) | 🟨 In progress |
| 6 | Monetization (full) | — | ⬜ Not started |
| 7 | AI | — | ⬜ Not started |
| 8 | Events & Seasons | — | ⬜ Not started |
| 9 | Community-Created Challenges | — | ⬜ Not started |
| 10 | Business Ecosystem | — | ⬜ Not started |

Status key: ⬜ Not started · 🟨 In progress · ✅ Done

**Tech stack:** React Native + Expo · TypeScript · Backend/API · PostgreSQL (+ PostGIS) · Cloud photo storage · Push notifications · Maps/GPS · Apple/Google auth · Apple/Google subscriptions. Mobile only (iOS + Android).

**As built:** Expo SDK 57 + Expo Router (`apps/mobile`) · Fastify 5 + TypeScript API (`apps/api`) · PostgreSQL 16 + PostGIS 3.4 · Caddy (HTTPS) · all on the OVH VPS at `https://vps-1a18ee51.vps.ovh.net`. Admin dashboard (`apps/admin`, Vite + React) served at `/admin/`. Deploy with `scripts/deploy-api.ps1` (builds the API and admin); verify the live API with `scripts/smoke-test.ps1`.

---

## Phase 0 — Product Foundation (1–2 weeks)

### Brand & design
- [x] Settle on the working name (Baltic Challenges) and list the alternatives: Baltic Quest, Explore Baltics, Baltic Explorer, Baltic Challenge
- [ ] Check that domain names and App Store / Play Store names are available
- [ ] Logo and app icon (first version)
- [ ] 🚧 Design system: colors, typography, spacing, icons, category emoji/icon set (tokens in `constants/theme.ts`, category emoji in the database; needs a designer pass)
- [x] Component library spec: cards, XP bar, badges, buttons, map markers, progress bars
- [ ] Figma: onboarding (5 screens)
- [ ] Figma: Home
- [ ] Figma: Explore / Map
- [ ] Figma: Challenges and Collections
- [ ] Figma: Challenge detail and active GPS challenge mode
- [ ] Figma: Place page
- [ ] Figma: Community feed and post creation
- [ ] Figma: Profile, badges and statistics
- [ ] Figma: Settings, privacy and location controls
- [ ] Clickable prototype of the core loop

### Product specification
- [ ] Product spec document (core loop, 5-tab navigation, MVP scope)
- [x] Main navigation finalized: 🏠 Home · 🗺️ Explore · 🏆 Challenges · 👥 Community · 👤 Profile
- [x] Challenge type definitions (A–I: Visit, Discover, Photo, Collection, Route, Multi-step, Seasonal, Social, Time-limited)
- [x] Category taxonomy: History, Nature, Baltic Coast, Adventure, Photography, Food, Cities, Family
- [x] XP and level curve finalized (see the reference table at the end of this file)
- [ ] 🚧 Level titles and what each level unlocks (titles done; unlocks not defined yet)
- [x] Achievement rules format, i.e. how a badge's trigger condition is expressed
- [x] Safety metadata spec for locations
- [ ] 🚧 Privacy and location policy (approximate locations only, user-controlled; draft served at `/legal/privacy`, needs legal review)

### Architecture
- [x] Choose the backend stack: Node.js + Fastify + PostgreSQL/PostGIS on the OVH VPS
- [ ] 🚧 Choose a maps provider: `react-native-maps` (Apple Maps / Google Maps) for the MVP; revisit MapLibre/Mapbox for offline maps in Phase 4
- [x] Choose photo storage and CDN: VPS disk served by Caddy for now (move to object storage + CDN at scale)
- [x] Choose push notifications: Expo Notifications + Expo Push API (needs an EAS `projectId` before tokens can be issued)
- [ ] Choose subscription handling (RevenueCat, or native StoreKit / Play Billing)
- [ ] Choose analytics and crash reporting (e.g. PostHog / Sentry)
- [ ] 🚧 API architecture document (REST `/v1`, JWT access + rotating refresh tokens; implemented but not yet written up)
- [x] Server-driven content principle: **no challenges hardcoded in the app**

### Data model (database schema)
- [x] User and profile model
- [x] Location / Place model (geo point, country, region, city, safety metadata)
- [x] Challenge model: ID, title, description, category, country, region, location, difficulty, XP, requirements, images, start date, end date, verification type, status
- [x] Challenge step / checkpoint model (for multi-step and route challenges)
- [x] Challenge attempt and completion model (with proof: GPS, photo, timestamp)
- [x] Collection model
- [x] Achievement / badge model and user achievements
- [x] XP ledger (every XP gain recorded as a separate row, never just a counter)
- [x] Post, comment, like, save and report models
- [x] Follow / friend model
- [x] Subscription / entitlement model
- [x] Moderation and audit log model

### Engineering setup
- [ ] 🚧 Git repository and branching strategy (local repo created; no remote or branching strategy yet)
- [x] Expo + TypeScript project scaffold
- [ ] 🚧 Linting, formatting, strict TypeScript (strict TypeScript everywhere; ESLint on the mobile app via `eslint-config-expo`; no Prettier or API lint yet)
- [ ] CI: typecheck, lint and tests on every push
- [ ] EAS Build set up for iOS and Android
- [ ] Separate dev, staging and production environments
- [x] Secrets management (server secrets generated on the VPS in `/etc/baltic-challenges/api.env`, readable only by root and the service)

### Exit criteria
- [ ] ✅ Product specification approved
- [ ] ✅ Figma / mobile UI for the core loop
- [x] ✅ Database schema
- [ ] 🚧 ✅ API architecture
- [ ] ✅ Design system

---

## Phase 1 — Core MVP (4–6 weeks)

> Find a challenge → go there → complete it → earn XP → unlock something.

### Authentication
- [ ] 🚧 Sign in with Apple (server token verification done; needs an Apple Developer account, `APPLE_CLIENT_IDS`, and the app button)
- [ ] 🚧 Sign in with Google (server token verification done; needs Google OAuth client IDs, `GOOGLE_CLIENT_IDS`, and the app button)
- [x] Email sign-in (magic link or password)
- [x] Session handling and secure token storage
- [x] Account deletion in-app (required by the App Store)

### Onboarding
- [x] Screen 1: Welcome — "Explore Latvia, Lithuania & Estonia" → [START EXPLORING]
- [x] Screen 2: Interests (Nature, History, Food, Hiking, Architecture, Beaches, Family, Adventure, Photography, Wildlife, Cycling, Road trips)
- [x] Screen 3: Difficulty (🟢 Casual · 🔵 Explorer · 🟣 Adventurer · 🔴 Extreme)
- [x] Screen 4: Countries (🇱🇻 🇱🇹 🇪🇪, multiple selection)
- [x] Screen 5: Location permission, with the explanation text
- [x] App stays fully usable if location is denied
- [x] Preferences saved and used for recommendations

### Profile (basic)
- [x] Avatar upload (picker + crop in the app, re-encoded to 512 px JPEG on the server)
- [x] Display name
- [x] Level and XP shown
- [x] Edit profile (name, bio, interests, difficulty, countries — in Settings)

### Home
- [x] Greeting header with name, level and XP progress bar
- [x] Today's challenge card
- [x] Nearby challenges ("3 challenges within 20 km")
- [x] Recommended challenges, based on interests, difficulty and country

### Explore / Map
- [x] Full-screen map centered on the user
- [x] Challenge markers with a different icon per category
- [x] Marker tap shows a preview (name, XP, explorer count, START)
- [x] Filters: Nearby, Completed, Uncompleted
- [x] List view as an alternative to the map

### Challenges
- [x] Challenges tab with categories
- [x] Challenge detail screen
- [x] Start a challenge
- [x] Complete a challenge
- [x] XP awarded on completion (server-side)
- [x] Completion celebration screen

### GPS verification
- [x] Type A — Visit: GPS confirms the user is inside the location's radius
- [x] Type B — Discover: reach the location and check in
- [x] Verification radius set per location
- [x] Completion validated on the server, not trusted from the client
- [x] Basic anti-cheat: reject impossible speed between check-ins

### Basic achievements
- [x] 🥾 First Step — complete your first challenge
- [x] 5 challenges completed
- [x] 10 challenges completed
- [x] 25 / 50 / 100 challenges completed

### Basic collections
- [x] 🇱🇻 Discover Latvia
- [x] 🇱🇹 Discover Lithuania
- [x] 🇪🇪 Discover Estonia

### Backend and content
- [x] Challenge / location API
- [x] Geospatial "nearby" query (PostGIS)
- [x] Minimal admin tool or script for adding challenges (`db/seeds/*.sql`, applied with `deploy-api.ps1 -Seed`)
- [x] Seed content: at least 30 challenges per country for testing (94 total: 32 LV, 31 LT, 31 EE; coordinates still need QA)

### Exit criteria
- [ ] 🚧 A new user can sign up, finish onboarding, find a nearby challenge, go there, complete it via GPS and see their XP go up (verified end-to-end against the live API by `smoke-test.ps1`; not yet tested on a phone)
- [ ] Internal TestFlight / Play internal testing build is running

---

## Phase 2 — Make It Actually Fun (3–5 weeks)

> This is where it becomes a game, not just a tourism app.

### Levels and XP
- [x] Full level curve implemented
- [x] Level titles (Newcomer → Explorer → Adventurer → Pathfinder → Trailblazer → Baltic Master)
- [x] Level-up animation and screen (animated celebration with level-up, streak and every reward unlocked)
- [ ] Level unlocks: profile frames
- [ ] Level unlocks: themes
- [ ] Level unlocks: special challenges
- [ ] Level unlocks: extra statistics
- [ ] Level unlocks: collections

### Streaks
- [x] Daily streak counter (Riga calendar days; shown on Home and Profile)
- [x] 🔥 7-day and 30-day streak badges
- [x] Streaks never block progression

### Daily / weekly / monthly challenges
- [x] Daily challenge rotation (challenge of the day gives a +50 XP bonus once per day)
- [ ] 🚧 Weekly challenges (Visit 3 new places and Visit 2 historical locations done; Walk 20 km needs route tracking, Photograph 5 landmarks needs photo challenges — Phase 4)
- [x] Weekly challenge card on Home with a progress bar
- [x] Monthly challenges (Baltic Explorer of the month: 10 challenges / 2,000 XP; Three regions: 750 XP)
- [x] Scheduled resets (goals are computed over the current Riga ISO week / month, so they reset automatically)

### Badges and achievements
- [x] Badge grid on the profile
- [x] Locked and unlocked badge states with progress
- [x] 🏰 Castle Hunter (5 castles) and 🏰 Castle Master (25 castles)
- [x] 🌊 Baltic Coast (10 coastal locations)
- [x] 🌅 Early Bird (complete a challenge between 04:00 and 08:00)
- [x] 🌙 Night Explorer (complete a challenge between 21:00 and 03:00)
- [x] 🚗 Road Warrior (10 cities)
- [x] 🇱🇻 Latvia Explorer, 🇱🇹 Lithuania Explorer, 🇪🇪 Estonia Explorer
- [x] Baltic Explorer (all three countries)
- [x] Achievement rules engine that is data-driven, so new badges don't need an app update

### Collections
- [x] Collection screen: progress bar, XP reward, completion badge
- [x] Visual cards showing ✓ completed and 🔒 locked items
- [ ] 🚧 Specialist collections: 🏰 Castles, 🌊 Coast, 🌲 Nature, 🏛️ Historic Cities, 🗼 Lighthouses, 🌅 Viewpoints, 🥾 Hiking, 🚲 Cycling, 📸 Photography, 🐾 Wildlife (Castles, Coast, Manors, Sacred Places, Falls & Cliffs, and Rīga / Vilnius / Tallinn highlights exist)
- [ ] Type D — Collection challenge (several locations counting toward one challenge)

### Progress tracking
- [x] Challenge history screen
- [x] "Continue" card on Home for started challenges (e.g. "Gauja Adventure 3 / 7")
- [x] Country completion % on the profile (🇱🇻 32% · 🇱🇹 8% · 🇪🇪 4%)
- [x] Basic statistics: challenges completed, places visited, countries, photos

### Notifications (first version)
- [x] Push notification permission requested at a sensible moment, not on first launch (after the first completion)
- [x] "You're 100 XP away from Level 10" (sent once per level)
- [x] "Your weekly challenge ends tomorrow" (Saturday evening, only for started goals)
- [x] Per-type notification settings and a frequency cap so users aren't spammed (progress / social / new challenges toggles; at most one progress push per day, evening job at 18:30 Riga time)

### Exit criteria
- [ ] 🚧 Users have a reason to come back daily and weekly (streaks, daily bonus, weekly / monthly goals and reminders are live; confirm with beta retention)
- [x] Every completion visibly moves at least one progress bar (level, collection, weekly or badge)

---

## Phase 3 — Social (4–6 weeks)

> The app starts generating its own content.

### Profiles and relationships
- [x] Public user profiles (respecting public / friends / private)
- [x] Follow / unfollow
- [x] Friends (mutual follow)
- [ ] 🚧 Friend search and invite links (search by name done; invite links need a public web domain / deep links)
- [ ] Compare progress with a friend

### Posts
- [x] 📸 Adventure post (photo + location + challenge; a challenge can only be attached if you completed it)
- [x] 🏆 Achievement post (offered on the completion screen and from any unlocked badge)
- [x] 📍 Discovery post
- [x] Photo upload with compression and EXIF/GPS stripping (resized in the app, re-encoded and stripped again on the server)
- [x] Location on posts is approximate and can be turned off per post ("Place, City, Country" label only)

### Community feed
- [x] Following / friends feed
- [ ] 🚧 Nearby / Baltic-wide feed (Baltic-wide done; nearby not yet)
- [x] ❤️ Like
- [x] 💬 Comment
- [x] 📌 Save
- [x] 🚩 Report
- [x] "Friends are exploring" section on Home
- [ ] Shareable achievement cards for Instagram and other platforms

### Place pages
- [x] Place page: country, explorer count, photo count, post count, challenge count
- [x] Challenges at this place
- [x] Community photos from this place
- [ ] 🚧 Information: opening hours, accessibility and official info where available (official link and safety metadata; no opening hours data yet)

### Friend competition (basic)
- [ ] Type H — Social: complete a challenge with a friend
- [ ] 🚧 Friend activity notifications ("Anna completed a challenge"), with throttling (new follower, like and comment pushes done; completion activity not yet)

### Leaderboards
- [x] Friends leaderboard
- [x] Weekly leaderboard (resets every week)
- [x] Country leaderboards (Latvia / Lithuania / Estonia)
- [x] Baltics-wide leaderboard

### Exit criteria
- [x] A user can post a completion, friends see it, and they can like and comment on it (verified against the live API by `smoke-test.ps1`)
- [x] Report and block work on every post, comment and profile (required before any public UGC ships, see Phase 3.5)

---

## Phase 3.5 — Trust, Safety & Launch Monetization (2–3 weeks, required for v1.0)

> These items aren't optional. Apple requires UGC apps to have filtering, reporting, blocking and contact info.

### UGC moderation
- [x] 🚩 Report post / comment
- [x] 🚩 Report user
- [x] 🚫 Block user (hides their content both ways)
- [x] 🛡️ Automated text moderation (profanity / abuse filter, EN/LV/LT/ET/RU, leetspeak-aware)
- [ ] 🖼️ Automated image moderation
- [x] 🧹 Spam and rate limiting (API rate limits; link-spam filter; link posts from accounts under 24 h go to the review queue)
- [ ] 🚧 Contact / support info reachable from inside the app (support page linked from Settings; needs a real `SUPPORT_EMAIL`)
- [x] Terms of Service and community guidelines accepted at signup (versioned; re-prompted when the terms change)

### Location privacy
- [x] Never expose exact live location; show "Riga, Latvia"-level only
- [x] Per-post location visibility toggle
- [x] Profile privacy: public / friends / private
- [ ] Hide home-area check-ins option (column exists; needs a home-area definition before it can do anything)
- [x] Location permission explained; app works without it

### Safety
- [x] Location safety metadata shown on every challenge: difficulty, accessibility, terrain, season, duration, distance, family friendly, dog friendly, parking, opening status
- [x] "Always follow local rules and site guidance" notice
- [x] Responsible nature behavior messaging (respect nature, leave places as they were)
- [x] Seasonal / closed location flags

### Anti-cheat (v1 level)
- [x] Impossible GPS speed detection
- [x] Teleportation detection
- [ ] 🚧 Mock-location detection (Android) and jailbreak / spoof heuristics (Android mock flag rejected; no jailbreak heuristics)
- [x] Repeated submission limits (one completion per challenge, rate-limited completion endpoint, every attempt logged in `check_ins`)
- [x] Duplicate photo detection (perceptual hash; duplicates are flagged on upload)
- [ ] High-value challenges need GPS + photo + timestamp
- [x] Flagged completions go to the admin review queue (approve awards the XP; reject closes the attempt)

### Admin dashboard (web, v1) — `https://vps-1a18ee51.vps.ovh.net/admin/`
- [x] Admin authentication and roles (moderator / admin; promote with `node dist/scripts/set-role.js <email> admin` on the VPS)
- [ ] 🚧 Dashboard: users, active users, challenges, completions, reports, revenue (everything except revenue, which waits for subscriptions)
- [ ] 🚧 Challenge Manager: create and edit challenge, location, category, XP, difficulty, requirements, photos, description, country, region, season, expiration (all except requirements/steps; photos are set on the place)
- [ ] 🚧 Location Manager: map view, click a location, edit its info (edit by coordinates with an OpenStreetMap link; no embedded map yet)
- [ ] 🚧 User Manager: search user and view profile, challenges, reports, posts, XP, bans (search, XP, level, role and bans done; no per-user detail page yet)
- [x] Moderation queue ("🚩 23 reports → Review")
- [ ] 🚧 Ban / suspend / warn user (ban and unban with a reason; no timed suspension or warnings yet)
- [x] Audit log of admin actions

### Launch monetization
- [ ] Subscription infrastructure (Apple + Google)
- [ ] Pro monthly — €4.99
- [ ] Pro annual — €39.99 (free trial if appropriate)
- [ ] Paywall screen with clear terms, restore purchases, and a manage-subscription link
- [ ] Entitlement checks on the server
- [ ] Pro badge on the profile
- [ ] Free tier never paywalls the core social experience
- [ ] Native feed ads for free users
- [ ] Ad frequency caps (no ad after every challenge)
- [ ] "Remove ads" included in Pro
- [ ] GDPR consent for ads and analytics (EU)

### Exit criteria
- [ ] App Store / Play Store review checklist passes (UGC, privacy, subscriptions, account deletion)
- [ ] 🚧 Privacy policy published (draft at `/legal/privacy` and `/legal/terms`; needs legal review)

---

## Phase 4 — Advanced Exploration (4–6 weeks)

- [ ] Advanced map: clustering, search, more filters (Places, Friends, Events)
- [ ] Type C — Photo challenges (camera capture or upload)
- [ ] Type E — Route challenges (GPS-recorded route, e.g. 10 km trail)
- [ ] Type F — Multi-step / multi-checkpoint challenges (e.g. Gauja Explorer: viewpoint → sandstone cliff → trail → photo → 5 km walk, 750 XP + special badge)
- [ ] GPS challenge mode: distance to the next checkpoint, progress bar, [OPEN MAP]
- [ ] "📍 CHECKPOINT FOUND!" moment, then confirm
- [ ] Background GPS tracking for routes (battery-aware)
- [ ] 🥾 Route posts (GPS route + stats + photos)
- [ ] Offline data: download region challenge packs (Pro)
- [ ] Offline maps: download map tiles for a region (Pro)
- [ ] Offline completions queued and synced when back online
- [ ] Offline anti-cheat: signed timestamps and route plausibility checks at sync
- [ ] Saved / bookmarked locations
- [ ] Custom collections
- [ ] Suspicious route detection
- [ ] Statistics: total distance

### Exit criteria
- [ ] A user can complete a full multi-checkpoint trail with no mobile data and have it sync correctly afterwards

---

## Phase 5 — Baltic Content Expansion (3–6 weeks, then ongoing)

> Runs alongside other phases. The launch needs enough content that every region has something nearby.

### Content pipeline
- [ ] Content sourcing guidelines (official tourism data, licensing, attribution)
- [ ] Bulk import tool (CSV / JSON → locations + challenges)
- [ ] Content QA checklist (coordinates verified, safety metadata complete, photos licensed)
- [ ] Translations: EN + LV + LT + ET (+ RU optional)

### Content targets

| Category | 🇱🇻 LV | 🇱🇹 LT | 🇪🇪 EE | Total target |
|---|---|---|---|---|
| Castles / manors / fortresses | [ ] | [ ] | [ ] | 100+ |
| Nature locations | [ ] | [ ] | [ ] | 100+ |
| Viewpoints | [ ] | [ ] | [ ] | 100+ |
| Historical locations | [ ] | [ ] | [ ] | 100+ |
| Beaches | [ ] | [ ] | [ ] | — |
| Trails | [ ] | [ ] | [ ] | — |
| Lighthouses | [ ] | [ ] | [ ] | — |
| Landmarks | [ ] | [ ] | [ ] | — |

### Cities
Beta coverage (challenges per city): Tallinn 9 · Rīga 8 · Vilnius 8 · Kaunas 5 · Sigulda 4 · Cēsis 3 · Tartu 3 · Liepāja 2 · Klaipėda 1 · Pärnu 1. None is at launch depth yet.
- [ ] Riga · [ ] Sigulda · [ ] Cēsis · [ ] Liepāja
- [ ] Vilnius · [ ] Kaunas · [ ] Klaipėda
- [ ] Tallinn · [ ] Tartu · [ ] Pärnu

### Country collections
- [ ] 🇱🇻 Discover Latvia — 100 places
- [ ] 🇱🇹 Discover Lithuania — 100 places
- [ ] 🇪🇪 Discover Estonia — 100 places

---

## Phase 6 — Monetization (full)

### Pro features (beyond launch)
- [ ] 🗺️ Advanced maps
- [ ] 📍 Unlimited custom routes
- [ ] 🥾 Advanced route tracking
- [ ] 📊 Advanced statistics
- [ ] 🏆 Advanced challenge filters
- [ ] 📥 Offline maps and challenge packs (from Phase 4)
- [ ] 🧭 Advanced navigation
- [ ] 📸 Unlimited photo storage
- [ ] ✨ Exclusive challenges and premium collections
- [ ] 🎖️ Pro badges
- [ ] More personalization (themes, frames)

### Ads and sponsorship
- [ ] Sponsored challenges in the feed
- [ ] Sponsored locations on the map (clearly labeled)
- [ ] Occasional interstitials, strictly capped

### Metrics
- [ ] Conversion funnel tracking (paywall views → trial → paid)
- [ ] Churn and retention dashboards

---

## Phase 7 — AI

- [ ] 🤖 Challenge recommendations ("I have 2 hours and a car — what can I do?")
- [ ] 🤖 AI trip planner ("Plan me a weekend adventure from Riga")
- [ ] 🤖 AI photo verification (relevance, object/location check, duplicate check) — it assists moderators and is not presented as proof
- [ ] 🤖 AI captions for posts (optional, user-editable)
- [ ] 🤖 AI discovery ("Show me unusual challenges")
- [ ] 🤖 Personalized adventure feed
- [ ] Cost controls and rate limits for AI features

---

## Phase 8 — Events & Seasons

### Seasons (every 3 months)
- [ ] Season framework (start/end dates, season collection, limited badge)
- [ ] 🌱 Spring Explorer
- [ ] ☀️ Summer Adventure
- [ ] 🍂 Autumn Explorer (3 forests, 2 viewpoints, 1 sunset, 1 autumn photo)
- [ ] ❄️ Winter Baltic
- [ ] Type G — Seasonal challenges (e.g. available September–November only)
- [ ] Type I — Time-limited challenges (e.g. "Visit 3 locations this weekend")

### Community events
- [ ] Shared community progress bar (e.g. 82,430 / 100,000)
- [ ] Everyone who took part gets a badge when the goal is reached
- [ ] 🇱🇻 Explore Latvia — 100 Places
- [ ] 🇱🇹 Discover Lithuania
- [ ] 🇪🇪 Estonia Explorer
- [ ] 🌊 Baltic Coast Challenge
- [ ] "🍂 New Autumn challenges are available" notification

### Friend challenges
- [ ] Challenge a friend (e.g. "Visit 3 castles this month")
- [ ] Head-to-head ("Who can visit more Baltic locations this weekend?")
- [ ] Winner badge — XP / badges / status only, **no real-money gambling**

### Leaderboards (extended)
- [ ] Region leaderboards (e.g. Vidzeme)
- [ ] City leaderboards (e.g. Riga)
- [ ] Global leaderboard
- [ ] Leaderboard types: most challenges, most places, longest distance, most countries, weekly explorer, photography, nature

---

## Phase 9 — Community-Created Challenges

- [ ] User verification / trust level system
- [ ] Create Challenge flow (requirements, checkpoints, photos, distance)
- [ ] Server-capped XP for user-made challenges
- [ ] Review queue before publishing
- [ ] Community voting / rating for quality
- [ ] Reporting for unsafe or fake challenges
- [ ] Creator profile stats and creator badges

---

## Phase 10 — Business Ecosystem

### Business profiles
- [ ] Business accounts and verification
- [ ] Business profile page (rating, location, challenges, events, offers)
- [ ] Business can upload posts

### Business tools
- [ ] Create sponsored challenges (e.g. "Discover Riga's Best Coffee": Café A + B + C)
- [ ] Sponsor collections
- [ ] Promote events
- [ ] Offer discounts

### Rewards
- [ ] 🎟️ Discount codes
- [ ] 🎁 Partner rewards
- [ ] 🏆 Certificates
- [ ] 🎫 Event rewards
- [ ] Reward redemption flow, with fraud protection
- [ ] XP is never directly converted to money

### Business monetization
- [ ] Business self-serve dashboard
- [ ] Billing for sponsored placements
- [ ] Traffic / visit analytics for businesses

---

## Release Milestones

### 🚀 Version 1.0 — First serious public release
Needs: **Phase 0, 1, 2, 3, 3.5** + launch content from **Phase 5**, + seasonal challenges and extended leaderboards from **Phase 8**.

Feature checklist:
- [ ] Core: Accounts · Profiles · Home · Explore · Map · Challenges · GPS verification · XP · Levels · Achievements · Collections · Daily challenges · Weekly challenges
- [ ] Social: Profiles · Friends · Follow · Posts · Photos · Likes · Comments
- [ ] Discovery: Latvia · Lithuania · Estonia · Categories · Nearby · Search · Filters
- [ ] Game: XP · Levels · Badges · Streaks · Leaderboards · Seasonal challenges
- [ ] Monetization: Free · Pro · Ads · Subscription infrastructure
- [ ] Safety: Reporting · Blocking · Moderation · Privacy controls · Location controls

Release tasks:
- [ ] Closed beta (TestFlight + Play closed testing)
- [ ] Beta feedback addressed
- [ ] App Store listing (screenshots, description, privacy nutrition labels)
- [ ] Google Play listing (data safety form)
- [ ] Privacy policy, Terms of Service, support page
- [ ] Production monitoring and alerting
- [ ] Backups and disaster recovery
- [ ] Load test for nearby queries and the feed
- [ ] Submitted to App Store
- [ ] Submitted to Google Play
- [ ] **Live** 🎉

### 🚀 Version 1.1
Needs: **Phase 4**, plus:
- [ ] Offline maps
- [ ] Route tracking
- [ ] Photo challenges
- [ ] Multi-checkpoint challenges
- [ ] Friend competitions
- [ ] More collections
- [ ] More badges
- [ ] Better recommendations
- [ ] Share cards

### 🚀 Version 1.5
Needs: **Phase 6, 7 (recommendations), 8, 9, 10 (first part)**, plus:
- [ ] Community-created challenges
- [ ] Business profiles
- [ ] Sponsored challenges
- [ ] Events
- [ ] Rewards
- [ ] Advanced statistics
- [ ] AI recommendations

### 🚀 Version 2.0 — Baltic Adventure Network
- [ ] Complete loop: Find → Travel → Complete → Photograph → Share → Earn XP → Collect badges → Challenge friends → Get rewards → Discover again
- [ ] Full AI trip planner
- [ ] Full business ecosystem with rewards
- [ ] Large-scale events (10,000+ participants)

---

## Reference: Level curve (draft)

| Level | XP | Title |
|---|---|---|
| 1 | 0 | Newcomer |
| 2 | 100 | |
| 3 | 250 | |
| 4 | 500 | |
| 5 | 850 | Explorer |
| 10 | 5,000 | Adventurer |
| 20 | 15,000 | Pathfinder |
| 30 | 43,333 | Trailblazer |
| 50 | 100,000 | Baltic Master |

- [x] Fill in the full curve between the anchor levels (linear between anchors; see `db/migrations/003_reference_data.sql`)
- [ ] Balance-test XP earning rates against real play patterns

## Reference: Challenge types

| Type | Name | Verification | Phase |
|---|---|---|---|
| A | Visit | GPS radius | 1 |
| B | Discover | GPS + check-in | 1 |
| C | Photo | Photo (+ GPS) | 4 |
| D | Collection | Multiple completions | 2 |
| E | Route | GPS track | 4 |
| F | Multi-step | Mixed checkpoints | 4 |
| G | Seasonal | Date window | 8 |
| H | Social | Two users together | 3 |
| I | Time-limited | Date window | 8 |

---

## Changelog

| Date | Change |
|---|---|
| 2026-10-02 | Roadmap created. Nothing implemented yet. |
| 2026-10-02 | VPS cleared and set up (Node 24, PostgreSQL 16 + PostGIS, Caddy HTTPS). API v0.1 deployed: email auth with rotating refresh tokens, onboarding, home feed, nearby challenges, server-side GPS verification with anti-cheat, XP ledger, levels, achievements and collections. Seeded 33 Baltic challenges. Mobile app built with 5 tabs, onboarding, map, challenge GPS mode, collections and profile. |
| 2026-10-02 | Phase 2: Riga-day streaks with 7/30-day badges, +50 XP challenge-of-the-day bonus, weekly and monthly goals, Early Bird / Night Explorer / Weekly Warrior badges, animated level-up celebration, history screen, edit profile and avatar, explore list view. Push notifications (Expo) with per-type settings and an evening reminder job (streak, weekly goal ending, close to level; max one per day). |
| 2026-10-02 | Phase 3: public profiles, follow / mutual friends, people search, posts with photos (EXIF stripped, re-encoded on the server, duplicate detection), following and Baltic-wide feeds, likes, comments, saves, place pages, friends / weekly / country / Baltic leaderboards. |
| 2026-10-02 | Phase 3.5: report and block everywhere, multilingual text filter and link-spam rules, privacy controls, versioned terms consent, draft privacy / terms / support pages, flagged-completion review. Admin web dashboard at `/admin/` (stats, reports, pending posts, flagged completions, users and bans, places and challenges editors, audit log). |
| 2026-10-03 | Full app redesign to the 15-screen reference (forest-green design system, photo cards, hex badges, animated segmented tabs, spring press feedback, parallax photo headers). Wikimedia Commons photos for 79 of 94 places, with credits. New screens: Achievements, Daily/Weekly/Monthly, Pro paywall (UI only), Create Post type picker, GPS challenge mode with a dark map, photo step on completion (stored as proof). Web test build served at `/app/` with a Leaflet/OpenStreetMap map. API: collection cover images, km explored and photo stats, friends feed, optional proof photo on completion. |
| 2026-10-02 | Content batch 2: 61 more places (94 challenges: 32 LV, 31 LT, 31 EE) and six new collections (Rīga / Vilnius / Tallinn highlights, Baltic Manors, Sacred Places, Falls & Cliffs). Reports on deleted content now close themselves. |
