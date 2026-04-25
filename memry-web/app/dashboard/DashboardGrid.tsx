"use client";

import Link from "next/link";

interface PhotoRow { id: string; is_active: boolean; preview_path: string; caption: string | null }
interface DeviceWithPhotos { id: string; name: string; sleep_hours: number; photos: PhotoRow[] }
interface PingRow { device_id: string; last_request: string | null; battery_mv: number | null }

interface DashboardGridProps {
    owned: DeviceWithPhotos[];
    pings: PingRow[];
    onlineCount: number;
    photoCount: number;
    contribCount: number;
    greeting: string;
    name: string;
}

function getStatus(lastRequest: string | null, sleepHours: number): "online" | "sleeping" | "offline" {
    if (!lastRequest) return "offline";
    const diffH = (Date.now() - new Date(lastRequest).getTime()) / 3600000;
    if (diffH < 0.5) return "online";
    if (diffH < sleepHours * 1.5) return "sleeping";
    return "offline";
}

function batteryClass(mv: number | null) {
    if (!mv) return "mid";
    const pct = Math.round((mv - 3000) / (4200 - 3000) * 100);
    return pct > 60 ? "high" : pct > 25 ? "mid" : "low";
}

function batteryPct(mv: number | null) {
    if (!mv) return "--";
    return Math.min(100, Math.max(0, Math.round((mv - 3000) / (4200 - 3000) * 100))) + "%";
}

function timeAgo(ts: string | null) {
    if (!ts) return "Never";
    const diffMs = Date.now() - new Date(ts).getTime();
    const m = Math.round(diffMs / 60000);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
}

export default function DashboardGrid({
    owned,
    pings,
    onlineCount,
    photoCount,
    contribCount,
    greeting,
    name,
}: DashboardGridProps) {
    return (
        <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            {/* Page header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    marginBottom: 28,
                    paddingBottom: 24,
                    borderBottom: "1px solid var(--border)",
                }}
            >
                <div>
                    <div
                        style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 9,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: "var(--rust)",
                            marginBottom: 6,
                        }}
                    >
                        001 — overview
                    </div>
                    <h1
                        style={{
                            fontFamily: "Cormorant Garamond, serif",
                            fontSize: 52,
                            fontWeight: 300,
                            lineHeight: 0.95,
                            letterSpacing: "-1.5px",
                        }}
                    >
                        {greeting},<br />
                        <em style={{ fontStyle: "italic" }}>{name}.</em>
                    </h1>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div
                        style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--muted)",
                        }}
                    >
                        {owned.length} device{owned.length !== 1 ? "s" : ""} ·{" "}
                        <strong style={{ color: "var(--ink)" }}>{onlineCount} online</strong>
                    </div>
                </div>
            </div>

            {/* Summary stats */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    border: "1px solid var(--border)",
                    marginBottom: 32,
                    background: "var(--paper)",
                }}
            >
                {[
                    { label: "Total devices", val: owned.length, sub: `${onlineCount} online` },
                    { label: "Photos uploaded", val: photoCount ?? 0, sub: "Across all devices" },
                    { label: "Contributors", val: contribCount ?? 0, sub: "Active this week" },
                ].map((s, i) => (
                    <div
                        key={i}
                        style={{
                            padding: "24px 28px",
                            borderRight: i < 2 ? "1px solid var(--border)" : "none",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 8,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                color: "var(--muted)",
                                marginBottom: 8,
                            }}
                        >
                            {s.label}
                        </div>
                        <div
                            style={{
                                fontFamily: "Cormorant Garamond, serif",
                                fontSize: 36,
                                fontWeight: 300,
                                fontStyle: "italic",
                                color: "var(--rust)",
                                lineHeight: 1,
                                letterSpacing: "-1px",
                            }}
                        >
                            {s.val}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--muted-lt)",
                                fontWeight: 300,
                                marginTop: 4,
                            }}
                        >
                            {s.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* Section header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 20,
                }}
            >
                <div
                    style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    Your devices
                    <span
                        style={{
                            display: "block",
                            width: 40,
                            height: 1,
                            background: "var(--border)",
                        }}
                    />
                </div>
                <Link href="/dashboard/devices/pair" className="btn-sm-ghost">
                    + Pair new
                </Link>
            </div>

            {/* Device cards grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 24,
                    marginBottom: 40,
                }}
            >
                {owned.map((device) => {
                    const ping = pings.find((p) => p.device_id === device.id);
                    const status = getStatus(ping?.last_request ?? null, device.sleep_hours);
                    const bClass = batteryClass(ping?.battery_mv ?? null);
                    const bPct = batteryPct(ping?.battery_mv ?? null);
                    const lastSeen = timeAgo(ping?.last_request ?? null);
                    const photos = (device as DeviceWithPhotos).photos ?? [];
                    const activePhoto = photos.find((p: PhotoRow) => p.is_active);
                    const previewUrl = activePhoto?.preview_path
                        ? `/api/preview/${activePhoto.preview_path}`
                        : null;

                    const statusLabel =
                        status === "online" ? "Online" : status === "sleeping" ? "Sleeping" : "Offline";
                    const pillClass =
                        status === "online"
                            ? "pill-online"
                            : status === "sleeping"
                                ? "pill-sleeping"
                                : "pill-offline";

                    return (
                        <div
                            key={device.id}
                            style={{
                                background: "var(--paper)",
                                border: "1px solid var(--border)",
                                opacity: status === "offline" ? 0.65 : 1,
                                transition: "border-color 0.15s, box-shadow 0.15s",
                                cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.borderColor = "var(--ink)";
                                el.style.boxShadow = "4px 4px 0 var(--border)";
                            }}
                            onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.borderColor = "var(--border)";
                                el.style.boxShadow = "none";
                            }}
                        >
                            {/* Mini polaroid */}
                            <div
                                style={{
                                    padding: "20px 20px 0",
                                    display: "flex",
                                    justifyContent: "center",
                                    background: "var(--bg)",
                                    borderBottom: "1px solid var(--border)",
                                }}
                            >
                                <div
                                    style={{
                                        background: "var(--paper)",
                                        padding: "8px 8px 36px",
                                        width: 160,
                                        boxShadow:
                                            "0 0 0 1px rgba(0,0,0,0.05), 0 2px 0 1px #E0D8CC, 0 10px 24px rgba(0,0,0,0.09)",
                                        position: "relative",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 144,
                                            height: 144,
                                            background: "var(--bg)",
                                            position: "relative",
                                            overflow: "hidden",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundImage:
                                                    "radial-gradient(circle, rgba(184,74,42,0.07) 1px, transparent 1px)",
                                                backgroundSize: "9px 9px",
                                            }}
                                        />
                                        {previewUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={previewUrl}
                                                alt=""
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="rgba(184,74,42,0.2)"
                                                strokeWidth="1"
                                                strokeLinecap="round"
                                            >
                                                <rect x="3" y="3" width="18" height="18" rx="1" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: 36,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "0 8px",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontFamily: "DM Mono, monospace",
                                                fontSize: 6,
                                                letterSpacing: "0.15em",
                                                textTransform: "uppercase",
                                                color: "var(--muted-lt)",
                                            }}
                                        >
                                            {device.id}
                                        </span>
                                        <span
                                            style={{
                                                fontFamily: "Cormorant Garamond, serif",
                                                fontStyle: "italic",
                                                fontSize: 11,
                                                color: "var(--sand)",
                                            }}
                                        >
                                            Mem.ry
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Meta */}
                            <div style={{ padding: "16px 18px" }}>
                                <div
                                    style={{
                                        fontFamily: "Cormorant Garamond, serif",
                                        fontSize: 20,
                                        fontWeight: 400,
                                        letterSpacing: "-0.3px",
                                        color: "var(--ink)",
                                        marginBottom: 4,
                                    }}
                                >
                                    {device.name}
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginTop: 10,
                                    }}
                                >
                                    {/* Battery */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div
                                            style={{
                                                width: 22,
                                                height: 11,
                                                border: "1px solid var(--muted)",
                                                borderRadius: 1,
                                                position: "relative",
                                                padding: 2,
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    right: -4,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    width: 3,
                                                    height: 5,
                                                    background: "var(--muted)",
                                                    borderRadius: "0 1px 1px 0",
                                                }}
                                            />
                                            <div
                                                style={{
                                                    height: "100%",
                                                    borderRadius: 1,
                                                    background:
                                                        bClass === "high"
                                                            ? "var(--green)"
                                                            : bClass === "mid"
                                                                ? "var(--sand)"
                                                                : "var(--rust)",
                                                    width: bPct === "--" ? "50%" : bPct,
                                                    transition: "width 0.3s",
                                                }}
                                            />
                                        </div>
                                        <span
                                            style={{
                                                fontFamily: "DM Mono, monospace",
                                                fontSize: 9,
                                                letterSpacing: "0.08em",
                                                color: "var(--muted)",
                                            }}
                                        >
                                            {bPct}
                                        </span>
                                    </div>
                                    <span className={`status-pill ${pillClass}`}>
                                        <span className="dot" /> {statusLabel}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: "var(--muted-lt)",
                                        fontWeight: 300,
                                        marginTop: 6,
                                    }}
                                >
                                    Last refresh · {lastSeen}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
                                {[
                                    { label: "Upload", href: `/dashboard/upload?device=${device.id}` },
                                    { label: "Library", href: `/dashboard/library?device=${device.id}` },
                                    { label: "Manage", href: `/dashboard/devices/${device.id}` },
                                ].map((a, i) => (
                                    <Link
                                        key={i}
                                        href={a.href}
                                        style={{
                                            flex: 1,
                                            padding: "10px 0",
                                            textAlign: "center",
                                            fontFamily: "DM Mono, monospace",
                                            fontSize: 8,
                                            letterSpacing: "0.12em",
                                            textTransform: "uppercase",
                                            color: "var(--muted)",
                                            borderRight: i < 2 ? "1px solid var(--border)" : "none",
                                            textDecoration: "none",
                                            transition: "all 0.12s",
                                        }}
                                        onMouseEnter={(e) => {
                                            const el = e.currentTarget as HTMLElement;
                                            el.style.color = "var(--ink)";
                                            el.style.background = "var(--bg)";
                                        }}
                                        onMouseLeave={(e) => {
                                            const el = e.currentTarget as HTMLElement;
                                            el.style.color = "var(--muted)";
                                            el.style.background = "transparent";
                                        }}
                                    >
                                        {a.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Add device card */}
                <Link
                    href="/dashboard/devices/pair"
                    style={{
                        border: "1px dashed var(--border)",
                        minHeight: 320,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        cursor: "pointer",
                        textDecoration: "none",
                        transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--muted)";
                        el.style.background = "var(--paper)";
                    }}
                    onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--border)";
                        el.style.background = "transparent";
                    }}
                >
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--muted)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                    <div
                        style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 9,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--muted)",
                        }}
                    >
                        Pair a device
                    </div>
                </Link>
            </div>
        </div>
    );
}