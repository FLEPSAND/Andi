# Andi — Remote Control

A small, self-contained web-based **remote control** UI. It runs as a static
site (no build step, no dependencies) and provides a clean control panel —
power, D-pad navigation, volume/channel, a number pad, and media transport
buttons — with full keyboard support.

The button presses are routed through a pluggable `Transport` layer
(`js/transport.js`). Out of the box it uses a `MockTransport` that just logs
commands to the on-screen console, so you can see the whole thing working
immediately. Swap in a real transport (WebSocket, HTTP, Web Bluetooth, …) to
talk to an actual device without touching the UI code.

## Run it

It's a static site, so any static file server works:

```bash
# Python (already installed almost everywhere)
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## Layout

```
index.html         # markup for the remote
css/styles.css     # styling, light + dark, responsive
js/transport.js    # pluggable command transport (MockTransport by default)
js/remote.js       # wires buttons + keyboard to the transport
```

## Keyboard shortcuts

| Key                | Action        |
|--------------------|---------------|
| Arrow keys         | D-pad         |
| Enter / Space      | OK            |
| Backspace          | Back          |
| `+` / `-`          | Volume up/down|
| `m`                | Mute          |
| Page Up / Page Down| Channel up/down|
| `0`–`9`            | Number pad    |
| `p`                | Power         |

## Extending

Implement the `Transport` interface and pass it to the `Remote` on startup:

```js
class WebSocketTransport {
  constructor(url) { this.ws = new WebSocket(url); }
  send(command, payload) {
    this.ws.send(JSON.stringify({ command, payload, ts: Date.now() }));
  }
}
```

Then in `js/remote.js` swap `new MockTransport(...)` for your implementation.

## Andi Notes

Im Ordner [`freenotes/`](freenotes/) liegt außerdem **Andi Notes** — eine
Notiz-App für Handschrift, Zeichnen, PDF-Annotation, Texterkennung, Aufnahme
mit Live-Mitschrift und Auswertung des Inhalts. Ebenfalls statisch, ohne
Build-Schritt, alle Daten bleiben im Browser. Details in
[`freenotes/README.md`](freenotes/README.md).

## Andi Notes für iOS

Unter [`ios/`](ios/) liegt dieselbe App nativ für iPhone und iPad: SwiftUI,
SwiftData und PencilKit, also echter Apple-Pencil-Druck, Ebenen, Vorlagen,
PDF-Annotation, Texterkennung mit Vision und Aufnahme mit Live-Mitschrift.
Bauanleitung in [`ios/README.md`](ios/README.md).
