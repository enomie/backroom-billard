/**
 * Track title of the radio stream. The <audio> element exposes no stream metadata, so the stream is
 * requested a second time with `Icy-MetaData: 1`; the server then inserts the title (`StreamTitle`)
 * every `icy-metaint` bytes. Only the first block is read, then the request is aborted. This needs
 * CORS to allow and expose the `icy-metaint` header; without it no title is shown (silent fallback).
 */
import { RADIO_METADATA_INTERVAL } from "./radio-constants.js";

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
   */
  constructor(url, onTitle) {
    this.url = url;
    this.onTitle = onTitle;
    this.abort = null;
    this.timer = 0;
  }

  start() {
    this.stop();
    const abort = new AbortController();
    this.abort = abort;
    const poll = async () => {
      let title = "";
      try {
        title = await fetchTitle(this.url, abort.signal);
      } catch {
        /* no CORS, offline or aborted: no title */
      }
      if (abort.signal.aborted) return;
      this.onTitle(title);
      this.timer = window.setTimeout(poll, RADIO_METADATA_INTERVAL * 1000);
    };
    poll();
  }

  stop() {
    this.abort?.abort();
    this.abort = null;
    window.clearTimeout(this.timer);
  }
}
