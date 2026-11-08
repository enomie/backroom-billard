/**
 * Track title of the radio stream. The <audio> element exposes no stream metadata, so the stream is
 * requested a second time with `Icy-MetaData: 1`; the server then inserts the title (`StreamTitle`)
 * every `icy-metaint` bytes. Only the first block is read, then the request is aborted. This needs
 * CORS to allow and expose the `icy-metaint` header; without it no title is shown (silent fallback).
 *
 * The title is a side issue and must never disturb the sound: it does not run on the sound's ups and
 * downs, asks only while the radio plays and the tab is visible, never two requests at once, each with
 * a timeout, slower after every failure, and gives up after a few failures in a row (until the radio
 * is switched on again).
 */
import {
  RADIO_METADATA_INTERVAL,
  RADIO_METADATA_FIRST_DELAY,
  RADIO_METADATA_TIMEOUT,
  RADIO_METADATA_MAX_FAILURES,
  RADIO_METADATA_MAX_INTERVAL,
} from "./radio-constants.js";

/** Read the first ICY metadata block of a stream. Resolves to the title or "" if there is none. */
async function fetchTitle(url, signal) {
  const response = await fetch(url, { headers: { "Icy-MetaData": "1" }, signal });
  const metaint = Number(response.headers.get("icy-metaint"));
  if (!response.ok || !response.body || !metaint) return "";
  const reader = response.body.getReader();
  try {
    let buffer = new Uint8Array(0);
    let need = metaint + 1; // audio bytes + the length byte
    let metaLength = -1;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return "";
      const joined = new Uint8Array(buffer.length + value.length);
      joined.set(buffer);
      joined.set(value, buffer.length);
      buffer = joined;
      if (metaLength < 0 && buffer.length >= need) {
        metaLength = buffer[metaint] * 16;
        if (metaLength === 0) return "";
        need += metaLength;
      }
      if (metaLength > 0 && buffer.length >= need) {
        const text = new TextDecoder().decode(buffer.subarray(metaint + 1, need));
        const match = /StreamTitle='(.*?)';/s.exec(text);
        return match ? match[1].trim() : "";
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** Polls the title while started. `onTitle("")` means no title available. */
export class RadioMetadata {
  /**
   * @param {string} url
   * @param {(title: string) => void} onTitle
   * @param {() => boolean} isPlaying — true while the sound runs: only then it is asked
   */
  constructor(url, onTitle, isPlaying) {
    this.url = url;
    this.onTitle = onTitle;
    this.isPlaying = isPlaying;
    this.running = false;
    this.abort = null;
    this.timer = 0;
    this.failures = 0;
  }

  start() {
    this.stop();
    this.running = true;
    this.failures = 0;
    this.schedule(RADIO_METADATA_FIRST_DELAY);
  }

  stop() {
    this.running = false;
    this.abort?.abort();
    this.abort = null;
    window.clearTimeout(this.timer);
  }

  /** Ask again after `seconds`. */
  schedule(seconds) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.poll(), seconds * 1000);
  }

  async poll() {
    if (!this.running) return;
    // not while the sound is down or the tab is in the background: look again soon
    if (!this.isPlaying() || document.hidden) return this.schedule(RADIO_METADATA_INTERVAL / 3);
    const abort = new AbortController();
    this.abort = abort;
    const timeout = window.setTimeout(() => abort.abort(), RADIO_METADATA_TIMEOUT * 1000);
    let title = null; // null = the request failed
    try {
      title = await fetchTitle(this.url, abort.signal);
    } catch {
      /* no CORS, offline, too slow or aborted */
    } finally {
      window.clearTimeout(timeout);
    }
    if (!this.running || this.abort !== abort) return;
    this.abort = null;
    if (title === null) {
      this.failures++;
      this.onTitle("");
      if (this.failures >= RADIO_METADATA_MAX_FAILURES) return; // gives up quietly: sender and "live" stay
      return this.schedule(Math.min(RADIO_METADATA_MAX_INTERVAL, RADIO_METADATA_INTERVAL * 2 ** this.failures));
    }
    this.failures = 0;
    this.onTitle(title);
    this.schedule(RADIO_METADATA_INTERVAL);
  }
}
