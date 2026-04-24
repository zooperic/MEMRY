// ─────────────────────────────────────────────────────────────
//  MEMRY — bmp_render.h
//  Renders a 1-bit Windows BMP (400×300) into a GxEPD2 display.
//
//  BMP format recap (what the server sends):
//    Offset 0    : "BM" signature
//    Offset 10   : pixel data offset (uint32)
//    Offset 18   : width  (int32)
//    Offset 22   : height (int32, negative = top-down)
//    Offset 28   : bits per pixel (uint16, must be 1)
//    Offset 34   : image size in bytes (uint32)
//    Pixel data  : rows bottom-up by default, padded to 4-byte boundary
//                  1 bit per pixel, 0 = black, 1 = white (Windows BMP convention)
// ─────────────────────────────────────────────────────────────
#pragma once

#include <GxEPD2_BW.h>

// Read a little-endian uint16 from buffer at offset
static inline uint16_t readU16(const uint8_t* buf, int offset) {
  return (uint16_t)(buf[offset]) | ((uint16_t)(buf[offset + 1]) << 8);
}

// Read a little-endian int32 from buffer at offset
static inline int32_t readI32(const uint8_t* buf, int offset) {
  return (int32_t)(buf[offset])
       | ((int32_t)(buf[offset + 1]) << 8)
       | ((int32_t)(buf[offset + 2]) << 16)
       | ((int32_t)(buf[offset + 3]) << 24);
}

static inline uint32_t readU32(const uint8_t* buf, int offset) {
  return (uint32_t)readI32(buf, offset);
}

// ──────────────────────────────────────────────────────────────
//  renderBMP — call inside display.firstPage() / nextPage() loop
//
//  Template parameter D: the GxEPD2 display type
// ──────────────────────────────────────────────────────────────
template<typename D>
void renderBMP(const uint8_t* buf, size_t len, D& display) {

  // ── Validate BMP header ─────────────────────────────────────
  if (len < 54) {
    Serial.println("BMP: too small");
    return;
  }
  if (buf[0] != 'B' || buf[1] != 'M') {
    Serial.println("BMP: bad signature");
    return;
  }

  uint32_t pixelOffset = readU32(buf, 10);
  int32_t  bmpWidth    = readI32(buf, 18);
  int32_t  bmpHeight   = readI32(buf, 22);
  uint16_t bpp         = readU16(buf, 28);

  bool topDown = (bmpHeight < 0);
  if (topDown) bmpHeight = -bmpHeight;

  Serial.printf("BMP: %dx%d, bpp=%d, offset=%u, topDown=%d\n",
                bmpWidth, bmpHeight, bpp, pixelOffset, topDown);

  if (bpp != 1) {
    Serial.printf("BMP: expected 1bpp, got %d\n", bpp);
    return;
  }
  if (pixelOffset >= len) {
    Serial.println("BMP: pixel offset out of range");
    return;
  }

  // Row stride: each row padded to 4-byte boundary
  // For 1bpp: ceil(width / 8) bytes, rounded up to multiple of 4
  uint32_t rowBytes = ((bmpWidth + 31) / 32) * 4;

  // ── Draw pixels ─────────────────────────────────────────────
  // GxEPD2 coordinate origin: top-left
  // BMP default: bottom-up (row 0 = bottom of image)

  for (int32_t row = 0; row < bmpHeight; row++) {
    // Map BMP row → display row
    int32_t displayRow = topDown ? row : (bmpHeight - 1 - row);

    const uint8_t* rowPtr = buf + pixelOffset + (uint32_t)row * rowBytes;

    for (int32_t col = 0; col < bmpWidth; col++) {
      // Extract bit: MSB first within each byte
      uint8_t byteVal = rowPtr[col / 8];
      uint8_t bitMask = 0x80 >> (col % 8);
      bool    isWhite = (byteVal & bitMask) != 0;

      // BMP 1bpp: color table entry 0 = black, 1 = white
      // (standard Windows 1bpp BMP from server)
      uint16_t color = isWhite ? GxEPD_WHITE : GxEPD_BLACK;
      display.drawPixel(col, displayRow, color);
    }
  }
}
