/**
 * Transport layer for the remote control.
 *
 * A transport is anything with a `send(command, payload)` method. The UI never
 * talks to a device directly — it hands commands to a transport, so the same
 * remote can drive a mock console, a WebSocket bridge, an HTTP endpoint, a
 * Web Bluetooth device, etc.
 *
 * @typedef {Object} Transport
 * @property {(command: string, payload?: object) => (void|Promise<void>)} send
 */

/**
 * Default transport: logs every command to an on-screen console and the dev
 * console. Useful for development and as a reference implementation.
 */
class MockTransport {
  /**
   * @param {(entry: {command: string, payload: object, ts: number}) => void} [onSend]
   *   Optional observer called after each command, e.g. to render a log line.
   */
  constructor(onSend) {
    this.onSend = onSend || null;
  }

  send(command, payload = {}) {
    const entry = { command, payload, ts: Date.now() };
    // eslint-disable-next-line no-console
    console.log('[remote]', command, payload);
    if (this.onSend) this.onSend(entry);
  }
}

// Expose for the non-module <script> setup used by index.html.
window.MockTransport = MockTransport;
