// ─────────────────────────────────────────────────────────────
//  MEMRY — config.h
//  Display: Waveshare 3.6" e-Paper HAT+ (E), SKU 32650
//           Spectra 6, 600×400, 6-color, 4bpp
//  Board:   Seeed XIAO ESP32C3
//
//  Only change DEVICE_ID per unit. WiFi creds entered via
//  provisioning portal on first boot — not stored here.
// ─────────────────────────────────────────────────────────────
#pragma once

// ── Device identity (change per unit: 001, 002, 003, 004) ────
#define DEVICE_ID     "memry-001"

// ── Server ────────────────────────────────────────────────────
// Dev:  your laptop LAN IP e.g. "http://192.168.1.42:3001"
// Prod: "https://api.memry.app"
#define SERVER_URL    "http://192.168.1.42:3001"

// ── WiFi ──────────────────────────────────────────────────────
#define WIFI_RETRIES                  3
#define WIFI_TIMEOUT_MS               20000
#define WIFI_FAILS_BEFORE_REPROVISION 5

// ── Sleep ─────────────────────────────────────────────────────
#define SLEEP_HOURS_DEFAULT           4
#define SLEEP_HOURS_ON_ERROR          1

// ── HTTP ──────────────────────────────────────────────────────
#define HTTP_TIMEOUT_MS               30000
// 600×400 @ 4bpp = 120,000 bytes. Add headroom for any framing.
#define MAX_IMAGE_BYTES               131072   // 128KB cap

// ── Pin mapping — XIAO ESP32C3 → Waveshare HAT+ breakout ─────
//
//  Use the 9-pin breakout connector on the RIGHT side of the
//  HAT+ PCB (NOT the 40-pin Pi header).
//
//  HAT+ breakout   XIAO ESP32C3
//  ─────────────────────────────────────────
//  GND          →  GND
//  VCC          →  3.3V
//  DIN (MOSI)   →  D10  (GPIO3)
//  CLK (SCK)    →  D8   (GPIO2)
//  CS           →  D7   (GPIO20)
//  DC           →  D3   (GPIO21)
//  RST          →  D0   (GPIO9)
//  BUSY         ←  D1   (GPIO10)
//  PWR          →  3.3V  (must be HIGH or display won't power on)
//
//  ⚠️  PWR pin: tie to 3.3V. Without it the display stays dark.
//  ⚠️  Interface switch on HAT+ PCB: leave at 0 (4-line SPI).
//
#define PIN_DIN   D10   // GPIO3  — SPI MOSI
#define PIN_CLK   D8    // GPIO2  — SPI SCK
#define PIN_CS    D7    // GPIO20
#define PIN_DC    D3    // GPIO21
#define PIN_RST   D0    // GPIO9
#define PIN_BUSY  D1    // GPIO10
// PWR: wire directly to 3.3V on breadboard — no GPIO needed
