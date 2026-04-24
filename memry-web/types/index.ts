// ─────────────────────────────────────────────────────────────
//  MEMRY — shared TypeScript types
//  Mirrors the DB schema in ARCHITECTURE.md exactly
// ─────────────────────────────────────────────────────────────

export type DeviceStatus = 'online' | 'offline' | 'sleeping'
export type DisplayType  = 'color' | 'bw'
export type RotationMode = 'manual' | 'auto'
export type UserRole     = 'owner' | 'contributor'

// ── DATABASE ROWS ─────────────────────────────────────────────

export interface Device {
  id: string               // 'memry-001'
  name: string             // 'Jo's Kitchen'
  owner_id: string         // UUID
  sleep_hours: number      // 4
  display_type: DisplayType
  created_at: string
}

export interface Photo {
  id: string               // UUID
  device_id: string
  uploaded_by: string      // UUID
  storage_path: string     // /processed/{device_id}/{photo_id}.bin
  preview_path: string     // /previews/{device_id}/{photo_id}.jpg
  caption: string | null
  is_active: boolean
  created_at: string
}

export interface DeviceSettings {
  device_id: string
  rotation_mode: RotationMode
  rotation_hours: number
}

export interface Contributor {
  device_id: string
  user_id: string
  invited_by: string
}

// ── ENRICHED TYPES (joined queries) ──────────────────────────

export interface DeviceWithStatus extends Device {
  status: DeviceStatus
  battery_mv: number | null      // millivolts from last ping
  last_seen: string | null       // ISO timestamp
  active_photo: Photo | null
  photo_count: number
}

export interface PhotoWithUploader extends Photo {
  uploader_name: string | null
  uploader_email: string | null
}

export interface ContributorWithUser extends Contributor {
  name: string | null
  email: string
  role: UserRole
}

// ── API TYPES ─────────────────────────────────────────────────

/** Sent by firmware in X-Battery-Mv header */
export interface DevicePing {
  device_id: string
  etag: string | null      // If-None-Match header value
  battery_mv: number | null
}

/** Returned to firmware */
export interface ImageResponse {
  etag: string
  sleep_hours: number
  // body: raw BMP bytes (binary)
}

// ── IMAGE PIPELINE ────────────────────────────────────────────

/** Spectra 6 colour index — matches firmware bmp_render.h */
export const SPECTRA6 = {
  BLACK:  0x0,
  WHITE:  0x1,
  GREEN:  0x2,
  BLUE:   0x3,
  RED:    0x4,
  YELLOW: 0x5,
} as const

export type Spectra6Index = typeof SPECTRA6[keyof typeof SPECTRA6]

/** RGB values of the 6 display colours */
export const SPECTRA6_RGB: [number, number, number][] = [
  [26,  20,  14],  // BLACK  #1A140E
  [245, 240, 232], // WHITE  #F5F0E8
  [61,  107, 67],  // GREEN  #3D6B43
  [30,  58,  90],  // BLUE   #1E3A5A
  [184, 74,  42],  // RED    #B84A2A
  [201, 169, 110], // YELLOW #C9A96E
]

export interface ProcessedImage {
  bin: Buffer          // 4bpp packed, 600×400 = 120,000 bytes
  preview: Buffer      // JPEG, 600×400
  width: number        // always 600
  height: number       // always 400
}

// ── UI STATE ─────────────────────────────────────────────────

export interface UploadState {
  file: File | null
  device_id: string | null
  caption: string
  status: 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error'
  error: string | null
  preview_url: string | null
}

export interface PairingState {
  step: 1 | 2 | 3 | 4
  device_id: string
  name: string
  location: string
  status: 'idle' | 'verifying' | 'confirmed' | 'error'
  error: string | null
}
