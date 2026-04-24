// ─────────────────────────────────────────────────────────────
//  MEMRY — wifi_provision.h
//
//  How it works:
//    1. Device boots with no saved credentials (or 3× connect fails)
//    2. Broadcasts "MEMRY-Setup" open hotspot (192.168.4.1)
//    3. Any connecting device gets redirected to captive portal
//    4. User fills in SSID + password → submits
//    5. Credentials saved to flash via Preferences
//    6. Device restarts → connects normally
//
//  Captive portal tricks:
//    · DNS server intercepts ALL DNS queries → returns 192.168.4.1
//    · HTTP server on port 80 handles Android/iOS probe URLs
//      (connectivitycheck.gstatic.com, captive.apple.com, etc.)
//    · This triggers the "sign in to network" popup automatically
//      on iOS and Android without the user finding the IP manually
//
//  Libraries: all built-in to ESP32 Arduino board package
//    WiFi.h · WebServer.h · DNSServer.h · Preferences.h
// ─────────────────────────────────────────────────────────────
#pragma once

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include "config.h"

// ── Provisioning config ───────────────────────────────────────
#define PROV_AP_SSID        "MEMRY-Setup"
#define PROV_AP_PASS        ""              // open network (no password)
#define PROV_PORTAL_TIMEOUT 300000          // 5 min timeout, then sleep & retry
#define PROV_DNS_PORT       53
#define PROV_HTTP_PORT      80

// ── Module state ──────────────────────────────────────────────
static WebServer  _server(PROV_HTTP_PORT);
static DNSServer  _dns;
static bool       _credsSaved = false;

// ──────────────────────────────────────────────────────────────
//  Flash storage helpers
// ──────────────────────────────────────────────────────────────

void provSaveCreds(const String& ssid, const String& pass) {
  Preferences p;
  p.begin("memry-wifi", false);
  p.putString("ssid", ssid);
  p.putString("pass", pass);
  p.end();
}

bool provLoadCreds(String& ssid, String& pass) {
  Preferences p;
  p.begin("memry-wifi", true);
  ssid = p.getString("ssid", "");
  pass = p.getString("pass", "");
  p.end();
  return ssid.length() > 0;
}

void provClearCreds() {
  Preferences p;
  p.begin("memry-wifi", false);
  p.clear();
  p.end();
  Serial.println("WiFi credentials cleared from flash");
}

// ──────────────────────────────────────────────────────────────
//  Captive portal HTML
//  Inline — no external files, no SPIFFS needed
// ──────────────────────────────────────────────────────────────

static const char PORTAL_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MEMRY Setup</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #F7F3EC;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .card {
    background: #FDFBF7;
    border: 1px solid #C4BDB5;
    border-radius: 8px;
    padding: 40px 32px;
    width: 100%;
    max-width: 360px;
  }

  .logo {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 28px;
    color: #1C1814;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 13px;
    color: #8A837A;
    margin-bottom: 32px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #8A837A;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  input[type="text"],
  input[type="password"] {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #C4BDB5;
    border-radius: 4px;
    background: #FDFBF7;
    font-size: 15px;
    color: #1C1814;
    margin-bottom: 20px;
    outline: none;
    transition: border-color 0.15s;
  }

  input:focus {
    border-color: #C8A96E;
  }

  .pw-wrap {
    position: relative;
    margin-bottom: 28px;
  }

  .pw-wrap input {
    margin-bottom: 0;
    padding-right: 44px;
  }

  .pw-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: #8A837A;
    font-size: 12px;
    padding: 4px;
  }

  button[type="submit"] {
    width: 100%;
    padding: 14px;
    background: #1C1814;
    color: #F7F3EC;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: background 0.15s;
  }

  button[type="submit"]:hover {
    background: #2a2420;
  }

  button[type="submit"]:active {
    background: #C8A96E;
    color: #1C1814;
  }

  .device-id {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #EDE8E0;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: #C4BDB5;
    text-align: center;
    letter-spacing: 0.08em;
  }

  .scanning {
    display: none;
    margin-bottom: 20px;
  }

  .scanning ul {
    list-style: none;
    border: 1px solid #C4BDB5;
    border-radius: 4px;
    overflow: hidden;
    max-height: 200px;
    overflow-y: auto;
  }

  .scanning li {
    padding: 10px 14px;
    border-bottom: 1px solid #EDE8E0;
    font-size: 14px;
    cursor: pointer;
    color: #1C1814;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .scanning li:last-child { border-bottom: none; }
  .scanning li:hover { background: #F7F3EC; }

  .rssi {
    font-family: monospace;
    font-size: 11px;
    color: #8A837A;
  }

  .scan-btn {
    background: none;
    border: 1px solid #C4BDB5;
    border-radius: 4px;
    padding: 8px 14px;
    font-size: 12px;
    color: #8A837A;
    cursor: pointer;
    margin-bottom: 12px;
    width: 100%;
  }

  .scan-btn:hover { border-color: #8A837A; color: #1C1814; }

  .success-screen {
    display: none;
    text-align: center;
  }

  .success-screen .check {
    font-size: 40px;
    margin-bottom: 16px;
  }

  .success-screen h2 {
    font-family: Georgia, serif;
    font-weight: normal;
    font-size: 20px;
    color: #1C1814;
    margin-bottom: 8px;
  }

  .success-screen p {
    font-size: 13px;
    color: #8A837A;
    line-height: 1.6;
  }
</style>
</head>
<body>
<div class="card">

  <div id="setup-form">
    <div class="logo">memry</div>
    <div class="subtitle">WiFi Setup · )rawliteral" DEVICE_ID R"rawliteral(</div>

    <button class="scan-btn" onclick="scanNetworks()">Scan for networks</button>

    <div class="scanning" id="scan-results">
      <ul id="network-list"></ul>
    </div>

    <form onsubmit="submitCreds(event)">
      <label for="ssid">Network name (SSID)</label>
      <input type="text" id="ssid" name="ssid" placeholder="Your WiFi name" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" required>

      <label for="pass">Password</label>
      <div class="pw-wrap">
        <input type="password" id="pass" name="pass" placeholder="WiFi password" autocomplete="current-password">
        <button type="button" class="pw-toggle" onclick="togglePw()">show</button>
      </div>

      <button type="submit" id="submit-btn">Connect</button>
    </form>

    <div class="device-id">Device · )rawliteral" DEVICE_ID R"rawliteral(</div>
  </div>

  <div class="success-screen" id="success">
    <div class="check">&#10003;</div>
    <h2>Connecting&hellip;</h2>
    <p>MEMRY is connecting to your WiFi.<br>This page will close in a moment.<br><br>Your fridge magnet will show its first photo within the next few hours.</p>
  </div>

</div>

<script>
function togglePw() {
  const i = document.getElementById('pass');
  const b = document.querySelector('.pw-toggle');
  if (i.type === 'password') { i.type = 'text'; b.textContent = 'hide'; }
  else { i.type = 'password'; b.textContent = 'show'; }
}

function scanNetworks() {
  const btn = document.querySelector('.scan-btn');
  btn.textContent = 'Scanning...';
  btn.disabled = true;
  fetch('/scan')
    .then(r => r.json())
    .then(nets => {
      const list = document.getElementById('network-list');
      list.innerHTML = '';
      nets.forEach(n => {
        const li = document.createElement('li');
        const bars = n.rssi > -60 ? '▂▄▆█' : n.rssi > -75 ? '▂▄▆' : n.rssi > -85 ? '▂▄' : '▂';
        li.innerHTML = '<span>' + n.ssid + '</span><span class="rssi">' + bars + '</span>';
        li.onclick = () => {
          document.getElementById('ssid').value = n.ssid;
          document.getElementById('pass').focus();
        };
        list.appendChild(li);
      });
      document.getElementById('scan-results').style.display = 'block';
      btn.textContent = 'Scan again';
      btn.disabled = false;
    })
    .catch(() => { btn.textContent = 'Scan for networks'; btn.disabled = false; });
}

function submitCreds(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  const body = new URLSearchParams({
    ssid: document.getElementById('ssid').value,
    pass: document.getElementById('pass').value
  });
  fetch('/save', { method: 'POST', body })
    .then(r => r.text())
    .then(() => {
      document.getElementById('setup-form').style.display = 'none';
      document.getElementById('success').style.display = 'block';
    })
    .catch(() => { btn.textContent = 'Connect'; btn.disabled = false; });
}
</script>
</body>
</html>
)rawliteral";

// ──────────────────────────────────────────────────────────────
//  HTTP route handlers
// ──────────────────────────────────────────────────────────────

void _handleRoot() {
  _server.send(200, "text/html", FPSTR(PORTAL_HTML));
}

void _handleCaptiveRedirect() {
  // Handles all iOS/Android captive portal probe URLs
  _server.sendHeader("Location", "http://192.168.4.1/", true);
  _server.send(302, "text/plain", "");
}

void _handleScan() {
  int n = WiFi.scanNetworks(false, true);  // async=false, showHidden=true
  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
  }
  json += "]";
  _server.send(200, "application/json", json);
}

void _handleSave() {
  if (_server.method() != HTTP_POST) {
    _server.send(405, "text/plain", "Method not allowed");
    return;
  }
  String ssid = _server.arg("ssid");
  String pass = _server.arg("pass");

  if (ssid.length() == 0) {
    _server.send(400, "text/plain", "SSID required");
    return;
  }

  Serial.printf("Provisioning: saving SSID '%s'\n", ssid.c_str());
  provSaveCreds(ssid, pass);
  _server.send(200, "text/plain", "ok");
  _credsSaved = true;
}

void _handleNotFound() {
  // Catch-all: redirect to portal (handles Android captive portal check)
  _server.sendHeader("Location", "http://192.168.4.1/", true);
  _server.send(302, "text/plain", "");
}

// ──────────────────────────────────────────────────────────────
//  Main provisioning entry point
//
//  Call this when WiFi creds are missing or connection failed 3×.
//  Blocks until creds are saved or PROV_PORTAL_TIMEOUT ms pass.
//  Returns true if creds were saved (caller should restart).
// ──────────────────────────────────────────────────────────────

bool runProvisioningPortal(Adafruit_GFX* gfx = nullptr) {
  Serial.println("\n── Starting provisioning portal ──");

  // ── Start AP ──────────────────────────────────────────────
  WiFi.mode(WIFI_AP);
  WiFi.softAP(PROV_AP_SSID, strlen(PROV_AP_PASS) > 0 ? PROV_AP_PASS : nullptr);
  delay(500);

  IPAddress apIP(192, 168, 4, 1);
  Serial.printf("AP started: %s  IP: %s\n", PROV_AP_SSID, apIP.toString().c_str());

  // ── DNS: intercept everything → portal IP ─────────────────
  _dns.start(PROV_DNS_PORT, "*", apIP);

  // ── HTTP routes ───────────────────────────────────────────
  _server.on("/",                     HTTP_GET,  _handleRoot);
  _server.on("/save",                 HTTP_POST, _handleSave);
  _server.on("/scan",                 HTTP_GET,  _handleScan);

  // iOS captive portal probes
  _server.on("/hotspot-detect.html",  HTTP_GET,  _handleRoot);
  _server.on("/library/test/success.html", HTTP_GET, _handleRoot);

  // Android captive portal probes
  _server.on("/generate_204",         HTTP_GET,  _handleCaptiveRedirect);
  _server.on("/connecttest.txt",      HTTP_GET,  _handleCaptiveRedirect);
  _server.on("/ncsi.txt",             HTTP_GET,  _handleCaptiveRedirect);

  // Catch-all
  _server.onNotFound(_handleNotFound);
  _server.begin();

  // ── Show setup screen on e-ink ────────────────────────────
  // (caller passes display pointer for this)
  Serial.println("Portal running. Waiting for credentials...");

  // ── Event loop ────────────────────────────────────────────
  _credsSaved = false;
  uint32_t startMs = millis();

  while (!_credsSaved) {
    _dns.processNextRequest();
    _server.handleClient();

    // Timeout — sleep and retry later
    if (millis() - startMs > PROV_PORTAL_TIMEOUT) {
      Serial.println("Portal timeout — sleeping 1h");
      _server.stop();
      _dns.stop();
      WiFi.softAPdisconnect(true);
      return false;
    }

    delay(2);
  }

  // Brief delay so the browser gets the success response
  uint32_t saveMs = millis();
  while (millis() - saveMs < 1500) {
    _dns.processNextRequest();
    _server.handleClient();
    delay(2);
  }

  _server.stop();
  _dns.stop();
  WiFi.softAPdisconnect(true);

  Serial.println("Credentials saved — restarting");
  return true;
}
