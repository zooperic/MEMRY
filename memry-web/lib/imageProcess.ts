// ─────────────────────────────────────────────────────────────
//  MEMRY — Image Processing Pipeline
//
//  Flow:
//    Buffer (any format)
//      → Sharp resize to 600×400 (cover, centre crop)
//      → For each pixel: find nearest Spectra 6 colour
//        using Floyd-Steinberg dithering
//      → Pack as 4bpp (2px/byte): high nibble = px0, low nibble = px1
//      → Also produce a JPEG preview at 600×400
//
//  Output: { bin: Buffer, preview: Buffer }
//
//  The 4bpp format matches what bmp_render.h / color_render.h
//  expects on the firmware side.
// ─────────────────────────────────────────────────────────────

import sharp from 'sharp'
import { SPECTRA6_RGB, ProcessedImage } from '@/types'

// ── Constants ──────────────────────────────────────────────────
const W = 600
const H = 400
const PIXELS = W * H
const BIN_SIZE = PIXELS / 2  // 4bpp: 2 pixels per byte = 120,000 bytes

// ── Nearest colour (Euclidean in RGB) ─────────────────────────
function nearestSpectra6(r: number, g: number, b: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < SPECTRA6_RGB.length; i++) {
    const [pr, pg, pb] = SPECTRA6_RGB[i]
    const dr = r - pr, dg = g - pg, db = b - pb
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) { bestDist = dist; best = i }
  }
  return best
}

// ── Floyd-Steinberg dither + quantise ────────────────────────
function quantise(pixels: Uint8Array /* RGBA, W×H */): Uint8Array {
  // Work in floating-point to accumulate error
  const r = new Float32Array(PIXELS)
  const g = new Float32Array(PIXELS)
  const b = new Float32Array(PIXELS)

  for (let i = 0; i < PIXELS; i++) {
    r[i] = pixels[i * 4]
    g[i] = pixels[i * 4 + 1]
    b[i] = pixels[i * 4 + 2]
  }

  const indices = new Uint8Array(PIXELS)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      const or = Math.max(0, Math.min(255, r[idx]))
      const og = Math.max(0, Math.min(255, g[idx]))
      const ob = Math.max(0, Math.min(255, b[idx]))

      const ci = nearestSpectra6(or, og, ob)
      indices[idx] = ci

      const [nr, ng, nb] = SPECTRA6_RGB[ci]
      const er = or - nr, eg = og - ng, eb = ob - nb

      // Distribute error to neighbours (Floyd-Steinberg)
      const spread = (ex: number, ey: number, factor: number) => {
        if (ex < 0 || ex >= W || ey >= H) return
        const ni = ey * W + ex
        r[ni] += er * factor
        g[ni] += eg * factor
        b[ni] += eb * factor
      }
      spread(x + 1, y,     7 / 16)
      spread(x - 1, y + 1, 3 / 16)
      spread(x,     y + 1, 5 / 16)
      spread(x + 1, y + 1, 1 / 16)
    }
  }

  return indices
}

// ── Pack 4bpp ─────────────────────────────────────────────────
// High nibble = even pixel, Low nibble = odd pixel
// Matches firmware color_render.h expectation
function pack4bpp(indices: Uint8Array): Buffer {
  const out = Buffer.alloc(BIN_SIZE, 0)
  for (let i = 0; i < PIXELS; i += 2) {
    out[i >> 1] = ((indices[i] & 0x0f) << 4) | (indices[i + 1] & 0x0f)
  }
  return out
}

// ── Main pipeline ──────────────────────────────────────────────
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // Resize to 600×400 cover (sharp handles JPEG / PNG / HEIC / WebP)
  const resized = await sharp(input)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  let rawPixels: Uint8Array

  // sharp .raw() returns RGB (3 channels) — we need RGBA
  if (resized.info.channels === 3) {
    rawPixels = new Uint8Array(PIXELS * 4)
    for (let i = 0; i < PIXELS; i++) {
      rawPixels[i * 4]     = resized.data[i * 3]
      rawPixels[i * 4 + 1] = resized.data[i * 3 + 1]
      rawPixels[i * 4 + 2] = resized.data[i * 3 + 2]
      rawPixels[i * 4 + 3] = 255
    }
  } else {
    rawPixels = new Uint8Array(resized.data.buffer)
  }

  // Quantise + dither
  const indices = quantise(rawPixels)

  // Pack to 4bpp binary
  const bin = pack4bpp(indices)

  // Generate JPEG preview from the quantised colours
  // (this shows exactly what e-ink will render)
  const previewRaw = Buffer.alloc(PIXELS * 3)
  for (let i = 0; i < PIXELS; i++) {
    const [pr, pg, pb] = SPECTRA6_RGB[indices[i]]
    previewRaw[i * 3]     = pr
    previewRaw[i * 3 + 1] = pg
    previewRaw[i * 3 + 2] = pb
  }

  const preview = await sharp(previewRaw, {
    raw: { width: W, height: H, channels: 3 },
  })
    .jpeg({ quality: 85 })
    .toBuffer()

  return { bin, preview, width: W, height: H }
}

// ── Storage paths ──────────────────────────────────────────────
export function binPath(deviceId: string, photoId: string) {
  return `processed/${deviceId}/${photoId}.bin`
}
export function previewPath(deviceId: string, photoId: string) {
  return `previews/${deviceId}/${photoId}.jpg`
}
