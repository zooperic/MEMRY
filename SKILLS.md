# MEMRY — Skills & Tech Stack Reference

> Full context on tools, libraries and patterns across every layer.
> Updated to reflect color display (Spectra 6) and v4 two-piece shell.

---

## Frontend (Web App)

### Stack
- **Status:** Building now (April 2025) while hardware ships
- **Framework:** Next.js 14 (App Router, React Server Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI components:** shadcn/ui (radix-based)
- **State:** Zustand (client) · React Query (server/cache)
- **File upload:** react-dropzone
- **Image preview:** HTML5 Canvas API — simulate dithered e-ink look (color + B&W modes)
- **Auth:** Supabase Auth
- **Hosting:** Vercel

### Key patterns
- Mobile-first (primary users on phone)
- Upload flow: drag image → canvas preview (color palette simulation) → select device → send
- Polaroid metaphor throughout — photo cards styled as Polaroid frames
- No dark mode for POC

### Libraries
```
sharp          Image processing (server-side, Node.js)
image-q        Color quantisation for Spectra 6 6-pigment palette
@supabase/ssr  Supabase client for Next.js App Router
next/image     Optimised image rendering
```

---

## Backend (API + Database)

### Stack
- **Runtime:** Node.js via Next.js API Routes (serverless)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth + RLS
- **Storage:** Supabase Storage (private buckets)
- **Image processing:** Sharp.js (serverless function)
- **Hosting:** Vercel free tier

### Image processing (Sharp.js)
```javascript
// Spectra 6 — 6-color 4bpp pipeline
// Step 1: resize + extract raw pixels
const { data, info } = await sharp(inputBuffer)
  .resize(600, 400, { fit: 'cover', position: 'centre' })
  .raw()
  .toBuffer({ resolveWithObject: true });

// Step 2: quantise each pixel to nearest Spectra 6 color
// Palette: Black=0, White=1, Green=2, Blue=3, Red=4, Yellow=5
const PALETTE = [
  [0,0,0], [255,255,255], [0,255,0],
  [0,0,255], [255,0,0], [255,255,0]
];
function nearest(r,g,b) {
  let best=0, bestD=Infinity;
  PALETTE.forEach(([pr,pg,pb],i)=>{
    const d=(r-pr)**2+(g-pg)**2+(b-pb)**2;
    if(d<bestD){bestD=d;best=i;}
  });
  return best;
}

// Step 3: pack 2 pixels per byte (4bpp)
const pixels = 600 * 400;
const packed = Buffer.alloc(pixels / 2);
for (let i = 0; i < pixels; i += 2) {
  const hi = nearest(data[i*3], data[i*3+1], data[i*3+2]);
  const lo = nearest(data[(i+1)*3], data[(i+1)*3+1], data[(i+1)*3+2]);
  packed[i/2] = (hi << 4) | lo;
}
// packed is the device image format (~120KB for 600x400)

// Step 4: JPEG preview for dashboard
const preview = await sharp(inputBuffer)
  .resize(600, 400, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 80 })
  .toBuffer();
```

### Supabase RLS
```sql
CREATE POLICY "owner_only" ON devices
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "contributor_read" ON photos
  FOR SELECT USING (
    device_id IN (
      SELECT device_id FROM contributors WHERE user_id = auth.uid()
    )
  );
```

---

## Firmware (ESP32)

### Stack
- **Board:** Seeed XIAO ESP32C3
- **IDE:** Arduino IDE 2.x or PlatformIO
- **Language:** C++ (Arduino)
- **Display driver:** GxEPD2 (supports both Spectra 6 and 4.2" B&W)
- **HTTP:** HTTPClient
- **WiFi:** WiFi.h

### GxEPD2 config — Spectra 6 (primary)
```cpp
// Waveshare 4" Spectra 6 — check GxEPD2 library for exact class name
// As of 2025: GxEPD2_it60 or similar — verify against library release notes
#include <GxEPD2_3C.h> // or GxEPD2_565c for color variants
```

### GxEPD2 config — B&W fallback
```cpp
#include <GxEPD2_BW.h>
GxEPD2_BW<GxEPD2_420_GDEY042T81, GxEPD2_420_GDEY042T81::HEIGHT> display(
  GxEPD2_420_GDEY042T81(/*CS=*/D7, /*DC=*/D3, /*RES=*/D0, /*BUSY=*/D1)
);
```

### Deep sleep
```cpp
display.hibernate();
WiFi.disconnect(true);
WiFi.mode(WIFI_OFF);
esp_sleep_enable_timer_wakeup(SLEEP_INTERVAL_US);
esp_deep_sleep_start();
```

### ETag caching
```cpp
RTC_DATA_ATTR char lastEtag[64] = "";
// If ETag unchanged → skip render → sleep immediately
```

---

## Mechanical (Shell v4)

### Two-piece design
```
FRONT BODY  95×115×11mm  — display window, bays, rim ledge, boss pillars
BACK PANEL  87×107×1.9mm — ghost rings, magnet holes, screw countersinks
```

### Key parameters
```
RIM_W=2.5mm  RIM_H=1.5mm  — ledge that panel sits in
GW=1.4mm     GD=1.0mm     — gasket groove on rim face
BOD=6.5mm    BOH=7.5mm    — M2 boss outer dia + height
BIN=6.0mm                 — boss inset from outer edge
MAG_D=20mm   MAG_T=3.0mm  — magnet size
MAG_IN=16.0mm             — magnet inset from outer edge
BODY_REC=2.0mm            — body recess depth (pocket floor = 0.5mm)
```

### Print settings
```
Material:     White PLA
Layer height: 0.15mm
Infill:       20%
Walls:        3 perimeters
Supports:     None
Orientation:  Front body face-down · Back panel outside-face-down
```

### STL files
- `memry_front_body_v4.stl` — print 4×
- `memry_back_panel_v4.stl` — print 4×
- `memry_shell_v4.scad`     — parametric source

---

## Electrical

### Power states
| State | Current | Notes |
|---|---|---|
| Deep sleep | 44µA | XIAO spec |
| E-ink hibernate | ~0µA | Bistable — holds image forever |
| WiFi active | 80–150mA peak | Short burst only |
| E-ink refresh (color) | ~40mA | ~20–30s full Spectra 6 refresh |
| E-ink refresh (B&W) | ~26mA | ~4s full refresh |
| Charging | up to 500mA | XIAO charges at 500mA max |

### Rules
- E-ink VCC must be 3.3V — do NOT connect to 5V
- Always hibernate display after refresh
- SPI clock ≤ 4MHz on jumper wires
- Min refresh interval: 180s (Waveshare spec)

---

## Design (Visual / Brand)

### Palette
```
Cream:   #FAFAF8   Paper:  #F2EFE8
Ink:     #1A1612   Gold:   #C8A96E
```

### Typography
- Display: Playfair Display
- UI/Technical: DM Mono

### Web UI principles
- Mobile-first
- Polaroid metaphor — cards look like Polaroid frames
- Warm tones, upload flow is the hero
- Color preview: show simulated Spectra 6 palette render before confirming send

---

*Skills v1.2 · April 2025*
