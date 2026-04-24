# MEMRY — Setup Guide

Complete instructions from zero to a running portal with devices polling it.

---

## 1. Supabase project

1. Go to [app.supabase.com](https://app.supabase.com) → **New project**
2. Name it `memry`, pick a region close to Pune (Mumbai / Singapore)
3. Wait for provisioning (~2 min)

### Run the schema

**SQL Editor → New query** → paste the entire contents of `supabase-schema.sql` → **Run**

You should see: "Success. No rows returned."

### Create the storage bucket

**Storage → New bucket**

| Field | Value |
|---|---|
| Name | `photos` |
| Public | ❌ (private) |
| File size limit | 10 MB |
| Allowed MIME types | `application/octet-stream, image/jpeg, image/png, image/webp, image/heic` |

### Enable Google OAuth (optional)

**Authentication → Providers → Google**

- Toggle enabled
- Add your Google OAuth Client ID + Secret
- Authorised redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`

### Copy credentials

**Settings → API**

Copy these three values into `.env.local`:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Local development

```bash
# Install dependencies
npm install

# Copy and fill env vars
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
# → http://localhost:3000
```

**In Supabase Authentication → URL Configuration:**
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

---

## 3. Deploy to Vercel

```bash
# Install Vercel CLI (once)
npm i -g vercel

# Deploy
vercel --prod
```

When prompted, add environment variables from `.env.local`.

Or add them in the Vercel dashboard: **Project → Settings → Environment Variables**

**After deploying, update Supabase:**

Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Add redirect URL: `https://your-app.vercel.app/auth/callback`

---

## 4. Connect firmware

In `firmware/config.h`, update:

```cpp
#define SERVER_URL "https://your-app.vercel.app"
```

The device polls:
```
GET https://your-app.vercel.app/api/device/memry-001/current-image
```

Headers sent by firmware:
```
If-None-Match:  "memry-{photo_uuid}"   ← ETag from last fetch
X-Battery-Mv:   3850                    ← ADC battery reading
```

Responses:
```
200  Raw 4bpp binary (120 000 bytes)
     ETag: "memry-{photo_uuid}"
     X-Sleep-Hours: 4

304  Not modified — device skips render, goes back to sleep
     ETag: "memry-{photo_uuid}"
     X-Sleep-Hours: 4

404  No active photo — device sleeps and retries next cycle
```

---

## 5. First-run flow

1. Sign up at `https://your-app.vercel.app/auth`
2. Dashboard → **Pair device** → enter the 3-digit ID from your device sticker
3. Dashboard → **Upload photo** → drop a photo → select device → **Send to fridge**
4. Device wakes on its next cycle, fetches the image, renders it (19s for Spectra 6), sleeps

---

## 6. Image pipeline

What happens when you upload a photo:

```
Your photo (any format/size)
  │
  ▼ Sharp.js resize
  600 × 400 px (cover, centre crop)
  │
  ▼ Floyd-Steinberg dithering
  Quantised to Spectra 6 palette:
    0x0  Black   #1A140E
    0x1  White   #F5F0E8
    0x2  Green   #3D6B43
    0x3  Blue    #1E3A5A
    0x4  Red     #B84A2A
    0x5  Yellow  #C9A96E
  │
  ▼ Pack as 4bpp
  2 pixels per byte → 120 000 bytes total
  │
  ├→ Supabase Storage: processed/{device_id}/{photo_id}.bin  ← firmware fetches this
  └→ Supabase Storage: previews/{device_id}/{photo_id}.jpg   ← dashboard thumbnails
```

The upload page shows a **live client-side preview** of this process using the same
Floyd-Steinberg algorithm running in the browser — what you see is exactly what the
display will render.

---

## 7. Database schema

```
devices         id, name, owner_id, sleep_hours, display_type
photos          id, device_id, uploaded_by, storage_path, preview_path, caption, is_active
device_pings    device_id, last_request, battery_mv
device_settings device_id, rotation_mode, rotation_hours, show_caption
contributors    device_id, user_id, invited_by
```

All tables have Row Level Security enabled. The device API uses the
`service_role` key (bypasses RLS) to serve images without user auth.

---

## 8. Project structure

```
memry-web/
├── app/
│   ├── page.tsx                      → / (landing or dashboard redirect)
│   ├── landing/page.tsx              → Landing page with 3D Polaroid
│   ├── auth/
│   │   ├── page.tsx                  → Sign in / sign up / forgot password
│   │   ├── callback/route.ts         → OAuth callback
│   │   └── signout/route.ts          → POST sign out
│   ├── dashboard/
│   │   ├── layout.tsx                → Auth guard + sidebar
│   │   ├── page.tsx                  → Overview — device cards + stats
│   │   ├── upload/page.tsx           → Upload + live e-ink preview
│   │   ├── library/page.tsx          → Photo grid — filter, activate, delete
│   │   ├── contributors/page.tsx     → Manage contributors across devices
│   │   ├── settings/page.tsx         → Account settings
│   │   └── devices/
│   │       ├── page.tsx              → Device list
│   │       ├── pair/page.tsx         → 3-step pairing flow
│   │       └── [id]/page.tsx         → Device settings + contributors
│   └── api/
│       ├── device/[id]/route.ts      ← FIRMWARE POLLS THIS
│       ├── devices/route.ts          → GET all devices
│       ├── devices/[id]/route.ts     → PATCH name/settings, DELETE
│       ├── photos/upload/route.ts    → POST upload + process
│       ├── photos/[id]/route.ts      → DELETE photo + storage
│       ├── photos/[id]/activate/     → PATCH set active
│       ├── preview/[...path]/        → Signed URL proxy
│       └── activity/route.ts         → GET recent events
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/Topbar.tsx
│   └── polaroid/Polaroid.tsx
├── lib/
│   ├── supabase-browser.ts           → Browser Supabase client
│   ├── supabase-server.ts            → Server + admin Supabase clients
│   └── imageProcess.ts              → Sharp + Floyd-Steinberg + 4bpp
├── types/index.ts                    → All TypeScript types
├── middleware.ts                     → Auth redirect guard
├── supabase-schema.sql               → Run once in Supabase SQL Editor
└── SETUP.md                          → This file
```

---

## 9. What's not yet built

These are the next things to add when the hardware ships:

- **Contributor invite by email** — needs a Supabase Edge Function to look up
  users by email server-side (the `auth.users` table is not accessible from
  client-side RLS). See `supabase/functions/invite/index.ts` for a template.

- **Auto-rotation** — when `device_settings.rotation_mode = 'auto'`, a
  scheduled job (Supabase pg_cron or Vercel Cron) should rotate the active
  photo on the configured interval.

- **Push on upload** — instead of waiting for the next deep-sleep wake, a
  WebSocket or Server-Sent Events endpoint could tell the device to wake early.
  Requires firmware changes to keep WiFi active briefly after render.

- **Activity feed on dashboard** — wire the `/api/activity` route into the
  dashboard page's activity section (data fetching is done, UI exists).

---

*MEMRY · v1.0 · Built in Pune · July 2025*
