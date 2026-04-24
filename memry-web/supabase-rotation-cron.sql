-- ─────────────────────────────────────────────────────────────
--  MEMRY — Auto-rotation cron job
--  Requires: pg_cron extension (enabled in Supabase by default)
--
--  Run this in Supabase SQL Editor AFTER the main schema.
--  It rotates the active photo on any device where
--  rotation_mode = 'auto', every hour.
-- ─────────────────────────────────────────────────────────────

-- Enable pg_cron if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: rotate active photo for one device
CREATE OR REPLACE FUNCTION rotate_device_photo(p_device_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_current_id   UUID;
  v_next_id      UUID;
BEGIN
  -- Get current active photo
  SELECT id INTO v_current_id
  FROM photos
  WHERE device_id = p_device_id AND is_active = TRUE
  LIMIT 1;

  IF v_current_id IS NULL THEN
    -- No active photo — activate the most recent one
    SELECT id INTO v_next_id
    FROM photos
    WHERE device_id = p_device_id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    -- Get the next photo (circular: after current by created_at)
    SELECT id INTO v_next_id
    FROM photos
    WHERE device_id = p_device_id
      AND created_at > (SELECT created_at FROM photos WHERE id = v_current_id)
    ORDER BY created_at ASC
    LIMIT 1;

    -- If no next, wrap to oldest
    IF v_next_id IS NULL THEN
      SELECT id INTO v_next_id
      FROM photos
      WHERE device_id = p_device_id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_next_id IS NOT NULL AND v_next_id != COALESCE(v_current_id, gen_random_uuid()) THEN
    UPDATE photos SET is_active = FALSE WHERE device_id = p_device_id;
    UPDATE photos SET is_active = TRUE  WHERE id = v_next_id;
    RAISE NOTICE 'Rotated device % to photo %', p_device_id, v_next_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: rotate all devices due for rotation
CREATE OR REPLACE FUNCTION rotate_all_due_devices()
RETURNS VOID AS $$
DECLARE
  v_device RECORD;
BEGIN
  FOR v_device IN
    SELECT
      d.id,
      ds.rotation_hours,
      p.created_at AS active_since
    FROM devices d
    JOIN device_settings ds ON ds.device_id = d.id
    LEFT JOIN photos p ON p.device_id = d.id AND p.is_active = TRUE
    WHERE
      ds.rotation_mode = 'auto'
      AND (
        p.created_at IS NULL
        OR p.created_at < NOW() - (ds.rotation_hours || ' hours')::INTERVAL
      )
  LOOP
    PERFORM rotate_device_photo(v_device.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: run every hour
SELECT cron.schedule(
  'memry-auto-rotate',          -- job name
  '0 * * * *',                  -- every hour on the hour
  'SELECT rotate_all_due_devices()'
);

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job:
-- SELECT cron.unschedule('memry-auto-rotate');
