# MEMRY Firmware — Spectra 6 Color

Hardware confirmed: Waveshare 3.6" e-Paper HAT+ (E), SKU 32650, Spectra 6, 600×400.

---

## File structure

```
firmware_color/
├── memry/
│   ├── memry.ino           ← main sketch (open this in Arduino IDE)
│   ├── config.h            ← per-device settings, edit before flashing
│   ├── epd3in6e_driver.h   ← Spectra 6 SPI driver (no GxEPD2 needed)
│   └── wifi_provision.h    ← captive portal WiFi setup
└── mock-server.js          ← local test server (Node.js, no deps)
```

---

## Arduino IDE setup

### 1. Board package
Preferences → Additional boards URLs:
```
https://files.seeedstudio.com/arduino/package_seeeduino_boards_index.json
```
Install: **Seeed Studio XIAO Series** from Boards Manager.

### 2. Select board
`Tools → Board → Seeed XIAO ESP32C3`

### 3. Libraries (Library Manager)
- `ArduinoJson` by Benoit Blanchon (v6.x)
- No GxEPD2 needed — driver is included in `epd3in6e_driver.h`

---

## Wiring (breadboard test)

Use the **9-pin breakout connector** on the right side of the HAT+ PCB.
Do NOT use the 40-pin Pi header.

```
HAT+ breakout    XIAO ESP32C3
─────────────────────────────────────
GND           →  GND
VCC           →  3.3V
DIN (MOSI)    →  D10  (GPIO3)
CLK (SCK)     →  D8   (GPIO2)
CS            →  D7   (GPIO20)
DC            →  D3   (GPIO21)
RST           →  D0   (GPIO9)
BUSY          ←  D1   (GPIO10)
PWR           →  3.3V  ⚠️ REQUIRED — ties to same 3.3V rail
```

⚠️  **PWR pin is critical.** Without 3.3V on PWR the display will not power on.
    Tie it to the same 3.3V rail as VCC on your breadboard.

⚠️  **Interface switch** on HAT+ PCB must be at position **0** (4-line SPI).
    It ships at 0 — leave it alone.

---

## First flash (step by step)

### 1. Edit config.h
```cpp
#define DEVICE_ID  "memry-001"         // unique per unit
#define SERVER_URL "http://192.168.x.x:3001"  // your laptop LAN IP
```

### 2. Start mock server
```bash
node mock-server.js
```
Prints your LAN IP — paste that into `SERVER_URL`.

### 3. Wire display per table above

### 4. Flash
Open `memry/memry.ino` → Upload.

### 5. Serial Monitor (115200 baud)
You should see:
```
── MEMRY wake #1  device=memry-001 ──
EPD init done
WiFi: connecting to 'YourNetwork' (attempt 1)
WiFi connected: 192.168.1.xx
Battery: 3920mV
Fetching http://192.168.1.42:3001/api/device/memry-001/current-image
HTTP 200
Content-Length: 120000
EPD rendering rotated 120000 bytes (400×600)...
EPD refreshing rotated (this takes ~19s)...
EPD rotated render done in 22438ms
Sleeping 4h...
```

Display will show the 6-color test pattern after ~22 seconds of refreshing.

---

## Orientation

The display's native pixel layout is **landscape** (600 wide × 400 tall).
The shell mounts it **portrait** (400 wide × 600 tall).

The firmware calls `epdRenderRotated()` which rotates the image 90° clockwise
in RAM before sending. This is the default.

If you want landscape orientation, change `memry.ino`:
```cpp
// Change this:
epdRenderRotated(imgBuf, imgLen);
// To this:
epdRender(imgBuf, imgLen);
```

And update the server to produce images at 600×400 (landscape) instead of
rotating them to 400×600 portrait.

---

## Image format

The server sends raw 4bpp packed binary:
- 2 pixels per byte
- High nibble = left pixel, low nibble = right pixel
- Color indices: Black=0, White=1, Green=2, Blue=3, Red=4, Yellow=5
- Total size: 600 × 400 / 2 = **120,000 bytes** exactly

The mock server generates a 6-color test pattern automatically on first run.

To serve your own image:
```bash
# Convert any photo using ImageMagick + custom palette
# (The web app will do this automatically — for manual testing:)
convert your-photo.jpg \
  -resize 600x400^ -gravity center -extent 600x400 \
  -dither FloydSteinberg \
  -remap spectra6-palette.png \
  your-photo-quantised.png
# Then convert to raw 4bpp using the included convert.js script
```

---

## Mock server quick reference

```bash
# Regenerate test pattern
curl http://localhost:3001/test-pattern

# Force device to re-render on next wake
curl http://localhost:3001/reset-etag

# See server state + recent device requests
curl http://localhost:3001/status
```

---

## Per-unit checklist

| Unit | DEVICE_ID   | WiFi via portal | Flashed | Display tested |
|------|-------------|-----------------|---------|----------------|
| 1    | memry-001   | [ ]             | [ ]     | [ ]            |
| 2    | memry-002   | [ ]             | [ ]     | [ ]            |
| 3    | memry-003   | [ ]             | [ ]     | [ ]            |
| 4    | memry-004   | [ ]             | [ ]     | [ ]            |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Display stays white/blank | PWR pin not connected | Wire PWR → 3.3V |
| BUSY timeout in Serial | Wrong wiring | Re-check all 8 pins |
| Image garbled/wrong colors | Wrong resolution sent | Confirm 120,000 bytes |
| WiFi never connects | First boot | Connect to "MEMRY-Setup" hotspot |
| Crash / malloc failed | 120KB not available | Unlikely on XIAO C3 (400KB) — check other allocations |
| Refresh takes >60s | BUSY stuck HIGH | Check BUSY wiring and RST pulse |
