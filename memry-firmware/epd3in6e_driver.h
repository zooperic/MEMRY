// ─────────────────────────────────────────────────────────────
//  MEMRY — epd3in6e_driver.h
//  Driver for Waveshare 3.6" e-Paper HAT+ (E), SKU 32650
//  E Ink Spectra 6, 600×400, 6-color
//
//  Image format from server (4bpp packed):
//    · 2 pixels per byte
//    · High nibble = left pixel, low nibble = right pixel
//    · Color index: Black=0, White=1, Green=2, Blue=3, Red=4, Yellow=5
//    · Total bytes for 600×400: 600*400/2 = 120,000 bytes
//
//  This file contains:
//    · Low-level SPI send functions
//    · Display init, clear, sleep sequences
//    · Image render (streams 4bpp buffer to display)
//
//  Based on Waveshare's official epd3in6e Arduino demo,
//  adapted for XIAO ESP32C3 pin mapping and our image format.
// ─────────────────────────────────────────────────────────────
#pragma once

#include <SPI.h>
#include <Arduino.h>
#include "config.h"

// ── Display constants ─────────────────────────────────────────
#define EPD_WIDTH   600
#define EPD_HEIGHT  400

// Color indices (match server-side image pipeline)
#define EPD_BLACK   0x0
#define EPD_WHITE   0x1
#define EPD_GREEN   0x2
#define EPD_BLUE    0x3
#define EPD_RED     0x4
#define EPD_YELLOW  0x5

// ── SPI primitives ────────────────────────────────────────────

static void _epdSendCommand(uint8_t cmd) {
  digitalWrite(PIN_DC, LOW);
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(cmd);
  digitalWrite(PIN_CS, HIGH);
}

static void _epdSendData(uint8_t data) {
  digitalWrite(PIN_DC, HIGH);
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(data);
  digitalWrite(PIN_CS, HIGH);
}

static void _epdSendDataBuf(const uint8_t* buf, size_t len) {
  digitalWrite(PIN_DC, HIGH);
  digitalWrite(PIN_CS, LOW);
  SPI.transferBytes(buf, nullptr, len);
  digitalWrite(PIN_CS, HIGH);
}

static void _epdWaitBusy() {
  // BUSY is HIGH while the display is processing
  // Poll until it goes LOW (idle)
  uint32_t t0 = millis();
  while (digitalRead(PIN_BUSY) == HIGH) {
    if (millis() - t0 > 30000) {
      Serial.println("EPD BUSY timeout!");
      break;
    }
    delay(10);
  }
}

static void _epdReset() {
  digitalWrite(PIN_RST, HIGH);
  delay(20);
  digitalWrite(PIN_RST, LOW);
  delay(2);
  digitalWrite(PIN_RST, HIGH);
  delay(20);
  _epdWaitBusy();
}

// ── Public API ────────────────────────────────────────────────

void epdInit() {
  // Setup pins
  pinMode(PIN_CS,   OUTPUT);
  pinMode(PIN_DC,   OUTPUT);
  pinMode(PIN_RST,  OUTPUT);
  pinMode(PIN_BUSY, INPUT);
  digitalWrite(PIN_CS, HIGH);

  // Init SPI — XIAO ESP32C3 hardware SPI
  SPI.begin(PIN_CLK, -1, PIN_DIN, PIN_CS);
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));

  _epdReset();

  // Power on sequence (from Waveshare epd3in6e demo)
  _epdSendCommand(0x00);  // Panel setting
  _epdSendData(0xEF);
  _epdSendData(0x08);

  _epdSendCommand(0x01);  // Power setting
  _epdSendData(0x37);
  _epdSendData(0x00);
  _epdSendData(0x23);
  _epdSendData(0x23);

  _epdSendCommand(0x03);  // Power off sequence
  _epdSendData(0x00);

  _epdSendCommand(0x06);  // Booster soft start
  _epdSendData(0xC7);
  _epdSendData(0xC7);
  _epdSendData(0x1D);

  _epdSendCommand(0x30);  // PLL control
  _epdSendData(0x3C);

  _epdSendCommand(0x41);  // Temperature sensor selection (internal)
  _epdSendData(0x00);

  _epdSendCommand(0x50);  // VCOM and data interval setting
  _epdSendData(0x37);

  _epdSendCommand(0x60);  // TCON setting
  _epdSendData(0x22);

  _epdSendCommand(0x61);  // Resolution setting
  _epdSendData(EPD_WIDTH >> 8);
  _epdSendData(EPD_WIDTH & 0xFF);
  _epdSendData(EPD_HEIGHT >> 8);
  _epdSendData(EPD_HEIGHT & 0xFF);

  _epdSendCommand(0xE3);  // PWS setting
  _epdSendData(0xAA);

  delay(100);

  _epdSendCommand(0x50);
  _epdSendData(0x37);

  Serial.println("EPD init done");
}

// ── Clear display to white ────────────────────────────────────
void epdClear() {
  _epdSendCommand(0x61);  // Resolution
  _epdSendData(EPD_WIDTH >> 8);
  _epdSendData(EPD_WIDTH & 0xFF);
  _epdSendData(EPD_HEIGHT >> 8);
  _epdSendData(EPD_HEIGHT & 0xFF);

  _epdSendCommand(0x10);  // Start data transmission

  // White = 0x11 (two white pixels per byte)
  const size_t bytes = (EPD_WIDTH * EPD_HEIGHT) / 2;
  for (size_t i = 0; i < bytes; i++) {
    _epdSendData(0x11);
  }

  _epdSendCommand(0x04);  // Power on
  _epdWaitBusy();
  _epdSendCommand(0x12);  // Refresh
  _epdWaitBusy();
  _epdSendCommand(0x02);  // Power off
  _epdWaitBusy();

  Serial.println("EPD cleared");
}

// ── Render image from 4bpp packed buffer ─────────────────────
//
//  buf: server image buffer, 120,000 bytes for 600×400
//  len: must be exactly (EPD_WIDTH * EPD_HEIGHT) / 2
//
//  The display expects exactly the same 4bpp format we receive
//  from the server, so we stream it directly. No pixel-by-pixel
//  conversion needed.
//
//  Rotation: call epdRenderRotated() for portrait orientation.
//
void epdRender(const uint8_t* buf, size_t len) {
  const size_t expected = (EPD_WIDTH * EPD_HEIGHT) / 2;

  if (len != expected) {
    Serial.printf("EPD render: bad buffer size %u, expected %u\n", len, expected);
    return;
  }

  Serial.printf("EPD rendering %u bytes...\n", len);
  uint32_t t0 = millis();

  _epdSendCommand(0x61);  // Resolution
  _epdSendData(EPD_WIDTH >> 8);
  _epdSendData(EPD_WIDTH & 0xFF);
  _epdSendData(EPD_HEIGHT >> 8);
  _epdSendData(EPD_HEIGHT & 0xFF);

  _epdSendCommand(0x10);  // Data transmission start

  // Stream in chunks to avoid SPI buffer limits
  const size_t CHUNK = 4096;
  size_t sent = 0;
  while (sent < len) {
    size_t chunk = min(CHUNK, len - sent);
    _epdSendDataBuf(buf + sent, chunk);
    sent += chunk;
  }

  _epdSendCommand(0x04);  // Power on
  _epdWaitBusy();

  _epdSendCommand(0x12);  // Refresh — this takes ~19s for Spectra 6
  Serial.println("EPD refreshing (this takes ~19s)...");
  _epdWaitBusy();

  _epdSendCommand(0x02);  // Power off
  _epdWaitBusy();

  Serial.printf("EPD render done in %lums\n", millis() - t0);
}

// ── Render with 90° rotation (landscape buffer → portrait display)
//
//  Call this instead of epdRender() if the display is mounted
//  portrait in the shell (panel's native orientation is landscape).
//
//  Rotates a 600×400 source image to 400×600 output.
//  Uses a temporary heap buffer — needs 120KB free RAM.
//  XIAO ESP32C3 has 400KB RAM, so this is fine.
//
void epdRenderRotated(const uint8_t* buf, size_t len) {
  const int SRC_W = EPD_WIDTH;   // 600
  const int SRC_H = EPD_HEIGHT;  // 400
  // After 90° CW rotation: dst is 400 wide × 600 tall
  const int DST_W = SRC_H;       // 400
  const int DST_H = SRC_W;       // 600
  const size_t dstLen = (DST_W * DST_H) / 2;

  if (len != (size_t)(SRC_W * SRC_H) / 2) {
    Serial.printf("epdRenderRotated: bad src size %u\n", len);
    return;
  }

  uint8_t* rotated = (uint8_t*)malloc(dstLen);
  if (!rotated) {
    Serial.println("epdRenderRotated: malloc failed, falling back to unrotated");
    epdRender(buf, len);
    return;
  }

  // Helper: get 4-bit nibble from packed buffer
  auto getNibble = [&](const uint8_t* b, int x, int y, int stride) -> uint8_t {
    int idx = y * stride + x;
    if (idx % 2 == 0) return (b[idx / 2] >> 4) & 0xF;
    else              return  b[idx / 2]        & 0xF;
  };

  // Helper: set nibble in packed buffer
  auto setNibble = [&](uint8_t* b, int x, int y, int stride, uint8_t val) {
    int idx = y * stride + x;
    if (idx % 2 == 0) b[idx / 2] = (b[idx / 2] & 0x0F) | ((val & 0xF) << 4);
    else              b[idx / 2] = (b[idx / 2] & 0xF0) |  (val & 0xF);
  };

  // 90° clockwise: dst(x, y) = src(SRC_H - 1 - y, x)
  for (int sy = 0; sy < SRC_H; sy++) {
    for (int sx = 0; sx < SRC_W; sx++) {
      uint8_t px = getNibble(buf, sx, sy, SRC_W);
      int dx = DST_W - 1 - sy;
      int dy = sx;
      setNibble(rotated, dx, dy, DST_W, px);
    }
  }

  // Send with updated resolution (now 400×600)
  Serial.printf("EPD rendering rotated %u bytes (400×600)...\n", dstLen);
  uint32_t t0 = millis();

  _epdSendCommand(0x61);
  _epdSendData(DST_W >> 8);
  _epdSendData(DST_W & 0xFF);
  _epdSendData(DST_H >> 8);
  _epdSendData(DST_H & 0xFF);

  _epdSendCommand(0x10);

  const size_t CHUNK = 4096;
  size_t sent = 0;
  while (sent < dstLen) {
    size_t chunk = min(CHUNK, dstLen - sent);
    _epdSendDataBuf(rotated + sent, chunk);
    sent += chunk;
  }

  free(rotated);

  _epdSendCommand(0x04);
  _epdWaitBusy();
  _epdSendCommand(0x12);
  Serial.println("EPD refreshing rotated (this takes ~19s)...");
  _epdWaitBusy();
  _epdSendCommand(0x02);
  _epdWaitBusy();

  Serial.printf("EPD rotated render done in %lums\n", millis() - t0);
}

// ── Sleep (display holds image at 0 power) ────────────────────
void epdSleep() {
  _epdSendCommand(0x07);  // Deep sleep
  _epdSendData(0xA5);
  delay(100);
  digitalWrite(PIN_RST, LOW);  // Hold RST low in deep sleep
  Serial.println("EPD sleeping");
}
