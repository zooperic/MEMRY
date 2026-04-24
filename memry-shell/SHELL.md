# MEMRY — Hardware Design

## Shell Dimensions (3D Print Spec)

```
TOP VIEW (front face)
┌─────────────────────────────────┐
│ ← 95mm →                        │
│  ┌───────────────────────────┐  │ ↑
│  │                           │  │ 7mm
│  │   E-INK DISPLAY WINDOW    │  │ ↓
│  │      85mm × 85mm          │  │
│  │                           │  │ 85mm
│  │   400×300px active area   │  │ window
│  │   (e-ink sits behind)     │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │ ↑
│   001        ·memry·            │ 23mm
│                                 │ ↓ Polaroid white strip
└─────────────────────────────────┘
         ← 95mm →         total H: 115mm

SIDE VIEW
┌──────────────────────────────────────┐
│ 1.0mm │ display │ gap │ MCU+batt │ 1.5mm │
└──────────────────────────────────────┘
  front   1.2+1.5  0.5   3.5+2.5    back
  wall    display  FPC   (beside    wall+
                   gap   each       magnet
                         other)
                    ←── ~11mm total ──→

BACK VIEW
┌─────────────────────────────────┐
│  ○                           ○  │  ← N52 magnet pockets (×4)
│     MEMRY v1.0                  │     20mm dia × 3mm deep
│     for Jo                      │     10mm from each corner
│                                 │
│                      [USB-C ▯]  │  ← 9×3.5mm notch, bottom-right
│  ○                           ○  │
└─────────────────────────────────┘
```

## Internal Layout

```
CROSS SECTION (looking from side, components laid out)

Front wall (1.0mm)
│
├── E-ink glass panel (1.2mm)
│   └── PCB / driver board (1.5mm)
│       └── FPC ribbon cable (routes to right)
│
├── [LEFT HALF]          [RIGHT HALF]
│   LiPo 300mAh flat     XIAO ESP32C3
│   40×30×2.5mm          21×17.5×3.5mm
│   (lying flat)         (USB-C faces edge notch)
│
Back wall (1.5mm) + magnet recesses
```

## Component List (per unit)

| # | Component | Spec | Source | Est. Cost |
|---|---|---|---|---|
| 1 | E-ink display | Waveshare 4.2" B&W, 400×300, SPI | Robu.in | ₹1,800 |
| 2 | MCU | Seeed XIAO ESP32C3, 21×17.5mm, built-in LiPo charge | Amazon.in | ₹600 |
| 3 | Battery | 3.7V 300mAh slim LiPo, JST-PH 2.0mm, ~2.5mm thick | MakerBazar.in | ₹150 |
| 4 | Magnets | N52 neodymium disc, 20mm×3mm (×4 per unit) | Amazon.in | ₹80 |
| 5 | Shell | White PLA, 95×115×11mm, 3D printed | Local Pune | ₹500 |
| 6 | Wires | Dupont F-F jumper wires, 10cm, 8× per unit | Robu.in | ₹30 |
| 7 | Epoxy | 2-part epoxy for magnet fixing | Hardware store | ₹20 |
| | **Total** | | | **~₹3,180** |

## Wiring Diagram

```
XIAO ESP32C3                    Waveshare 4.2" e-ink
─────────────                   ───────────────────
3.3V  ──────────────────────▶  VCC
GND   ──────────────────────▶  GND
D10 (GPIO3)  ───────────────▶  DIN  (MOSI / data in)
D8  (GPIO2)  ───────────────▶  CLK  (SPI clock)
D7  (GPIO20) ───────────────▶  CS   (chip select)
D3  (GPIO21) ───────────────▶  DC   (data/command)
D0  (GPIO9)  ───────────────▶  RST  (reset)
D1  (GPIO10) ◀──────────────   BUSY (wait signal)

XIAO BAT+ / BAT- ◀────────── JST-PH 2.0mm LiPo 300mAh
XIAO USB-C ◀──────────────── USB-C cable (charge + flash)
```

## STL Design Notes (for Tinkercad)

### Step 1 — Main body
- Start: box 95 × 115 × 11mm
- Shell it: 1.0mm front, 1.5mm back, 1.2mm sides (use shell tool)

### Step 2 — Display window (front)
- Cut rectangle: 85 × 85mm, depth 1.0mm (removes front wall)
- Position: centred horizontally, 7mm from top edge
- This exposes the display glass flush with the front face

### Step 3 — Internal bays
- Display bay: 86 × 86 × 3mm pocket from front inner face
- Component bay: 60 × 26mm footprint, 6mm deep, right-aligned
- FPC channel: 10 × 3mm slot connecting display bay to component bay

### Step 4 — Magnet pockets (back)
- 4× cylinders: 20mm diameter, 3.2mm deep (slightly deeper than magnet)
- Positions: centres at (10,10), (85,10), (10,105), (85,105) from top-left
- Cut from back face

### Step 5 — USB-C notch
- Rectangle cut: 9mm wide × 3.5mm tall
- Position: right edge of shell, 8mm from bottom
- Depth: all the way through (11mm)

### Step 6 — Front emboss (ID)
- Text "001" — 8pt equiv, 0.4mm raised from front face
- Position: bottom-left of white strip, 8mm from left, 8mm from bottom

### Step 7 — Back engrave
- Text "MEMRY v1.0" — centred, 0.3mm deep into back face, 30mm from top
- Text "for Jo" — centred below, 0.2mm deep, 8pt equivalent

### Step 8 — Export
- Export as STL (binary, mm units)
- Print orientation: front face down on print bed

## Assembly Instructions

### Before assembly — test on breadboard first
1. Wire display to XIAO using dupont jumpers per wiring diagram above
2. Flash firmware (see firmware/FIRMWARE.md)
3. Confirm display shows test image and WiFi connects
4. Only proceed to shell assembly after confirming electronics work

### Shell assembly
1. Place display face-down into front display bay
   - Display active area faces front window
   - PCB driver board faces inward
2. Route FPC ribbon cable through FPC channel into component bay
3. Place XIAO in component bay — USB-C port aligned to shell notch
4. Connect jumper wires from FPC breakout to XIAO per wiring diagram
5. Connect LiPo JST connector to XIAO BAT connector
6. Lay LiPo flat in component bay beside XIAO
7. Check nothing is pinched or shorting
8. Charge via USB-C before sealing — confirm LED behaviour on XIAO
   - Orange/red = charging, Green = full
9. Apply 2-part epoxy to magnet pockets, press N52 magnets in
   - Confirm polarity first! All magnets should attract to fridge, not each other
   - Let cure 30 minutes before handling
10. Close back shell (snap fit or M2 screws if designed with bosses)
11. Label unit: stick ID number inside back during assembly

### Testing after assembly
- Charge fully via USB-C
- Hold near fridge — confirm it sticks firmly (all 4 magnets seated)
- Upload test photo via web app
- Wait up to 4 hours for first poll (or restart device via reset button on XIAO)
- Confirm photo appears correctly on display
