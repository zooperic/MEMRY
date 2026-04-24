# MEMRY — Architecture

## System Overview

```
[Person] ──upload──▶ [Web App] ──store──▶ [Supabase]
                         │                    │
                   [Image Pipeline]            │
                   Sharp.js                    │
                   → color quantise (Spectra 6)│
                   → Floyd-Steinberg (B&W)     │
                   → BMP output                │
                         │                    │
                   [Storage bucket] ◀──────────┘
                         │
              GET /api/device/{id}/current-image
                         │
                  [MEMRY Device]
          XIAO ESP32C3 wakes from deep sleep
          → WiFi connect → poll server
          → receive BMP → render to e-ink
          → hibernate display → deep sleep
```

---

## Hardware Layer

### Device Stack (per unit)
```
Front wall (1.0mm PLA)
Display glass (1.2mm) + PCB driver (1.5mm)
FPC ribbon gap (0.5mm)
XIAO ESP32C3 (3.5mm) beside LiPo (2.5mm)
Rim ledge + back panel (1.5mm PLA)
─────────────────────────────────────────
~11mm total
```

### Shell (v4 — two-piece)
- **Front body:** 95×115×11mm · display window · component bay · rim ledge · gasket groove · M2 boss pillars
- **Back panel:** 87×107×1.9mm · ghost rings · magnet through-holes · M2 countersunk holes
- **Closure:** 4× M2×6mm self-tapping screws through panel → into boss pillars
- **Magnets:** N52 20mm×3mm disc · blind pocket split across both pieces · epoxied post-assembly
- **Splash resistance:** silicone sealant in gasket groove + conformal coat on electronics

### Display Decision
- **Confirmed:** Waveshare 3.6" E Ink Spectra 6 (E6) — 600×400px, 6-color, SPI, ~19s refresh
  - Active area: 84.6×56.4mm · Driver chip: TBC from PCB sticker on arrival
  - Color encoding: 4bpp packed, 2px/byte (Black=0x0, White=0x1, Green=0x2, Blue=0x3, Red=0x4, Yellow=0x5)
  - Portrait mounted in landscape shell via setRotation(1)
- **Dropped:** Waveshare 4.2" B&W (original plan — superseded by color)

### Power Budget
```
State               Current      Duration      Energy/day
─────────────────────────────────────────────────────────
Deep sleep          44µA         ~23h 59m      ~1.06 mWh
WiFi connect        ~80mA avg    ~8 seconds    ~0.18 mWh
Image fetch         ~60mA        ~3 seconds    ~0.05 mWh
E-ink refresh       ~26mA        ~4 seconds    ~0.03 mWh
E-ink sleep         ~0µA         always after  0 mWh
─────────────────────────────────────────────────────────
Total/day                                      ~1.32 mWh

Battery: 300mAh × 3.7V × 0.85 = 944 mWh usable
Life: 944 / 1.32 ≈ 715 days theoretical → realistic 3–5 months
```

### Wiring
```
Waveshare e-ink     →   XIAO ESP32C3
────────────────────────────────────
VCC              →   3.3V
GND              →   GND
DIN (MOSI)       →   D10 (GPIO3)
CLK (SCK)        →   D8  (GPIO2)
CS               →   D7  (GPIO20)
DC               →   D3  (GPIO21)
RST              →   D0  (GPIO9)
BUSY             ←   D1  (GPIO10)

LiPo 300mAh      →   XIAO BAT+ / BAT-  (JST-PH 2.0mm)
USB-C            →   XIAO USB-C (charge + flash)
```

---

## Firmware Layer

### Lifecycle
```
Boot / wake from deep sleep
  │
  ├─ Connect WiFi (stored creds) — timeout 20s, retry 3×
  ├─ GET /api/device/{DEVICE_ID}/current-image
  │    → check ETag (stored in RTC memory)
  │    → if unchanged: skip render, sleep immediately
  ├─ Render BMP to e-ink (GxEPD2 library) — ~4s full refresh
  ├─ Display hibernate (0µA)
  └─ Deep sleep SLEEP_INTERVAL (default 4h, from X-Sleep-Hours header)
```

### Key Config
```cpp
const char* WIFI_SSID  = "Jo_WiFi";
const char* WIFI_PASS  = "password";
const char* DEVICE_ID  = "memry-001";
const char* SERVER     = "https://api.memry.app";
uint64_t    SLEEP_US   = 4ULL * 3600 * 1000000;
```

### Libraries
```
GxEPD2        E-ink driver (supports Waveshare 4" Spectra 6 + 4.2" B&W)
HTTPClient    HTTP requests
ArduinoJson   Parse response headers
Preferences   Store WiFi creds + device ID in flash
```

---

## Software Layer

### Web App Stack
```
Next.js 14 (App Router)
  ├── /app
  │     ├── page.tsx              ← Dashboard
  │     ├── /device/[id]          ← Photo manager
  │     └── /upload               ← Upload + preview
  ├── /api
  │     ├── /device/[id]/image    ← Device-facing: serve BMP
  │     ├── /devices              ← CRUD
  │     └── /photos               ← Upload, publish, delete
  └── /lib
        ├── supabase.ts
        ├── imageProcess.ts       ← Sharp.js pipeline
        └── dither.ts             ← Color quantise + Floyd-Steinberg

Supabase: Auth · Postgres · Storage (private buckets)
Hosting: Vercel (free tier)
```

### Image Processing Pipeline
```
Upload (JPEG/PNG/HEIC)
  │
  ├─ Resize to 600×400 (cover, centre crop) — Sharp.js
  │
  ├─ Quantise to 6-color Spectra 6 palette
  │    Black=0x0 · White=0x1 · Green=0x2 · Blue=0x3 · Red=0x4 · Yellow=0x5
  │    Each pixel = 4 bits · 2 pixels packed per byte
  │
  ├─ Output: raw 4bpp packed buffer (~120KB) → device format
  │   + JPEG preview at 600×400 for dashboard thumbnails
  │
  └─ Store in Supabase Storage
       /processed/{device_id}/{photo_id}.bin   ← device image
       /previews/{device_id}/{photo_id}.jpg    ← dashboard thumbnail
```

### Database Schema
```sql
CREATE TABLE devices (
  id            TEXT PRIMARY KEY,        -- 'memry-001'
  name          TEXT,                    -- 'Jo's Kitchen'
  owner_id      UUID REFERENCES auth.users,
  sleep_hours   INT DEFAULT 4,
  display_type  TEXT DEFAULT 'color',    -- 'color' | 'bw'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT REFERENCES devices(id) ON DELETE CASCADE,
  uploaded_by     UUID REFERENCES auth.users,
  storage_path    TEXT,
  processed_path  TEXT,
  caption         TEXT,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE device_settings (
  device_id       TEXT PRIMARY KEY REFERENCES devices(id),
  rotation_mode   TEXT DEFAULT 'manual',
  rotation_hours  INT DEFAULT 24
);

CREATE TABLE contributors (
  device_id       TEXT REFERENCES devices(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users,
  invited_by      UUID REFERENCES auth.users,
  PRIMARY KEY (device_id, user_id)
);
```

### Device API
```
GET /api/device/{id}/current-image

Response:
  Content-Type:  image/bmp
  ETag:          {photo_id}
  X-Sleep-Hours: 4
  Cache-Control: no-store

Body: raw BMP bytes

Auth:      none — device ID is the key
Rate:      1 req / 30 min / device ID
```

### Account Model
```
Owner (gifter):
  - Pairs devices, manages all photos, invites contributors

Contributor (Jo, friends):
  - Uploads + publishes photos to invited devices
  - Cannot unpair, delete, or change settings
```

---

## Security
- Device API unauthenticated but rate-limited + device-ID-gated
- Web app: Supabase RLS — users only see own devices/photos
- Storage: private buckets, signed URLs only
- Device ID: 8-char random string flashed at firmware build time

---

## Smart Home (v3 — no hardware change needed)
- **Matter over WiFi** — ESP32C3 is a reference chip, official SDK exists
- **Home Assistant / ESPHome** — good stepping stone for dev/power users
- Enables: Google Home native device, voice control, routines

---

*Architecture v1.2 · April 2025*
