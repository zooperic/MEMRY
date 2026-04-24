-- ─────────────────────────────────────────────────────────────
--  MEMRY — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New query
--  Order matters — run top to bottom.
-- ─────────────────────────────────────────────────────────────

-- ── DEVICES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id            TEXT PRIMARY KEY,          -- 'memry-001'
  name          TEXT NOT NULL,             -- 'Jo's Kitchen'
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sleep_hours   INT  NOT NULL DEFAULT 4,
  display_type  TEXT NOT NULL DEFAULT 'color' CHECK (display_type IN ('color','bw')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PHOTOS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  storage_path    TEXT NOT NULL,           -- processed/{device_id}/{photo_id}.bin
  preview_path    TEXT NOT NULL,           -- previews/{device_id}/{photo_id}.jpg
  caption         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active photo per device at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_photo_per_device
  ON photos (device_id) WHERE is_active = TRUE;

-- ── DEVICE SETTINGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_settings (
  device_id       TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  rotation_mode   TEXT NOT NULL DEFAULT 'manual' CHECK (rotation_mode IN ('manual','auto')),
  rotation_hours  INT  NOT NULL DEFAULT 24,
  show_caption    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── CONTRIBUTORS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributors (
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, user_id)
);

-- ── DEVICE PINGS (last seen + battery) ───────────────────────
CREATE TABLE IF NOT EXISTS device_pings (
  device_id    TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  last_request TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  battery_mv   INT          -- millivolts, null if not reported
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_pings    ENABLE ROW LEVEL SECURITY;

-- Devices: owners see their own; contributors see invited devices
CREATE POLICY "owner can manage devices"
  ON devices FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "contributor can view device"
  ON devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contributors
      WHERE contributors.device_id = devices.id
        AND contributors.user_id = auth.uid()
    )
  );

-- Photos: owner sees all photos for their devices
CREATE POLICY "owner can manage photos"
  ON photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = photos.device_id
        AND devices.owner_id = auth.uid()
    )
  );

-- Contributor can view + insert photos for their devices
CREATE POLICY "contributor can view photos"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contributors
      WHERE contributors.device_id = photos.device_id
        AND contributors.user_id = auth.uid()
    )
  );

CREATE POLICY "contributor can upload photos"
  ON photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contributors
      WHERE contributors.device_id = photos.device_id
        AND contributors.user_id = auth.uid()
    )
  );

-- Device settings
CREATE POLICY "owner can manage settings"
  ON device_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_settings.device_id
        AND devices.owner_id = auth.uid()
    )
  );

-- Contributors
CREATE POLICY "owner manages contributors"
  ON contributors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = contributors.device_id
        AND devices.owner_id = auth.uid()
    )
  );

CREATE POLICY "contributor sees own entry"
  ON contributors FOR SELECT
  USING (user_id = auth.uid());

-- Device pings: readable by owner + contributors; written by service role only
CREATE POLICY "owner sees pings"
  ON device_pings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_pings.device_id
        AND devices.owner_id = auth.uid()
    )
  );

-- ── STORAGE BUCKETS ────────────────────────────────────────────
-- Run these separately or via Supabase dashboard:
--
-- CREATE BUCKET photos (private, 10MB file limit)
-- Allowed MIME types: application/octet-stream, image/jpeg, image/png
--
-- Storage policy — service role can read/write all.
-- Signed URLs generated server-side for dashboard previews.

-- ── HELPER FUNCTIONS ──────────────────────────────────────────

-- Auto-create device_settings row when device is inserted
CREATE OR REPLACE FUNCTION create_device_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO device_settings (device_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_device_created
  AFTER INSERT ON devices
  FOR EACH ROW EXECUTE FUNCTION create_device_settings();

-- ─────────────────────────────────────────────────────────────
--  SETUP CHECKLIST (do these in Supabase dashboard after running SQL above):
--
--  1. Storage → New bucket → "photos" → Private → 10MB limit
--     Allowed types: application/octet-stream, image/jpeg, image/png
--
--  2. Authentication → Providers → Google → enable + add Client ID/Secret
--     Redirect URL: https://yourproject.supabase.co/auth/v1/callback
--
--  3. Authentication → URL Configuration:
--     Site URL: https://your-vercel-url.vercel.app
--     Redirect URLs: https://your-vercel-url.vercel.app/auth/callback
--
--  4. Copy project URL + anon key + service_role key to .env.local
-- ─────────────────────────────────────────────────────────────
