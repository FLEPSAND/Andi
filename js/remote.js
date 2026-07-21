/**
 * Wires the on-screen buttons and the keyboard to a Transport, and renders a
 * small command log so you can see what the remote is sending.
 */
(function () {
  'use strict';

  var MAX_LOG = 50;

  function Remote(root, transport) {
    this.root = root;
    this.transport = transport;
    this.powered = false;
    this.buffer = ''; // accumulated number-pad digits

    this.statusDot = root.querySelector('#status-dot');
    this.statusText = root.querySelector('#status-text');
    this.logEl = root.querySelector('#log');

    this._bindButtons();
    this._bindKeyboard();
    this._bindLogClear();
    this._renderLog();
  }

  /** Map keyboard keys to command names. */
  Remote.KEY_MAP = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    Enter: 'ok',
    ' ': 'ok',
    Backspace: 'back',
    '+': 'vol_up',
    '=': 'vol_up', // same physical key as '+' without shift
    '-': 'vol_down',
    m: 'mute',
    M: 'mute',
    PageUp: 'ch_up',
    PageDown: 'ch_down',
    p: 'power',
    P: 'power'
  };

  Remote.prototype._bindButtons = function () {
    var self = this;
    var buttons = this.root.querySelectorAll('[data-command]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        self.press(btn.getAttribute('data-command'), btn);
      });
    });
  };

  Remote.prototype._bindKeyboard = function () {
    var self = this;
    document.addEventListener('keydown', function (e) {
      // Ignore when typing into a field.
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      var command = null;
      if (e.key >= '0' && e.key <= '9') {
        command = 'num_' + e.key;
      } else if (Object.prototype.hasOwnProperty.call(Remote.KEY_MAP, e.key)) {
        command = Remote.KEY_MAP[e.key];
      }
      if (!command) return;

      e.preventDefault();
      var btn = self.root.querySelector('[data-command="' + command + '"]');
      self.press(command, btn);
    });
  };

  Remote.prototype._bindLogClear = function () {
    var self = this;
    var clearBtn = this.root.querySelector('#log-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        self.log = [];
        self._renderLog();
      });
    }
  };

  /**
   * Handle a command: apply any local UI state, flash the button, forward it
   * to the transport, and log it.
   */
  Remote.prototype.press = function (command, btn) {
    if (btn) this._flash(btn);

    var payload = {};

    if (command === 'power') {
      this.powered = !this.powered;
      this._setStatus(this.powered);
    }

    // Number pad accumulates a channel/PIN buffer.
    if (command.indexOf('num_') === 0) {
      var digit = command.slice(4);
      this.buffer = (this.buffer + digit).slice(-6);
      payload.buffer = this.buffer;
    } else if (command === 'clear') {
      this.buffer = '';
      payload.buffer = '';
    } else if (command === 'enter') {
      payload.buffer = this.buffer;
      this.buffer = '';
    }

    try {
      this.transport.send(command, payload);
    } catch (err) {
      this._append({ command: 'ERROR: ' + command, payload: { message: String(err) }, ts: Date.now() });
      return;
    }
  };

  Remote.prototype._flash = function (btn) {
    btn.classList.add('is-pressed');
    setTimeout(function () { btn.classList.remove('is-pressed'); }, 120);
  };

  Remote.prototype._setStatus = function (on) {
    this.statusDot.classList.toggle('is-on', on);
    this.statusText.textContent = on ? 'On' : 'Standby';
  };

  // --- command log -------------------------------------------------------
  Remote.prototype.log = [];

  Remote.prototype._append = function (entry) {
    this.log.unshift(entry);
    if (this.log.length > MAX_LOG) this.log.length = MAX_LOG;
    this._renderLog();
  };

  Remote.prototype._renderLog = function () {
    var el = this.logEl;
    if (!el) return;
    if (!this.log.length) {
      el.innerHTML = '<li class="console__empty">No commands yet — press a button.</li>';
      return;
    }
    var html = this.log.map(function (e) {
      var t = new Date(e.ts);
      var hh = String(t.getHours()).padStart(2, '0');
      var mm = String(t.getMinutes()).padStart(2, '0');
      var ss = String(t.getSeconds()).padStart(2, '0');
      var extra = e.payload && e.payload.buffer ? ' <span>' + e.payload.buffer + '</span>' : '';
      return '<li><time>' + hh + ':' + mm + ':' + ss + '</time>' +
             '<span class="cmd">' + e.command + '</span>' + extra + '</li>';
    }).join('');
    el.innerHTML = html;
  };

  // --- bootstrap ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('.remote');

    // Swap MockTransport for a real transport (WebSocket, HTTP, …) here.
    var remote;
    var transport = new window.MockTransport(function (entry) {
      remote._append(entry);
    });

    remote = new Remote(root, transport);
    window.remote = remote; // handy for debugging in the console
  });
})();
