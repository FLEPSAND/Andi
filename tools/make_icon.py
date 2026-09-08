#!/usr/bin/env python3
"""
Zeichnet das App-Icon von Andi Notes als PNG.

Kein Bildbearbeitungsprogramm nötig: die Form steht als Bézierkurven im Code,
wird abgetastet und mit weichen Kreisen gestempelt. Dieselbe Geometrie liegt
als SVG in freenotes/icon.svg — wer das Icon ändert, ändert beides.

    python3 tools/make_icon.py
"""

import math
import struct
import zlib

SIZE = 1024


# ── Grundlagen ────────────────────────────────────────────────────────────

def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def bezier(p0, p1, p2, p3, steps):
    """Punkte auf einer kubischen Bézierkurve."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = (u * u * u * p0[0] + 3 * u * u * t * p1[0]
             + 3 * u * t * t * p2[0] + t * t * t * p3[0])
        y = (u * u * u * p0[1] + 3 * u * u * t * p1[1]
             + 3 * u * t * t * p2[1] + t * t * t * p3[1])
        points.append((x, y))
    return points


def resample(points, spacing=0.4):
    """Gleichmäßige Abstände, damit gestempelte Kreise lückenlos anschließen."""
    out = [points[0]]
    carry = 0.0
    for a, b in zip(points, points[1:]):
        segment = math.hypot(b[0] - a[0], b[1] - a[1])
        if segment == 0:
            continue
        position = spacing - carry
        while position < segment:
            t = position / segment
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            position += spacing
        carry = (carry + segment) % spacing
    out.append(points[-1])
    return out


class Mask:
    """Deckungsgrad je Pixel, 0…1."""

    def __init__(self):
        self.data = [0.0] * (SIZE * SIZE)

    def stamp(self, points, radius, alpha_at=None):
        """Zeichnet eine Linie als Folge weicher Kreise."""
        for index, (cx, cy) in enumerate(points):
            r = radius(index / max(len(points) - 1, 1)) if callable(radius) else radius
            a = alpha_at(index / max(len(points) - 1, 1)) if alpha_at else 1.0
            if r <= 0 or a <= 0:
                continue
            x0, x1 = int(cx - r - 1), int(cx + r + 2)
            y0, y1 = int(cy - r - 1), int(cy + r + 2)
            for y in range(max(y0, 0), min(y1, SIZE)):
                row = y * SIZE
                dy = y + 0.5 - cy
                for x in range(max(x0, 0), min(x1, SIZE)):
                    dx = x + 0.5 - cx
                    coverage = clamp(r - math.hypot(dx, dy) + 0.5) * a
                    if coverage > self.data[row + x]:
                        self.data[row + x] = coverage

    def circle_outline(self, cx, cy, radius, width):
        half = width / 2
        x0, x1 = int(cx - radius - half - 2), int(cx + radius + half + 3)
        y0, y1 = int(cy - radius - half - 2), int(cy + radius + half + 3)
        for y in range(max(y0, 0), min(y1, SIZE)):
            row = y * SIZE
            dy = y + 0.5 - cy
            for x in range(max(x0, 0), min(x1, SIZE)):
                dx = x + 0.5 - cx
                distance = abs(math.hypot(dx, dy) - radius)
                coverage = clamp(half - distance + 0.5)
                if coverage > self.data[row + x]:
                    self.data[row + x] = coverage


# ── Die Form ──────────────────────────────────────────────────────────────

def nib_outline():
    """Feder: runde Schultern oben, Spitze unten."""
    # Fast flacher Scheitel mit gerundeten Ecken, breiteste Stelle im oberen
    # Drittel, lange Spitze. Rundet man den Scheitel, sieht die Feder aus wie
    # eine Kartennadel.
    curves = [
        ((390, 268), (434, 240), (590, 240), (634, 268)),
        ((634, 268), (668, 296), (676, 366), (668, 438)),
        ((668, 438), (652, 552), (580, 656), (512, 754)),
        ((512, 754), (444, 656), (372, 552), (356, 438)),
        ((356, 438), (348, 366), (356, 296), (390, 268)),
    ]
    points = []
    for p0, p1, p2, p3 in curves:
        points.extend(bezier(p0, p1, p2, p3, 90))
    return resample(points)


def nib_slit():
    return resample(bezier((512, 516), (512, 600), (512, 668), (512, 736), 60))


def written_line():
    """Der Schwung unter der Feder — die geschriebene Zeile."""
    points = bezier((206, 856), (296, 800), (368, 908), (460, 852), 70)
    points += bezier((460, 852), (552, 796), (630, 906), (720, 848), 70)
    points += bezier((720, 848), (766, 818), (792, 806), (818, 802), 30)
    return resample(points)


# ── Zusammensetzen ────────────────────────────────────────────────────────

def render():
    nib = Mask()
    nib.stamp(nib_outline(), radius=10)
    nib.stamp(nib_slit(), radius=lambda t: 9.5 - 4.5 * t)
    nib.circle_outline(512, 468, 34, 10)

    line = Mask()
    # Der Schwung läuft am Ende dünn aus, wie ein abgesetzter Federstrich.
    line.stamp(written_line(),
               radius=lambda t: 13 - 8 * max(0.0, (t - 0.72) / 0.28),
               alpha_at=lambda t: 1.0 - 0.55 * max(0.0, (t - 0.78) / 0.22))

    rows = bytearray()
    for y in range(SIZE):
        rows.append(0)
        for x in range(SIZE):
            # Hintergrund: dunkle Tinte, oben links eine Spur heller.
            diagonal = (x / SIZE) * 0.45 + (y / SIZE) * 0.55
            base = (
                0x2A + (0x0B - 0x2A) * diagonal,
                0x2E + (0x0C - 0x2E) * diagonal,
                0x3A + (0x12 - 0x3A) * diagonal,
            )
            glow = math.exp(-(((x - 300) ** 2 + (y - 250) ** 2) / (2 * 430 ** 2)))
            color = [c + 16 * glow for c in base]

            index = y * SIZE + x
            for mask, tint, strength in ((nib, (255, 255, 255), 1.0),
                                         (line, (198, 214, 255), 0.92)):
                coverage = mask.data[index] * strength
                if coverage > 0:
                    color = [color[i] * (1 - coverage) + tint[i] * coverage for i in range(3)]

            rows += bytes(int(clamp(c, 0, 255)) for c in color) + b"\xff"
    return bytes(rows)


def write_png(path, raw):
    def chunk(tag, payload):
        return (struct.pack(">I", len(payload)) + tag + payload
                + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as handle:
        handle.write(png)
    return len(png)


if __name__ == "__main__":
    target = "ios/AndiNotes/AndiNotes/Assets.xcassets/AppIcon.appiconset/icon-1024.png"
    size = write_png(target, render())
    print(f"{target} geschrieben, {size} Bytes")
