// ─────────────────────────────────────────────────────────────
//  MEMRY — memry.ino
//  Waveshare 3.6" e-Paper HAT+ (E) · SKU 32650 · Spectra 6
//  Seeed XIAO ESP32C3
//
//  Lifecycle (every wake):
//    Boot → load WiFi creds → if none: provisioning portal
//    → connect WiFi → GET /api/device/{id}/current-image
//    → ETag check → render if new → EPD sleep → deep sleep
//
//  Libraries (Arduino Library Manager):
//    · ArduinoJson  by Benoit Blanchon (v6.x)
//    · WiFi / HTTPClient / WebServer / DNSServer / Preferences
//      → all built-in to Seeed XIAO ESP32C3 board package
//
//  NO GxEPD2 needed — we use our own driver (epd3in6e_driver.h)
// ─────────────────────────────────────────────────────────────

#include "config.h"
#include "epd3in6e_driver.h"
#include "wifi_provision.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>

// ── RTC memory — survives deep sleep, cleared on power-cycle ──
RTC_DATA_ATTR char lastEtag[64]         = "";
RTC_DATA_ATTR int  wakeCount            = 0;
RTC_DATA_ATTR bool firstBoot            = true;
RTC_DATA_ATTR int  consecutiveWifiFail  = 0;

// ── Forward declarations ───────────────────────────────────────
bool connectWiFi(const char* ssid, const char* pass);
int  fetchImage(const String& url, const String& etag,
                String& newEtag, uint8_t** outBuf, size_t& outLen,
                int& sleepHours);
void showProvisioningScreen();
void showStatus(const char* line1, const char* line2 = nullptr);
void drawTextOnEPD(const char* msg, int x, int y);
void goSleep(int hours);
uint32_t readBatteryMv();

// ──────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);
  wakeCount++;
  Serial.printf("\n── MEMRY wake #%d  device=%s ──\n", wakeCount, DEVICE_ID);

  // ── Init display ─────────────────────────────────────────────
  epdInit();

  // ── Load WiFi credentials ─────────────────────────────────────
  String ssid, pass;
  bool hasCreds = provLoadCreds(ssid, pass);

  if (!hasCreds) {
    Serial.println("No WiFi creds — starting provisioning portal");
    showProvisioningScreen();
    bool saved = runProvisioningPortal();
    epdSleep();
    if (saved) {
      ESP.restart();
    } else {
      goSleep(SLEEP_HOURS_ON_ERROR);
    }
    return;
  }

  // ── Connect WiFi ──────────────────────────────────────────────
  if (!connectWiFi(ssid.c_str(), pass.c_str())) {
    consecutiveWifiFail++;
    Serial.printf("WiFi failed (%d consecutive)\n", consecutiveWifiFail);

    if (consecutiveWifiFail >= WIFI_FAILS_BEFORE_REPROVISION) {
      consecutiveWifiFail = 0;
      memset(lastEtag, 0, sizeof(lastEtag));
      provClearCreds();
      showStatus("WiFi lost.", "Connect to MEMRY-Setup.");
    } else {
      showStatus("No WiFi.", "Retrying next cycle.");
    }
    epdSleep();
    goSleep(SLEEP_HOURS_ON_ERROR);
    return;
  }

  consecutiveWifiFail = 0;

  // ── Read battery ──────────────────────────────────────────────
  uint32_t battMv = readBatteryMv();
  Serial.printf("Battery: %umV\n", battMv);

  // ── Fetch image ───────────────────────────────────────────────
  String url = String(SERVER_URL) + "/api/device/" + DEVICE_ID + "/current-image";
  Serial.printf("Fetching %s\n", url.c_str());

  String   newEtag    = "";
  uint8_t* imgBuf     = nullptr;
  size_t   imgLen     = 0;
  int      sleepHours = SLEEP_HOURS_DEFAULT;

  int code = fetchImage(url, String(lastEtag), newEtag, &imgBuf, imgLen, sleepHours);

  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  if (code == 200 && imgBuf && imgLen > 0) {
    Serial.printf("New image — %u bytes, ETag: %s\n", imgLen, newEtag.c_str());

    // Render — use rotated if display is portrait-mounted
    // Change to epdRender() if landscape orientation preferred
    epdRenderRotated(imgBuf, imgLen);

    strncpy(lastEtag, newEtag.c_str(), sizeof(lastEtag) - 1);
    free(imgBuf);

  } else if (code == 304) {
    Serial.println("304 — image unchanged, skipping render");

  } else {
    Serial.printf("HTTP error %d\n", code);
  }

  epdSleep();
  goSleep(sleepHours);
}

void loop() {}

// ──────────────────────────────────────────────────────────────
bool connectWiFi(const char* ssid, const char* pass) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);

  for (int attempt = 0; attempt < WIFI_RETRIES; attempt++) {
    uint32_t t0 = millis();
    while (millis() - t0 < WIFI_TIMEOUT_MS) {
      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("WiFi connected: %s (attempt %d)\n",
                      WiFi.localIP().toString().c_str(), attempt + 1);
        return true;
      }
      delay(200);
    }
    Serial.printf("Attempt %d timed out\n", attempt + 1);
    WiFi.disconnect();
    delay(500);
    WiFi.begin(ssid, pass);
  }
  return false;
}

// ──────────────────────────────────────────────────────────────
int fetchImage(const String& url, const String& etag,
               String& newEtag, uint8_t** outBuf, size_t& outLen,
               int& sleepHours) {

  HTTPClient http;
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("X-Device-ID", DEVICE_ID);
  http.addHeader("X-Battery-Mv", String(readBatteryMv()));
  if (etag.length() > 0) http.addHeader("If-None-Match", etag);

  int code = http.GET();
  Serial.printf("HTTP %d\n", code);

  if (code == 304) { http.end(); return 304; }
  if (code != 200) { http.end(); return code; }

  String sh = http.header("X-Sleep-Hours");
  if (sh.length() > 0) {
    int h = sh.toInt();
    if (h >= 1 && h <= 24) sleepHours = h;
  }
  newEtag = http.header("ETag");

  int contentLen = http.getSize();
  Serial.printf("Content-Length: %d\n", contentLen);

  if (contentLen <= 0 || contentLen > MAX_IMAGE_BYTES) {
    Serial.printf("Bad content-length: %d\n", contentLen);
    http.end(); return -1;
  }

  *outBuf = (uint8_t*)malloc(contentLen);
  if (!*outBuf) { Serial.println("malloc failed"); http.end(); return -1; }

  WiFiClient* stream = http.getStreamPtr();
  size_t received = 0;
  uint32_t t0 = millis();
  while (received < (size_t)contentLen && millis() - t0 < HTTP_TIMEOUT_MS) {
    if (stream->available()) {
      received += stream->readBytes(*outBuf + received, contentLen - received);
    } else {
      delay(5);
    }
  }
  http.end();

  if (received != (size_t)contentLen) {
    Serial.printf("Incomplete: %u/%d bytes\n", received, contentLen);
    free(*outBuf); *outBuf = nullptr; return -1;
  }

  outLen = received;
  return 200;
}

// ──────────────────────────────────────────────────────────────
//  Battery voltage via ADC
//  XIAO ESP32C3: A0 (GPIO0) reads BAT pin through internal
//  voltage divider (1:2 ratio on XIAO C3).
//  Raw ADC at 12-bit: 0–4095 maps to 0–3.3V at pin.
//  Multiply by 2 to undo divider → actual battery voltage.
// ──────────────────────────────────────────────────────────────
uint32_t readBatteryMv() {
  // Stabilise ADC
  analogSetAttenuation(ADC_11db);  // 0–3.3V range
  delay(10);

  uint32_t raw = 0;
  for (int i = 0; i < 8; i++) raw += analogReadMilliVolts(A0);
  raw /= 8;

  // ×2 for the voltage divider
  return raw * 2;
}

// ──────────────────────────────────────────────────────────────
//  Status screens — draw text directly via SPI commands
//  (No GxEPD2, so we use simple raw pixel routines)
//
//  For these text screens we fill the display white and draw
//  a minimal message. Using a simple 5×7 bitmap font.
// ──────────────────────────────────────────────────────────────

// Minimal 5×7 font — just the characters we need for status
// Index: ASCII - 32 (space=0). Only common chars included.
static const uint8_t FONT5X7[][5] = {
  {0x00,0x00,0x00,0x00,0x00}, // ' '
  {0x00,0x00,0x5F,0x00,0x00}, // '!'
  {0x00,0x07,0x00,0x07,0x00}, // '"'
  {0x14,0x7F,0x14,0x7F,0x14}, // '#'
  {0x24,0x2A,0x7F,0x2A,0x12}, // '$'
  {0x23,0x13,0x08,0x64,0x62}, // '%'
  {0x36,0x49,0x55,0x22,0x50}, // '&'
  {0x00,0x05,0x03,0x00,0x00}, // '''
  {0x00,0x1C,0x22,0x41,0x00}, // '('
  {0x00,0x41,0x22,0x1C,0x00}, // ')'
  {0x14,0x08,0x3E,0x08,0x14}, // '*'
  {0x08,0x08,0x3E,0x08,0x08}, // '+'
  {0x00,0x50,0x30,0x00,0x00}, // ','
  {0x08,0x08,0x08,0x08,0x08}, // '-'
  {0x00,0x60,0x60,0x00,0x00}, // '.'
  {0x20,0x10,0x08,0x04,0x02}, // '/'
  {0x3E,0x51,0x49,0x45,0x3E}, // '0'
  {0x00,0x42,0x7F,0x40,0x00}, // '1'
  {0x42,0x61,0x51,0x49,0x46}, // '2'
  {0x21,0x41,0x45,0x4B,0x31}, // '3'
  {0x18,0x14,0x12,0x7F,0x10}, // '4'
  {0x27,0x45,0x45,0x45,0x39}, // '5'
  {0x3C,0x4A,0x49,0x49,0x30}, // '6'
  {0x01,0x71,0x09,0x05,0x03}, // '7'
  {0x36,0x49,0x49,0x49,0x36}, // '8'
  {0x06,0x49,0x49,0x29,0x1E}, // '9'
  {0x00,0x36,0x36,0x00,0x00}, // ':'
  {0x00,0x56,0x36,0x00,0x00}, // ';'
  {0x08,0x14,0x22,0x41,0x00}, // '<'
  {0x14,0x14,0x14,0x14,0x14}, // '='
  {0x00,0x41,0x22,0x14,0x08}, // '>'
  {0x02,0x01,0x51,0x09,0x06}, // '?'
  {0x32,0x49,0x79,0x41,0x3E}, // '@'
  {0x7E,0x11,0x11,0x11,0x7E}, // 'A'
  {0x7F,0x49,0x49,0x49,0x36}, // 'B'
  {0x3E,0x41,0x41,0x41,0x22}, // 'C'
  {0x7F,0x41,0x41,0x22,0x1C}, // 'D'
  {0x7F,0x49,0x49,0x49,0x41}, // 'E'
  {0x7F,0x09,0x09,0x09,0x01}, // 'F'
  {0x3E,0x41,0x49,0x49,0x7A}, // 'G'
  {0x7F,0x08,0x08,0x08,0x7F}, // 'H'
  {0x00,0x41,0x7F,0x41,0x00}, // 'I'
  {0x20,0x40,0x41,0x3F,0x01}, // 'J'
  {0x7F,0x08,0x14,0x22,0x41}, // 'K'
  {0x7F,0x40,0x40,0x40,0x40}, // 'L'
  {0x7F,0x02,0x0C,0x02,0x7F}, // 'M'
  {0x7F,0x04,0x08,0x10,0x7F}, // 'N'
  {0x3E,0x41,0x41,0x41,0x3E}, // 'O'
  {0x7F,0x09,0x09,0x09,0x06}, // 'P'
  {0x3E,0x41,0x51,0x21,0x5E}, // 'Q'
  {0x7F,0x09,0x19,0x29,0x46}, // 'R'
  {0x46,0x49,0x49,0x49,0x31}, // 'S'
  {0x01,0x01,0x7F,0x01,0x01}, // 'T'
  {0x3F,0x40,0x40,0x40,0x3F}, // 'U'
  {0x1F,0x20,0x40,0x20,0x1F}, // 'V'
  {0x3F,0x40,0x38,0x40,0x3F}, // 'W'
  {0x63,0x14,0x08,0x14,0x63}, // 'X'
  {0x07,0x08,0x70,0x08,0x07}, // 'Y'
  {0x61,0x51,0x49,0x45,0x43}, // 'Z'
};

// Draw a status screen (white bg, black text, 2 lines)
// Uses raw EPD pixel rendering via a framebuffer
void showStatus(const char* line1, const char* line2) {
  const int W = EPD_WIDTH;   // 600
  const int H = EPD_HEIGHT;  // 400
  const size_t bufSize = (W * H) / 2;

  uint8_t* fb = (uint8_t*)malloc(bufSize);
  if (!fb) {
    Serial.println("showStatus: malloc failed");
    return;
  }

  // Fill white (0x1 = white, packed: 0x11 per byte)
  memset(fb, 0x11, bufSize);

  // Helper: set a single pixel color in framebuffer
  auto setPixel = [&](int x, int y, uint8_t color) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    int idx = y * W + x;
    if (idx % 2 == 0) fb[idx/2] = (fb[idx/2] & 0x0F) | ((color & 0xF) << 4);
    else              fb[idx/2] = (fb[idx/2] & 0xF0) |  (color & 0xF);
  };

  // Draw text at scale 2 (10×14 per char) using 5×7 font
  auto drawChar = [&](char c, int cx, int cy, int scale) {
    if (c < ' ' || c > 'Z') return;
    const uint8_t* glyph = FONT5X7[c - ' '];
    for (int col = 0; col < 5; col++) {
      for (int row = 0; row < 7; row++) {
        if (glyph[col] & (1 << row)) {
          for (int sy = 0; sy < scale; sy++)
            for (int sx = 0; sx < scale; sx++)
              setPixel(cx + col*scale + sx, cy + row*scale + sy, EPD_BLACK);
        }
      }
    }
  };

  auto drawString = [&](const char* s, int x, int y, int scale) {
    // Convert to uppercase for font coverage
    char upper[64];
    strncpy(upper, s, 63); upper[63]=0;
    for (int i = 0; upper[i]; i++) {
      if (upper[i] >= 'a' && upper[i] <= 'z') upper[i] -= 32;
    }
    int cx = x;
    for (int i = 0; upper[i]; i++) {
      drawChar(upper[i], cx, y, scale);
      cx += (5 + 1) * scale;
    }
  };

  // Draw content
  drawString("memry", 40, 140, 3);
  if (line1) drawString(line1, 40, 200, 2);
  if (line2) drawString(line2, 40, 230, 1);
  drawString(DEVICE_ID, 40, 340, 1);

  // Send to display
  epdRenderRotated(fb, bufSize);
  free(fb);
}

void showProvisioningScreen() {
  const int W = EPD_WIDTH;
  const int H = EPD_HEIGHT;
  const size_t bufSize = (W * H) / 2;

  uint8_t* fb = (uint8_t*)malloc(bufSize);
  if (!fb) return;
  memset(fb, 0x11, bufSize);  // White

  auto setPixel = [&](int x, int y, uint8_t color) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    int idx = y * W + x;
    if (idx % 2 == 0) fb[idx/2] = (fb[idx/2] & 0x0F) | ((color & 0xF) << 4);
    else              fb[idx/2] = (fb[idx/2] & 0xF0) |  (color & 0xF);
  };

  auto drawChar = [&](char c, int cx, int cy, int scale) {
    if (c < ' ' || c > 'Z') return;
    const uint8_t* glyph = FONT5X7[c - ' '];
    for (int col = 0; col < 5; col++)
      for (int row = 0; row < 7; row++)
        if (glyph[col] & (1 << row))
          for (int sy = 0; sy < scale; sy++)
            for (int sx = 0; sx < scale; sx++)
              setPixel(cx + col*scale + sx, cy + row*scale + sy, EPD_BLACK);
  };

  auto drawString = [&](const char* s, int x, int y, int scale) {
    char upper[64]; strncpy(upper, s, 63); upper[63]=0;
    for (int i = 0; upper[i]; i++)
      if (upper[i] >= 'a' && upper[i] <= 'z') upper[i] -= 32;
    int cx = x;
    for (int i = 0; upper[i]; i++) { drawChar(upper[i], cx, y, scale); cx += (5+1)*scale; }
  };

  auto fillRect = [&](int x, int y, int w, int h, uint8_t color) {
    for (int ry = y; ry < y+h; ry++)
      for (int rx = x; rx < x+w; rx++)
        setPixel(rx, ry, color);
  };

  drawString("setup", 40, 60, 3);
  fillRect(40, 100, 520, 2, EPD_BLACK);  // divider

  drawString("1. open wifi settings", 40, 120, 1);
  drawString("2. connect to:", 40, 140, 1);

  // Highlight box for network name
  fillRect(36, 158, 300, 26, EPD_BLACK);
  drawString("memry-setup", 42, 163, 2);

  // White text inside black box — redraw with white
  auto drawStringColor = [&](const char* s, int x, int y, int scale, uint8_t color) {
    char upper[64]; strncpy(upper, s, 63); upper[63]=0;
    for (int i = 0; upper[i]; i++) if (upper[i]>='a'&&upper[i]<='z') upper[i]-=32;
    int cx = x;
    for (int i = 0; upper[i]; i++) {
      if (upper[i] < ' ' || upper[i] > 'Z') { cx += (5+1)*scale; continue; }
      const uint8_t* glyph = FONT5X7[upper[i]-' '];
      for (int col = 0; col < 5; col++)
        for (int row = 0; row < 7; row++)
          if (glyph[col] & (1 << row))
            for (int sy = 0; sy < scale; sy++)
              for (int sx = 0; sx < scale; sx++)
                setPixel(cx+col*scale+sx, y+row*scale+sy, color);
      cx += (5+1)*scale;
    }
  };
  drawStringColor("memry-setup", 42, 163, 2, EPD_WHITE);

  drawString("3. setup page will open", 40, 200, 1);
  drawString("4. enter your wifi password", 40, 218, 1);

  drawString(DEVICE_ID, 40, 340, 1);
  drawString("memry", 40, 358, 1);

  epdRenderRotated(fb, bufSize);
  free(fb);
}

// ──────────────────────────────────────────────────────────────
void goSleep(int hours) {
  Serial.printf("Sleeping %dh...\n\n", hours);
  Serial.flush();
  esp_sleep_enable_timer_wakeup((uint64_t)hours * 3600ULL * 1000000ULL);
  esp_deep_sleep_start();
}
