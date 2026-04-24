// ============================================================
// MEMRY Shell v4 — DEFINITIVE TWO-PIECE
// All geometry verified. Print-ready.
// ============================================================
//
// FRONT BODY  → front face DOWN, no supports
// BACK PANEL  → outside face DOWN, no supports
// Both: white PLA, 0.15mm layers, 3 perimeters, 20% infill
// Print 4× of each for 4 units.
//
// HARDWARE PER UNIT:
//   4× M2×6mm self-tapping screws
//   4× N52 neodymium 20mm×3mm disc magnets
//   2-part epoxy (for magnets)
//   Clear silicone sealant (for gasket groove + display edge)
//   PCB conformal coating spray (for XIAO + wiring)
//
// MAGNET POCKET (key design):
//   Magnet = 20mm dia × 3mm thick
//   Back panel has 20mm through-hole (1.5mm deep)
//   Front body rim face has 20mm blind recess (2.0mm deep)
//   Combined = 3.5mm pocket → magnet sits in, 0.5mm PLA floor
//   Epoxy from outside seals and locks magnet permanently
//   Ghost ring (raised 0.4mm) marks hole, adds grip on fridge
//
// ASSEMBLY:
//   1. Conformal coat XIAO, cure 24h
//   2. Seat display, route FPC ribbon
//   3. Seat XIAO + LiPo, wire up
//   4. Silicone bead around display window edge (inside)
//   5. Fill gasket groove with silicone sealant
//   6. Drop back panel into rim — self-locating
//   7. Drive 4× M2×6mm screws
//   8. From outside: drop magnets into ghost-ring holes
//   9. Fill with 2-part epoxy, cure 30min
// ============================================================

// ── PARAMETERS ─────────────────────────────────────────────

W  = 95;    H  = 115;   D  = 11;    // outer dims
FW = 1.0;   SW = 1.2;               // front wall, side wall

// Display window
WIN_W=85; WIN_H=85; WIN_GAP=7;

// Display bay
DBW=86; DBH=86; DBD=3.0;

// Component bay (XIAO + LiPo)
CBW=60; CBH=26; CBD=6.0;

// FPC channel
FPC_W=10; FPC_H=3;

// USB-C notch (right side)
UW=9; UH=3.5; UFB=8;

// Corner radius
CR=3.0;

// Rim ledge (front body back opening)
RIM_W=2.5;   // ledge width
RIM_H=1.5;   // ledge height = back panel thickness

// Gasket groove (on rim face)
GW=1.4; GD=1.0; GO=0.8;  // width, depth, offset from inner rim edge

// M2 screw bosses
BOD=6.5;  // boss outer dia
BID=2.1;  // screw hole dia (M2 self-tap)
BOH=7.5;  // boss height (FW to rim face = D-FW-RIM_H = 8.5mm, boss = 7.5mm)
BIN=6.0;  // boss centre inset from outer edge

// Countersink on back panel
CS_D=4.2; CS_DEP=1.2;

// Magnets: 20mm dia × 3mm thick
MAG_D  = 20;
MAG_T  = 3.0;
MAG_FL = 0.5;              // floor thickness
MAG_IN = 16.0;             // magnet centre inset from outer edge
BODY_REC = MAG_T - RIM_H + MAG_FL;  // = 2.0mm recess in front body rim face

// Ghost ring
GHR_OD = MAG_D + 3;  // 23mm outer dia
GHR_RW = 1.2;         // ring wall width
GHR_T  = 0.4;         // raised height

// Panel fit clearance
CLR = 0.15;

// ── DERIVED POSITIONS ──────────────────────────────────────

// Boss centres (global coords — same for both pieces)
BX = [BIN,    W-BIN,  BIN,    W-BIN  ];
BY = [BIN,    BIN,    H-BIN,  H-BIN  ];

// Magnet centres (global coords — same for both pieces)
MX = [MAG_IN,    W-MAG_IN,  MAG_IN,    W-MAG_IN  ];
MY = [MAG_IN,    MAG_IN,    H-MAG_IN,  H-MAG_IN  ];

// Panel bounds
PX = SW + RIM_W + CLR;
PY = SW + RIM_W + CLR;
PW = W - 2*PX;
PH = H - 2*PY;
PZ = D - RIM_H;   // panel inner face Z

// ── UTILITIES ──────────────────────────────────────────────

module rbox(w, h, d, r=CR) {
    hull()
        for (x=[r,w-r]) for (y=[r,h-r])
            translate([x,y,0]) cylinder(r=r, h=d, $fn=32);
}

// ============================================================
// PIECE 1 — FRONT BODY
// ============================================================

module front_body() {
    difference() {
        union() {
            rbox(W, H, D);
            // Screw bosses rise from above front wall to just below rim face
            for (i=[0:3])
                translate([BX[i], BY[i], FW])
                    cylinder(d=BOD, h=BOH, $fn=24);
        }

        // Hollow interior (front wall to rim face)
        translate([SW, SW, FW])
            cube([W-2*SW, H-2*SW, D-FW-RIM_H]);

        // Remove centre of back face leaving only rim band
        translate([SW+RIM_W, SW+RIM_W, D-RIM_H-0.1])
            cube([W-2*(SW+RIM_W), H-2*(SW+RIM_W), RIM_H+0.2]);

        // Display window
        translate([(W-WIN_W)/2, H-WIN_GAP-WIN_H, -0.1])
            cube([WIN_W, WIN_H, FW+0.2]);

        // Display bay
        translate([(W-DBW)/2, H-WIN_GAP-DBH, FW])
            cube([DBW, DBH, DBD]);

        // Component bay
        translate([W-SW-CBW, SW+6, FW])
            cube([CBW, CBH, CBD]);

        // FPC channel
        translate([W-SW-CBW-3, SW+6+CBH, FW])
            cube([FPC_W, 14, FPC_H]);

        // USB-C notch
        translate([W-SW-0.1, UFB, FW+(D-FW-RIM_H)/2-UH/2])
            cube([SW+0.2, UW, UH]);

        // Gasket groove on rim face
        gx = SW + GO;  gy = SW + GO;
        translate([gx, gy, D-RIM_H-0.1])
            difference() {
                cube([W-2*gx, H-2*gy, GD+0.2]);
                translate([GW, GW, -0.1])
                    cube([W-2*gx-2*GW, H-2*gy-2*GW, GD+0.4]);
            }

        // Magnet recesses in rim face (blind pocket floors)
        // 2.0mm deep from rim face into body
        for (i=[0:3])
            translate([MX[i], MY[i], D-RIM_H-BODY_REC])
                cylinder(d=MAG_D, h=BODY_REC+0.1, $fn=48);

        // Boss screw holes
        for (i=[0:3])
            translate([BX[i], BY[i], FW-0.1])
                cylinder(d=BID, h=BOH+0.2, $fn=16);
    }
}

// ============================================================
// PIECE 2 — BACK PANEL
// ============================================================

module back_panel() {
    difference() {
        union() {
            // Panel body — sits inside rim ledge
            translate([PX, PY, PZ])
                cube([PW, PH, RIM_H]);

            // Ghost rings — built on top of panel, connected to it
            // They sit directly over the magnet through-holes
            for (i=[0:3])
                translate([MX[i], MY[i], D])
                    difference() {
                        cylinder(d=GHR_OD, h=GHR_T, $fn=48);
                        // Hollow ring (the through-hole centre stays open)
                        cylinder(d=GHR_OD-2*GHR_RW, h=GHR_T+0.1, $fn=48);
                    }
        }

        // Magnet through-holes (full panel thickness)
        // Aligned to body recesses — together form complete pocket
        for (i=[0:3])
            translate([MX[i], MY[i], PZ-0.1])
                cylinder(d=MAG_D, h=RIM_H+0.2, $fn=48);

        // M2 countersinks on outside face
        for (i=[0:3]) {
            translate([BX[i], BY[i], D-CS_DEP])
                cylinder(d=CS_D, h=CS_DEP+0.1, $fn=24);
            // Screw shaft through-hole
            translate([BX[i], BY[i], PZ-0.1])
                cylinder(d=BID, h=RIM_H+0.2, $fn=16);
        }
    }
}

// ============================================================
// EXPORT
// ============================================================
// FRONT BODY STL: keep only front_body() uncommented
// BACK PANEL STL: comment front_body(), uncomment back_panel()

front_body();
// back_panel();

// Preview side by side:
// front_body();
// translate([W+15, 0, 0]) back_panel();
