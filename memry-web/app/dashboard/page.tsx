import { createServerClientInstance } from "@/lib/supabase-server";
import Topbar from "@/components/layout/Topbar";
import DashboardGrid from "./DashboardGrid";

export const dynamic = "force-dynamic";

interface PhotoRow { id: string; is_active: boolean; preview_path: string; caption: string | null }
interface DeviceWithPhotos { id: string; name: string; sleep_hours: number; photos: PhotoRow[] }
interface PingRow { device_id: string; last_request: string | null; battery_mv: number | null }

async function getDevices(
  supabase: Awaited<ReturnType<typeof createServerClientInstance>>,
  userId: string
) {
  const { data: owned } = await supabase
    .from("devices")
    .select(
      `
      id, name, sleep_hours, display_type, created_at,
      photos(id, is_active, preview_path, caption)
    `
    )
    .eq("owner_id", userId);

  const { data: contrib } = await supabase
    .from("contributors")
    .select("device_id, devices(id, name)")
    .eq("user_id", userId);

  const deviceIds = (owned ?? []).map((d) => d.id);
  const { data: pings } = await supabase
    .from("device_pings")
    .select("device_id, last_request, battery_mv")
    .in("device_id", deviceIds);

  return { owned: owned ?? [], contrib: contrib ?? [], pings: pings ?? [] };
}

export default async function DashboardPage() {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { owned, pings } = await getDevices(supabase, user.id);

  const { count: photoCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .in("device_id", owned.map((d) => d.id));

  const { count: contribCount } = await supabase
    .from("contributors")
    .select("user_id", { count: "exact", head: true })
    .in("device_id", owned.map((d) => d.id));

  const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const onlineCount = owned.filter((d) => {
    const ping = pings.find((p) => p.device_id === d.id);
    if (!ping) return false;
    const diffH = (Date.now() - new Date(ping.last_request ?? "").getTime()) / 3600000;
    if (diffH < 0.5) return true;
    if (diffH < d.sleep_hours * 1.5) return false; // sleeping / offline handled in client
    return false;
  }).length;

  return (
    <>
      <Topbar
        breadcrumb="mem.ry"
        page="Dashboard"
        actions={
          <>
            <a href="/dashboard/devices/pair" className="btn-sm-ghost">
              + Pair device
            </a>
            <a href="/dashboard/upload" className="btn-sm-dark">
              ↑ Upload photo
            </a>
          </>
        }
      />
      <DashboardGrid
        owned={owned as unknown as DeviceWithPhotos[]}
        pings={pings as PingRow[]}
        onlineCount={onlineCount}
        photoCount={photoCount ?? 0}
        contribCount={contribCount ?? 0}
        greeting={greeting}
        name={name}
      />
    </>
  );
}