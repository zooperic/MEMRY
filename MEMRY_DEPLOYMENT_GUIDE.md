# MEMRY — Step-by-Step Deployment & Testing Guide
**Target:** Get from code to working hardware  
**Time Estimate:** 2-3 hours for web, 3-4 hours for hardware breadboard

---

## PHASE 1: VERCEL DEPLOYMENT (~1 hour)

### Step 1.1: Apply the TypeScript Fix

**What:** Fix the type error that blocks production build

**How:**

```bash
# Navigate to your project
cd /path/to/memry/memry-web

# Open the file
# File: app/dashboard/devices/page.tsx
# Line 9
```

**Change this line:**
```typescript
function getStatus(lastRequest: string | null, sleepHours: number) {
```

**To this:**
```typescript
function getStatus(lastRequest: string | null, sleepHours: number): 'online' | 'sleeping' | 'offline' {
```

**Why:** TypeScript needs explicit return type annotation to match the `Device` interface in `DeviceListClient.tsx`.

**Verify:**
```bash
npm run build
# Should see "Compiled successfully" after type checking
# (Ignore Sharp warnings about linux-x64 runtime — those are dev-only)
```

---

### Step 1.2: Verify Supabase Setup

**What:** Confirm your existing Supabase project has the correct schema

**How:**

1. **Go to Supabase dashboard:**  
   https://app.supabase.com

2. **Select your project**

3. **Run SQL to check tables exist:**
   - Go to: SQL Editor → New query
   - Run this:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('devices', 'photos', 'device_settings', 'contributors', 'device_pings');
   ```

4. **Expected result:** 5 rows showing all tables

**If tables are missing:**
   - SQL Editor → New query
   - Copy entire contents of `memry-web/supabase-schema.sql`
   - Click Run
   - Wait for success message

---

### Step 1.3: Create Storage Bucket

**What:** Set up the `photos` bucket for storing processed images

**How:**

1. **In Supabase dashboard:**  
   Storage → New bucket

2. **Bucket settings:**
   - Name: `photos`
   - Public bucket: ❌ **UNCHECK** (must be private)
   - File size limit: `10 MB`
   - Allowed MIME types: 
     - `application/octet-stream`
     - `image/jpeg`
     - `image/png`

3. **Click Create**

**Verify:**
- Storage → Buckets → Should see `photos` listed as Private

---

### Step 1.4: Get Supabase API Keys

**What:** Copy the 3 environment variables needed for deployment

**How:**

1. **In Supabase dashboard:**  
   Settings → API

2. **Copy these values:**

```bash
# Project URL
https://xxxxxxxxxxxxx.supabase.co

# Public anon key (starts with eyJ...)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (starts with eyJ... — different from anon)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Keep these safe** — you'll paste them into Vercel in the next step.

---

### Step 1.5: Push Code to GitHub

**What:** Get your code onto GitHub so Vercel can deploy it

**How:**

**If you already have a GitHub repo at `https://github.com/zooperic/MEMRY`:**

```bash
cd /path/to/memry
git add .
git commit -m "Fix TypeScript error in devices page"
git push origin main
```

**If you DON'T have a repo yet:**

1. **Create repo on GitHub:**
   - Go to https://github.com/new
   - Repository name: `MEMRY`
   - Private or Public: Your choice
   - Don't initialize with README (you already have code)
   - Click Create

2. **Link local code to GitHub:**
```bash
cd /path/to/memry
git init
git add .
git commit -m "Initial commit: MEMRY e-ink photo frame"
git branch -M main
git remote add origin https://github.com/zooperic/MEMRY.git
git push -u origin main
```

**Verify:**  
Visit `https://github.com/zooperic/MEMRY` — you should see your files.

---

### Step 1.6: Deploy to Vercel

**What:** Import GitHub repo to Vercel and configure environment variables

**How:**

1. **Go to Vercel:**  
   https://vercel.com/new

2. **Import Git Repository:**
   - Click "Add New..." → Project
   - Select your GitHub account
   - Find `MEMRY` repository
   - Click Import

3. **Configure Project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `memry-web` ⚠️ **CRITICAL** — your Next.js app is in a subfolder
   - Build Command: `npm run build` (default, leave as-is)
   - Install Command: `npm install` (default, leave as-is)

4. **Add Environment Variables:**
   Click "Environment Variables" section, add these 3:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (your anon key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (your service role key) |
   | `NEXT_PUBLIC_SITE_URL` | `https://memry.vercel.app` (or your custom domain) |

   **Note:** `NEXT_PUBLIC_SITE_URL` — use your Vercel deployment URL. If you don't know it yet, you can add it after first deploy (Step 1.8).

5. **Click Deploy**

**Expected result:**  
- Build starts
- Takes 2-3 minutes
- Should see "Congratulations! Your project has been deployed"

**If build fails:**
- Check the build logs
- Common issues:
  - TypeScript error (did you apply the fix from Step 1.1?)
  - Environment variables missing (did you add all 4?)
  - Root directory wrong (should be `memry-web`)

---

### Step 1.7: Note Your Deployment URL

**What:** Copy the production URL for firmware config

**How:**

1. **After successful deployment:**  
   Vercel shows your URL, typically: `https://memry-xxxxx.vercel.app`

2. **Copy this URL** — you'll need it for:
   - Firmware config (Phase 2)
   - Supabase redirect URLs (Step 1.8)

**Example:**  
`https://memry-git-main-zooperic.vercel.app`

---

### Step 1.8: Configure Supabase Authentication Redirects

**What:** Tell Supabase where to redirect users after login

**How:**

1. **In Supabase dashboard:**  
   Authentication → URL Configuration

2. **Site URL:**  
   Paste your Vercel URL: `https://memry-xxxxx.vercel.app`

3. **Redirect URLs:**  
   Add this: `https://memry-xxxxx.vercel.app/auth/callback`

4. **Click Save**

**Also update environment variable in Vercel:**
- Go to: Vercel dashboard → Your project → Settings → Environment Variables
- Find `NEXT_PUBLIC_SITE_URL`
- Click Edit
- Paste your Vercel URL
- Click Save
- **Redeploy:** Deployments → Click "..." on latest → Redeploy

---

### Step 1.9: Test Web Portal

**What:** Verify the deployed app works end-to-end

**How:**

1. **Open your Vercel URL:**  
   `https://memry-xxxxx.vercel.app`

2. **Sign up flow:**
   - Click Sign In
   - Enter email + password
   - Should redirect to `/dashboard`

3. **Pair a test device:**
   - Dashboard → "Pair a device"
   - Device ID: `test-001`
   - Device name: `Test Fridge`
   - Click Save

4. **Upload a test photo:**
   - Dashboard → Select `test-001` → Upload
   - Choose any photo from your computer
   - Adjust settings if you want
   - Click "Process & Upload"
   - Wait ~5 seconds for processing
   - Should see success message

5. **Activate the photo:**
   - Go to Library (for `test-001`)
   - Click the uploaded photo
   - Click "Set as Active"

6. **Test the device API endpoint:**
   - Open a new browser tab
   - Go to: `https://memry-xxxxx.vercel.app/api/device/test-001/current-image`
   - **Expected:** Should download a BMP file (or show binary data)
   - **If 404:** Photo isn't active — go back to Library and activate it

**Checklist:**
- [ ] Landing page loads
- [ ] Sign up works
- [ ] Dashboard loads with device grid
- [ ] Can pair a device
- [ ] Can upload a photo
- [ ] Photo appears in Library
- [ ] Can activate a photo
- [ ] Device API returns BMP data

**If any step fails:**
- Check browser console for errors (F12 → Console)
- Check Vercel logs (Vercel dashboard → Deployments → Your deployment → Logs)
- Check Supabase logs (Supabase dashboard → Database → Logs)

---

## ✅ PHASE 1 COMPLETE

**You now have:**
- ✅ Working web portal at a public URL
- ✅ Supabase backend with schema + storage
- ✅ Device API endpoint that returns BMP images
- ✅ Test device paired and photo uploaded

**Save this URL** — you'll need it for Phase 2 (firmware config).

---

## PHASE 2: HARDWARE BREADBOARD TEST (~3-4 hours)

**⚠️ CRITICAL:** Do NOT skip this. You have **one display, one ESP32**. If you assemble without testing, and something is wrong, you'll have to disassemble a sealed, epoxied unit.

---

### Step 2.1: Gather Components

**Required hardware:**

| Qty | Component | Notes |
|-----|-----------|-------|
| 1× | Waveshare 3.6" e-Paper HAT+ (E) | SKU 32650, Spectra 6, 600×400 |
| 1× | Seeed XIAO ESP32C3 | |
| 1× | 300mAh LiPo battery | JST-PH 2.0mm connector |
| 8× | Female-to-Female dupont jumpers | 10-20cm length |
| 1× | USB-C cable | For programming + power |
| 1× | Breadboard (optional) | For stability, or tape to desk |

**Optional but recommended:**
- Multimeter (for measuring battery voltage + current)
- USB power meter (to verify deep sleep current)

**Where to buy (if you don't have yet):**
- **Display:** https://www.waveshare.com/product/3.6inch-e-paper-hat-e.htm
- **XIAO ESP32C3:** https://www.seeedstudio.com/Seeed-XIAO-ESP32C3-p-5431.html
- **Battery:** Any 300-500mAh LiPo with JST-PH 2.0mm (search "300mah jst 2.0")

---

### Step 2.2: Physical Wiring

**CRITICAL CHECKS BEFORE WIRING:**

1. **Display interface switch:** Find the small DIP switch on the HAT+ PCB. It MUST be set to position **0** (4-line SPI). If it's on 1, 2, or 3, the display won't work.

2. **PWR pin:** The display has a PWR pin that MUST be tied to 3.3V. This is NOT optional. Without it, the display stays dark. This is the #1 reason breadboard tests fail.

**Wiring Table:**

| Display Pin | XIAO ESP32C3 Pin | Function | Recommended Wire Color |
|-------------|------------------|----------|------------------------|
| VCC | 3.3V | Power supply | Red |
| GND | GND | Ground | Black |
| DIN | D10 (GPIO3) | SPI MOSI | Blue |
| CLK | D8 (GPIO2) | SPI SCK | Yellow |
| CS | D7 (GPIO20) | Chip select | Green |
| DC | D3 (GPIO21) | Data/Command | Orange |
| RST | D0 (GPIO9) | Reset | Purple |
| BUSY | D1 (GPIO10) | Busy signal (input) | White |
| **PWR** | **3.3V** | **CRITICAL!** | **Red jumper** |

**Step-by-step wiring:**

1. **Lay out components:**
   - Display HAT on desk (or breadboard)
   - XIAO ESP32C3 nearby
   - Don't connect battery or USB yet

2. **Wire power first:**
   - Display **VCC** → XIAO **3.3V** (red wire)
   - Display **GND** → XIAO **GND** (black wire)
   - Display **PWR** → XIAO **3.3V** (second red wire or jumper)

3. **Wire SPI signals:**
   - Follow table above for remaining 6 connections
   - Double-check each connection

4. **Visual inspection:**
   - Count wires: Should have **9 physical connections** (8 wires + PWR tie)
   - Verify PWR is tied to 3.3V (not floating, not GND)
   - Verify interface switch is at position 0

5. **Take a photo of your wiring** (for reference during assembly)

**Common mistakes:**
- ❌ Forgot to tie PWR to 3.3V → display stays blank
- ❌ Interface switch on wrong position → garbage data
- ❌ CS pin connected to wrong GPIO → SPI won't work
- ❌ Reversed VCC/GND → smoke (don't do this!)

---

### Step 2.3: Install Arduino IDE & ESP32 Support

**What:** Set up development environment for flashing firmware

**How:**

1. **Download Arduino IDE 2.x:**  
   https://www.arduino.cc/en/software  
   Install for your OS (Windows/Mac/Linux)

2. **Add ESP32 board support:**
   - Open Arduino IDE
   - File → Preferences
   - Find: "Additional Board Manager URLs"
   - Paste this URL:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Click OK

3. **Install ESP32 boards:**
   - Tools → Board → Boards Manager
   - Search: `esp32`
   - Find: "esp32 by Espressif Systems"
   - Click Install (downloads ~200MB, takes 2-3 minutes)

4. **Select XIAO ESP32C3 board:**
   - Tools → Board → esp32 → **XIAO_ESP32C3**

5. **Install required library:**
   - Tools → Manage Libraries
   - Search: `ArduinoJson`
   - Install: "ArduinoJson by Benoit Blanchon" (v6.x or v7.x, either works)

**Verify setup:**
- Tools → Board → Should say "XIAO_ESP32C3"
- Tools → Manage Libraries → Search "ArduinoJson" → Should show "INSTALLED"

---

### Step 2.4: Update Firmware Config

**What:** Point firmware to your deployed Vercel URL

**How:**

1. **Open config file:**
   - Navigate to: `memry/memry-firmware/config.h`
   - Open in any text editor

2. **Update SERVER_URL:**

**Change line 18 from:**
```cpp
#define SERVER_URL    "http://192.168.1.42:3001"
```

**To your Vercel URL:**
```cpp
#define SERVER_URL    "https://memry-xxxxx.vercel.app"
```

**⚠️ Important:**
- Remove `http://` and replace with `https://`
- Remove any trailing slashes
- Remove any `/api` or other path segments
- Just the base domain

**Example:**
```cpp
#define SERVER_URL    "https://memry-git-main-zooperic.vercel.app"
```

3. **Verify DEVICE_ID:**

Line 13 should be:
```cpp
#define DEVICE_ID     "memry-001"
```

**This MUST match the device ID you paired in the web portal in Step 1.9.**

If you used a different ID (like `test-001`), change it:
```cpp
#define DEVICE_ID     "test-001"
```

4. **Save the file**

**Why this matters:**
- Firmware fetches images from: `SERVER_URL + /api/device/ + DEVICE_ID + /current-image`
- If these don't match your web portal, the fetch will 404

---

### Step 2.5: Flash Firmware to ESP32

**What:** Upload the firmware to your XIAO ESP32C3

**How:**

1. **Connect XIAO to computer:**
   - Plug USB-C cable into XIAO
   - Plug other end into computer
   - XIAO LED should light up (red or green)

2. **Select serial port:**
   - Arduino IDE → Tools → Port
   - Should see a new port appear (e.g., `/dev/ttyUSB0` on Linux, `COM3` on Windows)
   - Select it

3. **Open firmware:**
   - File → Open
   - Navigate to: `memry/memry-firmware/memry.ino`
   - Click Open

4. **Verify code compiles:**
   - Click ✓ (Verify) button
   - Wait 10-20 seconds
   - Should see "Compilation complete" at bottom

**If compilation fails:**
- Check error message
- Common issues:
  - Board not selected (Tools → Board → XIAO_ESP32C3)
  - ArduinoJson not installed (Tools → Manage Libraries)
  - Wrong Arduino IDE version (need 2.x)

5. **Upload firmware:**
   - Click → (Upload) button
   - Wait 30-60 seconds
   - Progress bar shows: "Connecting...", "Writing...", "Verifying..."
   - Should see "Done uploading" at bottom

**If upload fails:**
- Try putting XIAO into boot mode:
  - Hold BOOT button
  - Press RESET button
  - Release RESET
  - Release BOOT
  - Try upload again

6. **Open Serial Monitor:**
   - Tools → Serial Monitor
   - Set baud rate: **115200**
   - Should see output like:
     ```
     ── MEMRY wake #1  device=test-001 ──
     No WiFi creds — starting provisioning portal
     ```

---

### Step 2.6: WiFi Provisioning (First Boot)

**What:** Give the device your WiFi credentials via captive portal

**Expected behavior on first boot:**
- Device creates its own WiFi network: `MEMRY-SETUP-XXXX`
- Display shows: "WiFi Setup" or "Connect to MEMRY-SETUP"

**How:**

1. **On your phone or laptop:**
   - Go to WiFi settings
   - Look for network: `MEMRY-SETUP-XXXX` (XXXX = last 4 hex digits of MAC)
   - Connect to it (no password needed)

2. **Captive portal should auto-open:**
   - If not, open browser and go to: `192.168.4.1`

3. **Enter WiFi credentials:**
   - SSID: Your home WiFi name
   - Password: Your WiFi password
   - Click Submit

4. **Device reboots:**
   - Disconnects from setup network
   - Connects to your WiFi
   - Should see in Serial Monitor:
     ```
     WiFi connected: 192.168.1.123
     Fetching https://memry-xxxxx.vercel.app/api/device/test-001/current-image
     ```

**If provisioning fails:**
- Can't see `MEMRY-SETUP-XXXX` network:
  - Check Serial Monitor for errors
  - Press RESET button on XIAO to restart
  - Wait 10 seconds for network to appear

- Portal won't open:
  - Some phones/laptops block captive portals
  - Manually go to: `http://192.168.4.1`

- WiFi credentials rejected:
  - Check for typos in SSID/password
  - Some special characters may not work
  - Try a simpler WiFi password if possible

---

### Step 2.7: First Fetch & Render Test

**What:** Verify device can fetch from API and render to display

**Expected behavior after WiFi connects:**

1. **Serial Monitor output:**
   ```
   ── MEMRY wake #1  device=test-001 ──
   WiFi connected: 192.168.1.123
   Battery: 4123mV
   Fetching https://memry-xxxxx.vercel.app/api/device/test-001/current-image
   → 200 OK (123456 bytes)
   → ETag: abc123...
   Rendering image...
   EPD init...
   EPD refresh (19 seconds)...
   EPD sleep
   Deep sleep for 4 hours
   ```

2. **Display behavior:**
   - Display should start flickering (normal for e-ink refresh)
   - Color sequence: Black → Red → Yellow → etc. (Spectra 6 refresh cycle)
   - Refresh takes ~19 seconds
   - Final image appears
   - Display goes static (deep sleep)

3. **Verify image:**
   - Should see the photo you uploaded in Step 1.9
   - Check orientation (should be portrait, not rotated)
   - Check colors (6-color Spectra 6 palette)
   - Check for dithering quality (Floyd-Steinberg should smooth gradients)

**If display stays blank:**

**Most likely cause: PWR pin not connected**
- Check wiring: PWR → 3.3V jumper in place?
- Measure with multimeter: PWR pin should read 3.3V

**Other causes:**
- Interface switch wrong position → Set to 0
- Wrong pins → Double-check wiring table
- Display defective → Try different SPI pins (update config.h)

**If display shows garbage/wrong colors:**
- Color palette wrong → Check `epd3in6e_driver.h` matches Spectra 6
- Partial update issue → Need full refresh, check LUT table

**If API fetch fails (404 or connection error):**
- Check Serial Monitor error
- Verify `SERVER_URL` in config.h
- Verify `DEVICE_ID` matches web portal
- Test API manually in browser: `https://memry-xxx.vercel.app/api/device/test-001/current-image`
- Check Vercel logs for errors

---

### Step 2.8: Deep Sleep Test

**What:** Verify device actually goes to deep sleep and wakes up

**Why this matters:**  
If deep sleep fails, battery drains in hours instead of months.

**How:**

1. **Wait for device to sleep:**
   - After first render, Serial Monitor shows: "Deep sleep for 4 hours"
   - XIAO LED turns off
   - Display stays static

2. **Check current consumption (if you have USB power meter):**
   - Disconnect USB from computer
   - Connect: Wall charger → USB power meter → USB-C → XIAO
   - Should read: **<1mA** (ideally 0.05-0.2mA)
   - **If >10mA:** Deep sleep isn't working

3. **Test wake-on-RESET:**
   - Press RESET button on XIAO
   - Device should wake up
   - Serial Monitor shows: `── MEMRY wake #2 ...`
   - Fetches from API again
   - Checks ETag (if same image, skips render)
   - Goes back to sleep

4. **ETag cache test:**
   - First wake: Renders image (ETag stored in RTC memory)
   - Second wake: Fetches, sees same ETag, skips render
   - Serial Monitor should show:
     ```
     → ETag unchanged, skipping render
     Deep sleep for 4 hours
     ```

**Checklist:**
- [ ] Device wakes on RESET button press
- [ ] Serial Monitor shows incrementing wake count
- [ ] ETag check works (skips render on second wake)
- [ ] Current consumption <1mA during sleep (if measurable)

**If deep sleep fails (current >10mA):**
- Display not in sleep mode → Check `epdSleep()` is called
- WiFi not disconnected → Check `WiFi.disconnect(true)` in code
- Peripheral leakage → May need to add `esp_sleep_pd_config()` calls

---

### Step 2.9: Upload New Photo & Test Update

**What:** Verify device fetches and renders a new photo

**How:**

1. **While device is asleep, upload a new photo:**
   - Go to web portal: `https://memry-xxxxx.vercel.app`
   - Dashboard → Upload (for `test-001`)
   - Upload a **different photo** (so you can tell it changed)
   - Click "Process & Upload"
   - Go to Library → Click new photo → "Set as Active"

2. **Wake device:**
   - Press RESET button on XIAO
   - Watch Serial Monitor

3. **Expected behavior:**
   - Fetches from API
   - ETag is different (new photo)
   - Renders new image to display (~19 seconds)
   - Display shows the NEW photo
   - Goes back to sleep

**Verify:**
- [ ] Display updated to show new photo
- [ ] Old photo is gone
- [ ] New photo is correctly oriented
- [ ] Colors look good

**If device doesn't fetch new photo:**
- Check Serial Monitor for errors
- Verify photo is marked "active" in web portal
- Test API in browser (should return new BMP)

---

### Step 2.10: Battery Test

**What:** Verify device works on battery power (no USB)

**How:**

1. **Connect battery:**
   - Plug LiPo JST connector into XIAO battery port
   - **Do NOT connect USB at the same time** (can damage battery)

2. **Measure battery voltage (if you have multimeter):**
   - Touch red probe to BAT+ terminal
   - Touch black probe to GND terminal
   - Should read: **3.7-4.2V** (fully charged)
   - **If <3.0V:** Battery is dead, charge via USB first

3. **Test wake cycle on battery:**
   - Press RESET button
   - Device should wake, fetch, render, sleep
   - **No USB connected** — running purely on battery

4. **Estimate battery life:**
   - If you have a USB power meter:
     - Connect: Battery → XIAO → USB meter → dummy load
     - Measure current during:
       - Deep sleep: Should be <1mA (0.05-0.2mA ideal)
       - WiFi active: ~80-150mA
       - Display refresh: ~100-200mA
   - Calculate runtime:
     - Assume 4hr sleep cycle
     - Wake time per cycle: ~30 seconds (WiFi + fetch + render)
     - Sleep time per cycle: ~3.99 hours
     - Average current = (150mA × 30s + 0.2mA × 14370s) / 14400s ≈ **0.5mA**
     - 300mAh / 0.5mA ≈ **600 hours ≈ 25 days**

**Realistic battery life:**
- Best case (everything perfect): 2-3 months
- Typical (some leakage): 3-4 weeks
- Worst case (deep sleep broken): 2-3 days

**If battery drains fast:**
- Check deep sleep current (should be <1mA)
- Check for peripheral leakage (display, WiFi, SPI)
- May need to add power domain config in firmware

---

### Step 2.11: Breadboard Test Checklist

**Before proceeding to assembly, verify ALL of these:**

**Physical:**
- [ ] Display has 9 connections (8 wires + PWR tie to 3.3V)
- [ ] Interface switch is at position 0
- [ ] All dupont connections are firm (not loose)
- [ ] Photo of wiring saved for assembly reference

**Firmware:**
- [ ] WiFi provisioning works (can connect to home WiFi)
- [ ] API fetch works (returns 200 OK)
- [ ] Display renders correctly (shows uploaded photo)
- [ ] Colors are correct (6-color Spectra 6 palette)
- [ ] Orientation is correct (portrait, not landscape)

**Power:**
- [ ] Device wakes on RESET button press
- [ ] Deep sleep works (current <1mA)
- [ ] ETag caching works (skips render when image unchanged)
- [ ] Battery powers device (no USB needed)
- [ ] Battery voltage is healthy (>3.5V)

**API Integration:**
- [ ] Fetches from correct URL (Vercel deployment)
- [ ] Returns BMP data (not 404 or error)
- [ ] New photos trigger display update
- [ ] Serial Monitor shows no errors

**If ANY item fails:**
- ❌ **DO NOT proceed to assembly**
- Debug on breadboard first
- Assembling with known issues = disaster

**If ALL items pass:**
- ✅ **Ready for assembly** (Phase 3)
- Take final photos of working breadboard
- Label all wires before disassembly

---

## ✅ PHASE 2 COMPLETE

**You now have:**
- ✅ Working hardware on breadboard
- ✅ Verified end-to-end flow (upload → API → ESP32 → display)
- ✅ Confirmed power consumption is acceptable
- ✅ Proven the firmware works with your Vercel deployment

**Next:** Proceed to Phase 3 (Assembly) — but only if breadboard test is 100% successful.

---

## PHASE 3: TROUBLESHOOTING GUIDE

### Display Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Display completely blank | PWR not tied to 3.3V | Add jumper: PWR → 3.3V |
| Display blank | Interface switch wrong | Set to position 0 |
| Display blank | Wrong pin connections | Check wiring table |
| Garbage/random pixels | Wrong color palette | Check epd3in6e_driver.h |
| Wrong colors | Display type mismatch | Verify Spectra 6 (SKU 32650) |
| Partial update artifacts | LUT table issue | Need full refresh code |
| Image rotated 90° | Rotation not set | Add `setRotation(1)` in driver |
| Image upside down | Rotation wrong direction | Try `setRotation(3)` |

### WiFi Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Can't see MEMRY-SETUP network | AP mode failed | Check Serial Monitor for errors |
| Portal won't open | Phone blocked captive | Go to 192.168.4.1 manually |
| WiFi credentials rejected | Wrong SSID/password | Double-check for typos |
| WiFi connects but fetch fails | Wrong SERVER_URL | Check config.h |
| Intermittent WiFi drops | Signal strength | Move closer to router |
| WiFi never connects | Timeout too short | Increase WIFI_TIMEOUT_MS |

### API Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 Not Found | DEVICE_ID mismatch | Check config.h vs web portal |
| 404 Not Found | No active photo | Set a photo as active in Library |
| Connection timeout | Wrong URL | Verify SERVER_URL (https, not http) |
| SSL error | Certificate issue | ESP32 doesn't validate certs, shouldn't happen |
| ETag not working | Server cache | Clear Vercel cache and redeploy |
| Image corrupted | BMP header wrong | Check imageProcess.ts pipeline |

### Power Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Deep sleep current >10mA | Display not sleeping | Check epdSleep() is called |
| Deep sleep current >10mA | WiFi not disconnected | Add WiFi.disconnect(true) |
| Device won't wake | Battery dead | Charge via USB-C |
| Device won't wake | Deep sleep config wrong | Check esp_deep_sleep_start() |
| Battery drains in days | Deep sleep broken | Measure current, debug power domains |
| USB and battery conflict | Both connected | Never connect both simultaneously |

### Firmware Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Compilation error | Library missing | Install ArduinoJson |
| Upload error | Wrong board selected | Tools → Board → XIAO_ESP32C3 |
| Upload error | Wrong port | Tools → Port → Select USB port |
| Serial Monitor blank | Wrong baud rate | Set to 115200 |
| Infinite reset loop | Watchdog timeout | Check for long-running code |
| RTC memory lost | Power cycled | Expected, re-provision WiFi |

---

## PHASE 4: NEXT ACTIONS

### After Breadboard Test Passes

**DO THIS:**
1. ✅ Take photos of working breadboard setup
2. ✅ Label wires with tape (which pin goes where)
3. ✅ Test one more time to be sure
4. ✅ Proceed to shell update (if not done yet)
5. ✅ Order shell prints (or assemble if prints ready)

**DON'T DO THIS:**
- ❌ Assemble without confirming breadboard works
- ❌ Skip deep sleep test (battery will die)
- ❌ Assume wiring will be the same during assembly (take photos!)

### Shell Update (Can Do Anytime)

**If you haven't updated the shell STL yet:**

1. Open: `memry/memry-shell/memry_shell_v4.scad`
2. Find line with `WINDOW_H = 85;`
3. Change to: `WINDOW_H = 58;`
4. Re-export STLs
5. Print 2× sets (one spare)

**Why:** Current window is too tall for Spectra 6 display. Will expose 28mm of black border.

---

## ESTIMATED TIMELINE

**Completed today:**
- ✅ Phase 1: Vercel deployment (1 hour)

**Tomorrow:**
- ⏳ Phase 2: Breadboard test (3-4 hours)

**Next week:**
- ⏳ Shell prints arrive (if ordered)
- ⏳ Assembly (2-3 hours)
- ⏳ 24-hour burn-in test

**Total time to working unit:** ~1 week (assuming prints arrive)

---

## FINAL CHECKLIST BEFORE ASSEMBLY

**Web Portal:**
- [ ] Deployed to Vercel
- [ ] Supabase schema applied
- [ ] Storage bucket created
- [ ] Test device paired
- [ ] Test photo uploaded and active
- [ ] Device API returns BMP

**Hardware:**
- [ ] Breadboard test 100% successful
- [ ] Display renders correctly
- [ ] WiFi provisioning works
- [ ] Deep sleep current <1mA
- [ ] Battery powers device
- [ ] Photos of wiring taken

**Firmware:**
- [ ] SERVER_URL points to Vercel
- [ ] DEVICE_ID matches web portal
- [ ] ArduinoJson library installed
- [ ] Compiles without errors
- [ ] No Serial Monitor errors

**Shell:**
- [ ] Window dimensions updated (85×58mm)
- [ ] STLs exported
- [ ] Prints ordered (2× sets)
- [ ] Prints received and verified

**If any box is unchecked:**
- ❌ **DO NOT ASSEMBLE**

**If all boxes are checked:**
- ✅ **Ready for assembly**

---

**Guide Complete.**

Start with Phase 1 (Vercel deployment), then Phase 2 (breadboard test). Once breadboard is confirmed working, we'll create the assembly guide (Phase 3).
