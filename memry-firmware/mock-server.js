#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  MEMRY — mock-server.js (Spectra 6 color version)
//  Serves 4bpp packed color images for the 3.6" Spectra 6
//  600×400, 6-color: Black=0, White=1, Green=2, Blue=3, Red=4, Yellow=5
//
//  Usage: node mock-server.js
//  Then set SERVER_URL in config.h to your LAN IP:3001
//
//  Endpoints:
//    GET /api/device/:id/current-image  ← device polls this
//    GET /status
//    GET /reload       ← hot-swap test-image.bin and reload
//    GET /reset-etag   ← force device to re-render
//    GET /test-pattern ← generate a fresh 6-color test pattern
// ─────────────────────────────────────────────────────────────
const http = require("http");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const PORT        = 3001;
const IMAGE_FILE  = path.join(__dirname, "test-image.bin");
const SLEEP_HOURS = 4;
const W = 600, H = 400;

// Color indices
const BLACK=0, WHITE=1, GREEN=2, BLUE=3, RED=4, YELLOW=5;

let currentImage = null;
let currentEtag  = null;
let requestLog   = [];

// ── 4bpp helpers ──────────────────────────────────────────────
function makeBuffer() {
  const buf = Buffer.alloc((W * H) / 2);
  // Fill white
  buf.fill(0x11);
  return buf;
}

function setPixel(buf, x, y, color) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = y * W + x;
  if (idx % 2 === 0) buf[idx>>1] = (buf[idx>>1] & 0x0F) | ((color & 0xF) << 4);
  else               buf[idx>>1] = (buf[idx>>1] & 0xF0) |  (color & 0xF);
}

function fillRect(buf, x, y, w, h, color) {
  for (let row = y; row < y+h; row++)
    for (let col = x; col < x+w; col++)
      setPixel(buf, col, row, color);
}

// ── Generate test pattern ─────────────────────────────────────
function generateTestPattern() {
  const buf = makeBuffer();

  // Color band across top
  const bands = [BLACK, WHITE, GREEN, BLUE, RED, YELLOW];
  const bw = Math.floor(W / 6);
  bands.forEach((c, i) => fillRect(buf, i*bw, 0, bw, 60, c));

  // Polaroid-style bottom strip
  fillRect(buf, 0, H-80, W, 2, BLACK);

  // Center cross
  fillRect(buf, W/2-1, 70, 2, H-160, BLACK);
  fillRect(buf, 70, H/2-1, W-140, 2, BLACK);

  // Corner squares in each color
  [[0,BLACK],[1,RED],[2,GREEN],[3,BLUE]].forEach(([i,c]) => {
    const cx = i%2 === 0 ? 30 : W-70;
    const cy = i < 2 ? 80 : H-150;
    fillRect(buf, cx, cy, 40, 40, c);
    fillRect(buf, cx+5, cy+5, 30, 30, WHITE);
  });

  // Simple text area
  fillRect(buf, 180, 160, 240, 50, BLACK);
  fillRect(buf, 183, 163, 234, 44, WHITE);

  // Yellow accent in bottom strip
  fillRect(buf, 20, H-65, 100, 40, YELLOW);
  fillRect(buf, W-120, H-65, 100, 40, RED);

  return buf;
}

function computeEtag(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum = (sum + buf[i]) & 0xFFFFFFFF;
  return `"memry-${sum.toString(16)}"`;
}

function loadImage() {
  if (!fs.existsSync(IMAGE_FILE)) {
    console.log("No test-image.bin found — generating color test pattern");
    currentImage = generateTestPattern();
    fs.writeFileSync(IMAGE_FILE, currentImage);
    console.log(`Saved test-image.bin (${currentImage.length} bytes)`);
  } else {
    currentImage = fs.readFileSync(IMAGE_FILE);
    console.log(`Loaded ${IMAGE_FILE} (${currentImage.length} bytes)`);
    const expected = (W * H) / 2;
    if (currentImage.length !== expected) {
      console.warn(`WARNING: expected ${expected} bytes, got ${currentImage.length}`);
    }
  }
  currentEtag = computeEtag(currentImage);
  console.log(`ETag: ${currentEtag}`);
}

// ── HTTP server ───────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const now = new Date().toISOString();
  const deviceId = req.headers["x-device-id"] || "unknown";
  const battMv   = req.headers["x-battery-mv"]  || "unknown";

  if (req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      server: "MEMRY mock (Spectra 6)",
      format: "4bpp packed, 600×400, 6-color",
      imageBytes: currentImage?.length,
      etag: currentEtag,
      requests: requestLog.slice(-20)
    }, null, 2));
    return;
  }

  if (req.url === "/reload") {
    if (fs.existsSync(IMAGE_FILE)) fs.unlinkSync(IMAGE_FILE);
    loadImage();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Reloaded. ETag: ${currentEtag}\n`);
    return;
  }

  if (req.url === "/test-pattern") {
    currentImage = generateTestPattern();
    fs.writeFileSync(IMAGE_FILE, currentImage);
    currentEtag = computeEtag(currentImage);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`New test pattern generated. ETag: ${currentEtag}\n`);
    return;
  }

  if (req.url === "/reset-etag") {
    currentEtag = `"memry-reset-${Date.now()}"`;
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`ETag reset: ${currentEtag}\nDevice will re-render on next wake.\n`);
    return;
  }

  const match = req.url.match(/^\/api\/device\/([^\/]+)\/current-image$/);
  if (match && req.method === "GET") {
    const reqDevice = match[1];
    const clientEtag = req.headers["if-none-match"];

    console.log(`\n[${now}] GET /api/device/${reqDevice}/current-image`);
    console.log(`  Battery : ${battMv}mV`);
    console.log(`  Client ETag  : ${clientEtag || "(none)"}`);
    console.log(`  Current ETag : ${currentEtag}`);

    requestLog.push({ time: now, device: reqDevice, battMv, clientEtag });

    if (clientEtag && clientEtag === currentEtag) {
      console.log("  → 304 Not Modified");
      res.writeHead(304, {
        "ETag":          currentEtag,
        "X-Sleep-Hours": String(SLEEP_HOURS),
      });
      res.end();
      return;
    }

    console.log(`  → 200 Serving ${currentImage.length} bytes`);
    res.writeHead(200, {
      "Content-Type":   "application/octet-stream",
      "Content-Length": String(currentImage.length),
      "ETag":           currentEtag,
      "X-Sleep-Hours":  String(SLEEP_HOURS),
      "Access-Control-Allow-Origin": "*",
    });
    res.end(currentImage);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end(`Not found: ${req.url}\n`);
});

function printNetworkInfo() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(ifaces))
    for (const a of list)
      if (a.family === "IPv4" && !a.internal) ips.push(a.address);

  console.log("\n── MEMRY Mock Server (Spectra 6) ──────────────────");
  console.log(`   Format: 4bpp packed · 600×400 · 6-color`);
  console.log(`   Port  : ${PORT}`);
  ips.forEach(ip => {
    console.log(`   URL   : http://${ip}:${PORT}  ← use in config.h`);
  });
  console.log(`\n   Endpoints:`);
  console.log(`     /api/device/:id/current-image  ← device`);
  console.log(`     /status   /reload   /reset-etag   /test-pattern`);
  console.log("────────────────────────────────────────────────────\n");
}

loadImage();
server.listen(PORT, "0.0.0.0", printNetworkInfo);
