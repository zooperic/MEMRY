# MEMRY — Setup Guide
*From components to a working fridge magnet. Every step.*

---

## What you're building

Four WiFi e-ink fridge magnets (Polaroid form factor) that display photos from a web portal. The stack:

- **Hardware:** Seeed XIAO ESP32C3 + Waveshare 3.6" Spectra 6 e-ink display + 300mAh LiPo
- **Firmware:** Arduino C++ in `memry-firmware/`
- **Web portal:** Next.js 14 in `memry-web/`
- **Backend:** Supabase (auth + Postgres + storage) — free tier is enough
- **Hosting:** Vercel — free tier is enough

---

## Part 1 — Supabase (15 min)

### 1.1 Create project
1. Go to [supabase.com](https://supabase.com) → sign in with GitHub → **New project**
2. Name: `memry`, region: **Southeast Asia (Singapore)** — closest to Pune
3. Wait ~2 min for provisioning

### 1.2 Get your credentials
**Settings → API** (left sidebar):

| What | Where in dashboard | Env var name |
|---|---|---|
| Project URL | "Project URL" | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon key | "anon public" key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | "service_role" key (click reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

### 1.3 Run the database schema
**SQL Editor → New query** → paste entire contents of `memry-web/supabase-schema.sql` → **Run**

You should see: *"Success. No rows returned."*

### 1.4 Create storage bucket
**Storage → New bucket:**
- Name: `photos`
- Public: **OFF**
- File size limit: `10 MB`
- Allowed MIME types: `application/octet-stream,image/jpeg,image/png,image/webp`

### 1.5 Configure auth redirect (for local dev)
**Authentication → URL Configuration:**
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

---

## Part 2 — Web portal locally (10 min)

```bash
cd memry-web
npm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in the three values from Step 1.2 + your site URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
# → http://localhost:3000
```

### First login
1. Go to `/auth` → **Create account** → enter email + password
2. Check email for confirmation link (if it doesn't arrive: Supabase → Authentication → Users → find your email → 3 dots → **Send confirmation email**)
3. Confirm → you'll land on the dashboard

### Fix the one known bug before pairing
In `memry-web/app/api/device/[id]/route.ts`, find two lines:
```ts
.select('id, processed_path')      // line ~68
.download(photo.processed_path)    // line ~99
```
Change both to `storage_path`. This is a column name mismatch — without it the device gets a 502.

---

## Part 3 — Deploying the web portal (20 min)

### 3.1 Push to GitHub
```bash
cd memry-web   # or the MEMRY root if you want the whole repo
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/memry.git
git push -u origin main
```

### 3.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. **Root Directory:** set to `memry-web` (since that's where `package.json` is)
3. **Environment Variables** — add the same four from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → set to your Vercel URL, e.g. `https://memry-web.vercel.app`
4. **Deploy**

### 3.3 Update Supabase for production
After you have the Vercel URL, go back to Supabase:
**Authentication → URL Configuration** → add your Vercel URL:
- Site URL: `https://memry-web.vercel.app`
- Redirect URLs: `https://memry-web.vercel.app/auth/callback`

### 3.4 Set up CI/CD (optional but recommended)
The repo already has `.github/workflows/ci.yml`. To activate it:

Go to your GitHub repo → **Settings → Secrets and variables → Actions** → add:

| Secret | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL |
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |

After this: every `git push` to `main` auto-deploys. Every PR gets a preview URL.

---

## Part 4 — Hardware assembly

### What you need
- Seeed XIAO ESP32C3
- Waveshare 3.6" E Ink Spectra 6 display + HAT+ breakout board (SKU 32650)
- 300mAh LiPo, JST-PH 2.0mm connector
- Dupont F-F jumper wires
- Breadboard (for initial testing — no soldering yet)

### Wiring (breadboard first)

```
HAT+ breakout pin  →  XIAO ESP32C3 pin
────────────────────────────────────────
GND                →  GND
VCC                →  3.3V
PWR                →  3.3V  ← critical, display stays dark without it
DIN (MOSI)         →  D10  (GPIO3)
CLK (SCK)          →  D8   (GPIO2)
CS                 →  D7   (GPIO20)
DC                 →  D3   (GPIO21)
RST                →  D0   (GPIO9)
BUSY               →  D1   (GPIO10)
```

Use the **9-pin breakout connector on the right side** of the HAT+ board, not the 40-pin Pi header.

Check the small **interface switch** on the HAT+ PCB — it must be at position **0** (4-line SPI).

LiPo connects to the XIAO's JST-PH 2.0mm battery connector (BAT+ / BAT−). Charging happens via USB-C on the XIAO.

---

## Part 5 — Firmware setup

### 5.1 Arduino IDE
1. Install [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. **Preferences → Additional boards manager URLs** → add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **Tools → Board Manager** → search `esp32` → install **esp32 by Espressif Systems** (v3.x)
4. **Tools → Manage Libraries** → install **ArduinoJson** by Benoit Blanchon (v6.x)
5. Select board: **Tools → Board → ESP32C3 Dev Module**
   - (If "XIAO_ESP32C3" appears as an option, use that instead)

### 5.2 Configure per device
Open `memry-firmware/config.h`. Change these two lines per unit:

```cpp
#define DEVICE_ID  "memry-001"   // Change to 001, 002, 003, 004 for each unit

// During local dev (use your Mac's LAN IP, not localhost):
#define SERVER_URL "http://192.168.x.x:3000"

// Once deployed to Vercel:
// #define SERVER_URL "https://memry-web.vercel.app"
```

Find your Mac's LAN IP: **System Settings → WiFi → Details → IP Address**

### 5.3 Flash
1. Connect XIAO via USB-C
2. **Tools → Port** → select the XIAO port
3. Upload (Cmd+U)
4. Open Serial Monitor at **115200 baud**

### 5.4 First boot — WiFi provisioning
The device has no WiFi credentials, so it launches a setup portal:

1. The e-ink display shows setup instructions and the device ID
2. On your phone: **WiFi settings → connect to `memry-setup`**
3. A captive portal page opens automatically
4. Enter your home WiFi name + password → Save
5. Device restarts, connects to WiFi, polls the server

---

## Part 6 — First end-to-end test

Before the device fetches its first image you need:

1. `npm run dev` running on your laptop (or Vercel deployed)
2. A device paired in the web app:
   - Dashboard → **Pair device** → enter the 3-digit number (e.g. `001`) → name it → confirm
3. A photo uploaded and set active:
   - Dashboard → **Upload photo** → drop a photo → adjust → **Send to fridge**

Then watch the Serial Monitor on the ESP32:

```
── MEMRY wake #1  device=memry-001 ──
WiFi connected: 192.168.1.x
Battery: 3850mV
Fetching http://192.168.1.42:3000/api/device/memry-001/current-image
HTTP 200
New image — 120000 bytes, ETag: "memry-abc123..."
EPD rendering rotated 120000 bytes (400×600)...
EPD refreshing rotated (this takes ~19s)...
EPD render done in 19243ms
Sleeping 4h...
```

The display will flash through colours then settle on your photo. **~19 seconds is normal** for Spectra 6 — it's doing a full 6-colour refresh.

---

## Part 7 — Shell assembly (after firmware confirmed working)

Order of operations per unit:

1. **Breadboard test** — confirm display + XIAO + LiPo work on the bench
2. **Conformal coat** — spray XIAO + all solder joints, cure 24h
3. **Seat display** — place face-down in display bay, route FPC ribbon
4. **Seal display edge** — thin silicone bead around window perimeter (inside)
5. **Seat XIAO + LiPo** — component bay, connect FPC jumpers + JST battery
6. **Fill gasket groove** — clear silicone into rim groove
7. **Back panel** — self-locates inside rim ledge, press evenly
8. **4× M2×6mm screws** — corners, firm but don't overtighten
9. **Insert magnets** — N52 20mm×3mm discs into ghost-ring holes from outside
10. **Epoxy magnets** — fill with 2-part epoxy, cure 30 min

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Display stays blank | PWR pin not connected to 3.3V |
| `EPD BUSY timeout` in serial | RST or BUSY wires swapped; wrong pin |
| `HTTP -1` / connection refused | Wrong IP in `SERVER_URL`, or `npm run dev` not running |
| `HTTP 404` | Device ID in `config.h` doesn't match what you paired in the app |
| `HTTP 502` | Apply the `storage_path` fix in `app/api/device/[id]/route.ts` |
| Provisioning portal doesn't open | Phone reconnected to home WiFi — disable auto-join temporarily |
| Photo looks stretched | Upload page crops to square — use zoom/pan controls before sending |
| Image very dark/light | Use brightness/contrast sliders in upload editor |

---

## Device API contract (for reference)

```
GET /api/device/{id}/current-image

Device sends:
  If-None-Match: "memry-{photo_uuid}"   ← ETag from last fetch (RTC memory)
  X-Battery-Mv: 3850                    ← ADC reading

Server responds:
  200  → 120,000 bytes raw 4bpp binary
         ETag: "memry-{photo_uuid}"
         X-Sleep-Hours: 4

  304  → empty body (image unchanged, skip render)
         ETag: "memry-{photo_uuid}"
         X-Sleep-Hours: 4

  404  → no active photo yet, sleep and retry
```

Image format: 4bpp packed, 600×400 landscape. Device rotates 90° CW on render.
Colour palette: Black=0x0 White=0x1 Green=0x2 Blue=0x3 Red=0x4 Yellow=0x5

---

## File structure

```
MEMRY/
├── SETUP.md                    ← you are here
├── ARCHITECTURE.md             ← system design details
├── ROADMAP.md                  ← milestone tracker
├── memry-firmware/
│   ├── memry.ino               ← main sketch
│   ├── config.h                ← change DEVICE_ID + SERVER_URL per unit
│   ├── epd3in6e_driver.h       ← Waveshare Spectra 6 SPI driver
│   ├── wifi_provision.h        ← captive portal provisioning
│   ├── bmp_render.h            ← image render helpers
│   └── mock-server.js          ← Node.js dev server (no Supabase needed)
├── memry-web/
│   ├── app/
│   │   ├── api/device/[id]/    ← firmware polls this
│   │   ├── dashboard/          ← upload, library, devices, settings
│   │   └── auth/               ← sign in / sign up
│   ├── lib/
│   │   ├── imageProcess.ts     ← Sharp + Floyd-Steinberg + 4bpp
│   │   └── supabase-*.ts       ← Supabase clients
│   ├── supabase-schema.sql     ← run once in Supabase SQL editor
│   ├── .env.local.example      ← copy to .env.local and fill in
│   └── SETUP.md                ← web-portal-specific notes
└── memry-shell/
    ├── memry_front_panel.stl   ← 3D print: 4× white PLA 0.15mm
    ├── memry_back_panel.stl    ← 3D print: 4× white PLA 0.15mm
    └── memry_shell_v4.scad     ← source file (OpenSCAD)
```

---

*MEMRY · v1.0 · Pune · 2025 · 87 days to July 11*
