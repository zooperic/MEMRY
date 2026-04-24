# MEMRY — Roadmap

## Milestone 0 — Decisions & Research ✅
*Completed April 2025*
- Product concept locked (WiFi Live, Polaroid form factor)
- Hardware stack decided (XIAO ESP32C3 + Waveshare 4.2" + 300mAh LiPo)
- India BOM researched with prices in INR
- Architecture designed
- NFC/Snap scoped out for POC (iOS complexity + deadline)

---

## Milestone 1 — Hardware Design ✅
*Completed April 2025*
- [x] Finalise shell dimensions (95×115×11mm)
- [x] Two-piece design: front body + plain back panel (no text, no emboss)
- [x] USB-C notch on right edge
- [x] M2 screw bosses (4 corners, BIN=6mm inset) — secure on impact
- [x] Rim ledge (RIM_W=2.5mm, RIM_H=1.5mm) with gasket groove
- [x] Magnet pockets: blind design spanning both pieces
      — Back panel: 20mm through-hole (1.5mm deep)
      — Front body rim face: 20mm blind recess (2.0mm deep)
      — Combined: 3.5mm total pocket, magnet 3.0mm, 0.5mm PLA floor
      — Ghost rings (raised 0.4mm) mark position on fridge face
- [x] STL files exported and validated (single body, watertight, correct dims)
      — memry_front_body_v4.stl (95×115×11mm)
      — memry_back_panel_v4.stl (87×107×1.9mm, fits inside rim)
- [ ] Submit STLs to local Pune 3D print service (print 4× each)

---

## Milestone 2 — Order Everything
*Target: April 22, 2025 (order) → May 1 (receive)*

### Electronics (Robu.in)
- [ ] 4× Waveshare 4.2" B&W e-ink display (400×300px, SPI)
- [ ] 4× Seeed XIAO ESP32C3
- [ ] 4× 3.7V 300mAh slim LiPo (JST-PH 2.0mm, ~2.5mm thick)
- [ ] Dupont jumper wires F-F 10cm (pack of 40)
- [ ] 1× breadboard (for firmware POC before assembly)

### Hardware (Amazon.in)
- [ ] N52 neodymium disc magnets 20mm×3mm — pack of 20
- [ ] M2×6mm self-tapping screws — pack of 20
- [ ] PCB conformal coating spray (~₹300)

### Consumables (local hardware store)
- [ ] Clear silicone sealant — Fevikwik Silicone or equivalent (~₹80)
- [ ] 2-part epoxy — for locking magnets (~₹60)

### 3D Print (local Pune service)
- [ ] memry_front_body_v4.stl — print 4× (white PLA, 0.15mm, face-down)
- [ ] memry_back_panel_v4.stl — print 4× (white PLA, 0.15mm, outside-face-down)

---

## Milestone 3 — Firmware POC
*Target: hardware arrived April 2025*
*Status: READY TO TEST — all firmware written, hardware confirmed, breadboard next*

### Hardware confirmed
- [x] Waveshare 3.6" e-Paper HAT+ (E), SKU 32650, Spectra 6, 600×400
- [x] Seeed Studio XIAO-ESP32-C3 confirmed genuine
- [x] Interface switch confirmed at 0 (4-line SPI) ✓
- [x] PWR pin identified — must tie to 3.3V (critical, easy to miss)

### Firmware written and ready
- [x] Full firmware scaffold: WiFi connect, ETag fetch, deep sleep cycle
- [x] WiFi provisioning portal (captive portal, no hardcoded creds)
- [x] `epd3in6e_driver.h` — complete Spectra 6 SPI driver (no GxEPD2 needed)
- [x] `epdRender()` — landscape direct stream
- [x] `epdRenderRotated()` — 90° CW rotation in RAM for portrait shell mount
- [x] Battery ADC (A0/GPIO0, voltage divider, X-Battery-Mv header)
- [x] Mock server updated for 120,000-byte 4bpp color format + 6-color test pattern
- [x] Status + provisioning screens drawn via raw framebuffer (no font library needed)

### Still to do (breadboard session)
- [ ] Wire display + XIAO per README wiring table (8 wires + PWR)
- [ ] Flash firmware, run mock server, confirm display renders test pattern
- [ ] Confirm ~19s refresh time acceptable
- [ ] End-to-end: web app upload → device renders
- [ ] Measure actual current draw (deep sleep, WiFi active, refresh)

### Shell update (Tinkercad, ~10 min)
- [ ] Resize window: 85x85mm → 85x58mm (Spectra 6 active area 84.6x56.4mm)
- [ ] Bottom strip grows 23mm → ~31mm (more Polaroid-authentic)
- [ ] Re-export STLs, resubmit to Pune printer

---

## Milestone 4 — Web App
*Target: April–May 2025 (building now)*
*Status: IN PROGRESS — starting while hardware ships*

### Stack
- Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui
- Supabase (Auth + Postgres + Storage)
- Sharp.js image pipeline (server-side) · Vercel hosting

### Core features
- [ ] Supabase project setup (auth, DB schema, storage bucket)
- [ ] Next.js scaffold with Supabase auth (email/password)
- [ ] Upload flow: drag/drop → 6-color quantise → store .bin (120KB) + .jpg preview
- [ ] Device API: GET /api/device/{id}/current-image (ETag + X-Sleep-Hours + X-Battery-Mv)
- [ ] Dashboard: device cards, current photo, battery level badge, last-seen
- [ ] Storage usage: total bucket size + per-device breakdown
- [ ] Photo manager: set active, delete per-photo, clear all for device
- [ ] Device pairing: enter ID → name it → done
- [ ] Contributor invite by email (owner vs contributor roles)
- [ ] Deploy to Vercel

### Image pipeline (Spectra 6 color) — confirmed format
- [ ] Sharp.js resize to 600×400 (cover, centred) — landscape native orientation
- [ ] Quantise to 6-color palette: Black=0, White=1, Green=2, Blue=3, Red=4, Yellow=5
- [ ] Pack as 4bpp (2 pixels per byte, high nibble = left pixel)
- [ ] Output: raw binary `.bin` file — exactly 120,000 bytes (600×400÷2)
- [ ] Store JPEG preview at 600×400 separately for dashboard thumbnails
- [ ] Device API serves `.bin` as `application/octet-stream` (not image/bmp)
- [ ] ETag computed from binary content hash

### Polish
- [ ] Mobile-first (primary users on phone)
- [ ] Polaroid upload preview (simulated 6-color render before sending)
- [ ] Error states: device offline, image too large, upload failure
- [ ] Warm cream/ink aesthetic matching WIKI.html design language

---

## Milestone 5 — Integration + Assembly
*Target: June 2–15, 2025*
- [ ] Point all 4 firmware units at live server
- [ ] End-to-end test: web upload → fridge refresh
- [ ] Test rotation / auto-cycle
- [ ] Test with real photos (dithering quality check)
- [ ] Assemble all 4 shells (follow splash-protection sequence below)
- [ ] Charge all units via USB-C
- [ ] Confirm all 4 units connect to WiFi and poll correctly

### Assembly sequence (per unit)
1. Breadboard test first — confirm display + XIAO + LiPo work
2. Conformal coat — spray XIAO + all solder joints, cure 24h
3. Seat display — place face-down in display bay, route FPC ribbon
4. Seal display edge — thin silicone bead around window perimeter (inside)
5. Seat XIAO + LiPo — component bay, connect FPC jumpers + JST battery
6. Fill gasket groove — clear silicone sealant into rim groove
7. Drop back panel — self-locates inside rim ledge, press evenly
8. Drive 4× M2×6mm screws — corners, firm but don't overtighten
9. Insert magnets — drop N52 into ghost-ring holes from outside
10. Epoxy magnets — fill with 2-part epoxy, cure 30min

---

## Milestone 6 — Polish
*Target: June 16 – July 6, 2025*
- [ ] UI polish — mobile-first web app
- [ ] Polaroid preview on upload (simulated e-ink look)
- [ ] Error handling (device offline, WiFi failure, image too large)
- [ ] Domain: memry.app (or similar)
- [ ] Write setup guide for Jo (one-page PDF gift insert)
- [ ] Label each unit with small ID sticker inside back panel during assembly

---

## Milestone 7 — Gift Ready 🎁
*Target: July 11, 2025 (one week before July 18)*
- [ ] All 4 units assembled, charged, tested
- [ ] Server live and stable
- [ ] Jo's account created, devices paired
- [ ] Friends invited as contributors
- [ ] First photo pre-loaded on each device
- [ ] Gift packaged

---

## v2 Scope (Post-Birthday)

### Near term (Aug–Oct 2025)
- NFC Snap variant — revisit with proper iOS CoreNFC testing
- Flutter app — single interface for both Snap + Live
- Push updates (WebSocket) — instant refresh when photo is published
- Image filters on upload (grayscale styles, contrast, vintage)
- Caption rendering on bottom Polaroid strip

### Medium term (2026)
- Custom PCB — replace XIAO devkit, reduce to 8mm shell
- Injection moulded ABS shell — scale economics
- Direct display factory sourcing (50+ unit MOQ)
- Public launch — anyone can create an account and buy a MEMRY
- Subscription model — free tier (1 device, 5 photos) + paid (unlimited)

### Long term / ideas
- Physical MEMRY store — gift-ready packaged units
- Multi-frame — 2×2 grid of MEMRY units that show one big photo
- Color display — when 6-color NFC panels become more power efficient
- MEMRY for businesses — office walls, conference rooms

---

*Roadmap v1.2 · April 2025 · 87 days to July 11*

---

## LLM / AI Software Roadmap

### v2 — Natural Language Interface
- [ ] LLM command bar: "Show something cheerful on Jo's fridge" → picks + publishes
- [ ] Google Photos OAuth integration
- [ ] Natural language scheduling: "Show beach photos this week"

### v2 — Smart Curation
- [ ] Vision model scores photos for warmth, faces, composition
- [ ] Auto-suggest best photo for fridge
- [ ] Smart album: LLM picks best from a set based on vibe

### v3 — Automation
- [ ] "Every Monday morning, pick a random memory from the past year"
- [ ] Event awareness: birthdays, anniversaries → auto-queue relevant photos
- [ ] Multi-device: "Update all MEMRYs with something warm for the holidays"

---

## Smart Home / Matter Integration (v3+)

### Why Matter
Matter is the open smart home standard backed by Google, Apple, Amazon and Samsung.
ESP32C3 — the exact chip used in MEMRY — is one of Matter's reference MCUs and has
an official Matter SDK. No hardware changes needed.

### What it unlocks
- MEMRY appears in Google Home / Apple Home / Alexa as a native device
- Voice: "Hey Google, cycle the kitchen frame"
- Routines: "Every morning at 8am, show a new photo"
- Local network control — no cloud middleman

### Standards evaluated
| Standard | Verdict |
|---|---|
| **Matter over WiFi** | ✅ Best long-term bet — one standard, all ecosystems, ESP32C3 native |
| **Home Assistant (MQTT/ESPHome)** | ✅ Good for dev/power users, requires self-hosted HA |
| **Google Assistant SDK direct** | ⚠ Deprecated in favour of Matter |
| **Apple HomeKit (esp-homekit-sdk)** | ⚠ Works on ESP32 but MFi cert is a headache for DIY |

### Why it's v3 scope
Matter adds significant firmware complexity — commissioning flow, Thread/WiFi
selection, device descriptors. The POC deadline (July 2025) doesn't allow for it.
The hardware foundation is already correct — it's purely a firmware + web app change.

### Milestone placeholder
- [ ] v3 — Matter commissioning on XIAO ESP32C3
- [ ] v3 — Google Home device type: "Display" or custom "Photo Frame"
- [ ] v3 — Routine support: voice-triggered photo cycle
- [ ] v3 — Home Assistant ESPHome alternative for maker/dev users
