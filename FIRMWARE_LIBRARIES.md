# MEMRY Firmware — Library Dependencies

## Required Libraries (Arduino Library Manager)

### ArduinoJson v6.x
**Author:** Benoit Blanchon  
**Purpose:** Parse JSON responses from server  
**Install:** Arduino IDE → Library Manager → search "ArduinoJson"  
**Usage in firmware:**
```cpp
#include <ArduinoJson.h>
DynamicJsonDocument doc(1024);
deserializeJson(doc, response);
int sleepHours = doc["sleep_hours"];
```

### ESP32 Built-in Libraries
These ship with the Seeed XIAO ESP32C3 board package — no separate install needed.

**WiFi.h** — Network connectivity  
**HTTPClient.h** — HTTP requests to server  
**Preferences.h** — Flash storage (WiFi creds, device ID, ETag)  
**WebServer.h** — Provisioning portal HTTP server  
**DNSServer.h** — Captive portal for WiFi setup  

## Custom Drivers (No External Dependencies)

### epd3in6e_driver.h
**Purpose:** SPI driver for Waveshare 3.6" Spectra 6 display  
**Location:** `/memry-firmware/epd3in6e_driver.h`  
**Why custom:** GxEPD2 doesn't support Spectra 6 4bpp color encoding  
**Key functions:**
- `EPD_3IN6E_Init()` — Initialize display SPI + power sequence  
- `EPD_3IN6E_Display(uint8_t *image)` — Stream 120KB 4bpp buffer to display  
- `EPD_3IN6E_Sleep()` — Enter 0µA hibernation mode  

### wifi_provision.h
**Purpose:** Captive portal for WiFi credential entry  
**Location:** `/memry-firmware/wifi_provision.h`  
**How it works:**
1. Boot with no stored WiFi → creates AP "MEMRY-SETUP"
2. User connects → captive portal redirects to 192.168.4.1
3. HTML form for SSID/password entry
4. Credentials saved to Preferences flash storage
5. Reboot → normal WiFi connect mode

### bmp_render.h
**Purpose:** Direct framebuffer rendering (status screens, QR codes)  
**Location:** `/memry-firmware/bmp_render.h`  
**Why custom:** No font libraries needed — we draw pixels directly  
**Usage:** Provisioning portal QR code + "Scanning..." status text

## Board Package

**Seeed XIAO ESP32C3 Board Package**  
**Install:** Arduino IDE → Preferences → Additional Board Manager URLs: https://files.seeedstudio.com/arduino/package_seeedstudio_boards_index.json

Then: Tools → Board → Boards Manager → search "Seeed ESP32"

## Verification

To confirm all dependencies are met:
```cpp
// At top of memry.ino:
#include <WiFi.h>          // ✅ ESP32 core
#include <HTTPClient.h>     // ✅ ESP32 core
#include <Preferences.h>    // ✅ ESP32 core
#include <ArduinoJson.h>    // ❌ Install from Library Manager
#include "epd3in6e_driver.h" // ✅ Custom (in repo)
#include "wifi_provision.h"  // ✅ Custom (in repo)
```

If build fails on `#include <ArduinoJson.h>`, install from Library Manager.