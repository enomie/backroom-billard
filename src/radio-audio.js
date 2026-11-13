/**
 * Radio playback: an <audio> element for the stream, routed through Web Audio so the sound comes
 * from the radio's two speakers (left and right channel, positioned in the room, the listener is
 * the camera, see audio.js). If the stream does not allow cross-origin audio processing (CORS), it
 * falls back to plain playback with a volume that follows the distance.
 *
 * A live stream drops now and then (network, server, a sleeping tab): the radio notices (error,
 * end, a stall without progress, a connection that never comes) and reconnects by itself with
 * growing pauses, as long as it is switched on. See _docs/radio.md.
 */
import { getAudioContext, getMasterNode } from "./audio.js";
import {
  RADIO_VOLUME,
  RADIO_REF_DISTANCE,
  RADIO_ROLLOFF,
  RADIO_RETRY_DELAYS,
  RADIO_FAILURES_BEFORE_NO_SIGNAL,
  RADIO_STALL_SECONDS,
  RADIO_CONNECT_SECONDS,
  RADIO_STABLE_SECONDS,
} from "./radio-constants.js";

/** @typedef {"off" | "waiting" | "connecting" | "live" | "error"} RadioState */

const WATCHDOG_MS = 2000;

export class RadioAudio {
  /**
   * @param {string} url
   * @param {{ left: [number, number, number], right: [number, number, number] }} speakers — world positions
   * @param {(state: RadioState) => void} onState
   */
  constructor(url, speakers, onState) {
    this.url = url;
    this.speakers = speakers;
    this.onState = onState;
    this.wanted = false; // the radio is switched on
    this.unlocked = false; // a user gesture happened (browsers allow sound only after one)
    this.element = null;
    this.spatial = false;
    this.volume = 1; // this guest's level (settings slider), 0..1, times RADIO_VOLUME
    this.nodes = null;
    this.state = /** @type {RadioState} */ ("off");
    this.plainOnly = false; // the server does not allow Web Audio (CORS): play plainly from now on
    this.failures = 0; // drops in a row
    this.retryTimer = 0;
    this.watchdog = 0;
    this.connectedAt = 0; // when this connection was started
    this.playingSince = 0; // when the sound began to run (0 = not yet)
    this.lastTime = 0; // playback position at the last look of the watchdog
    this.lastProgress = 0; // when the position last advanced

    // Back in the tab or the network is back: do not wait for the next pause
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      getAudioContext(); // wakes a sleeping audio context
      this.reconnectIfDown();
    });
    window.addEventListener("online", () => this.reconnectIfDown());
  }

  setState(state) {
    if (state === this.state) return;
    this.state = state;
    this.onState(state);
  }

  /** The radio is switched on or off (the knob). */
  setOn(on) {
    this.wanted = on;
    if (!on) {
      this.stop();
      this.setState("off");
    } else if (this.unlocked) {
      this.start();
    } else {
      this.setState("waiting"); // on, but silent until the first click/key
    }
  }

  /** Call on every user gesture; the first one allows playback. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.wanted) this.start();
  }

  /** A fresh start: no drops so far. */
  start() {
    this.failures = 0;
    this.connect();
  }

  /** Open a connection now (whatever was there is closed first). */
  connect() {
    this.closeConnection();
    if (!this.wanted) return;
    const crossOrigin = !this.plainOnly;
    const audio = new Audio();
    audio.crossOrigin = crossOrigin ? "anonymous" : null;
    audio.preload = "none";
    audio.src = this.url;
    this.element = audio;
    this.connectedAt = performance.now();
    this.playingSince = 0;
    this.lastTime = 0;
    this.lastProgress = performance.now();
    this.setState(this.failures >= RADIO_FAILURES_BEFORE_NO_SIGNAL ? "error" : "connecting");

    audio.addEventListener("playing", () => {
      if (this.element !== audio) return;
      this.playingSince ||= performance.now();
      this.lastProgress = performance.now();
      this.setState("live");
    });
    audio.addEventListener("waiting", () => this.element === audio && this.state === "live" && this.setState("connecting"));
    audio.addEventListener("stalled", () => this.element === audio && this.state === "live" && this.setState("connecting"));
    audio.addEventListener("ended", () => this.dropped(audio, "ended"));
    audio.addEventListener("error", () => this.dropped(audio, "error"));

    this.spatial = crossOrigin && this.connectSpatial(audio);
    audio.volume = this.spatial ? 1 : 0;
    audio.play().catch((e) => {
      if (this.element !== audio) return;
      if (e?.name === "NotAllowedError") this.setState("waiting"); // no gesture yet: the first click starts it
      else if (e?.name !== "AbortError") this.dropped(audio, "play");
    });
    this.startWatchdog();
  }

  /**
   * The connection is lost. A failure before any sound was heard with the Web Audio path means the
   * server does not allow it (CORS): play plainly, at once. Otherwise: reconnect after a pause.
   * @param {HTMLAudioElement} audio
   * @param {string} reason
   */
  dropped(audio, reason) {
    if (!this.wanted || this.element !== audio) return;
    if (!this.plainOnly && !this.playingSince && audio.crossOrigin) {
      console.warn("[Backroom Billard] radio: cross-origin audio failed, using plain playback");
      this.plainOnly = true;
      this.connect();
      return;
    }
    // sound that ran for a while was a good connection: this drop is the first one again
    if (this.playingSince && performance.now() - this.playingSince > RADIO_STABLE_SECONDS * 1000) this.failures = 0;
    this.failures++;
    const pause = RADIO_RETRY_DELAYS[Math.min(this.failures - 1, RADIO_RETRY_DELAYS.length - 1)];
    console.warn(`[Backroom Billard] radio: stream lost (${reason}), trying again in ${pause} s`);
    this.closeConnection();
    this.setState(this.failures >= RADIO_FAILURES_BEFORE_NO_SIGNAL ? "error" : "connecting");
    this.retryTimer = window.setTimeout(() => this.connect(), pause * 1000);
  }

  /** Looks every 2 s whether the sound still runs; a stall or a connection that never comes is a drop. */
  startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = window.setInterval(() => {
      const audio = this.element;
      if (!this.wanted || !audio) return;
      const now = performance.now();
      if (this.playingSince) {
        if (audio.currentTime !== this.lastTime) [this.lastTime, this.lastProgress] = [audio.currentTime, now];
        else if (!audio.paused && now - this.lastProgress > RADIO_STALL_SECONDS * 1000) this.dropped(audio, "stalled");
      } else if (this.state === "connecting" && now - this.connectedAt > RADIO_CONNECT_SECONDS * 1000) {
        this.dropped(audio, "no connection");
      }
    }, WATCHDOG_MS);
  }

  /** Back online or back in the tab: if the radio should play but does not, try now instead of after the pause. */
  reconnectIfDown() {
    if (!this.wanted || !this.unlocked || this.state === "live") return;
    window.clearTimeout(this.retryTimer);
    this.connect();
  }

  /** Route the element through two panners at the speaker positions. Returns false if impossible. */
  connectSpatial(audio) {
    const ctx = getAudioContext();
    const master = getMasterNode();
    if (!ctx || !master) return false;
    try {
      const source = ctx.createMediaElementSource(audio);
      // Mono streams are duplicated to both channels, stereo streams keep left/right
      const upmix = ctx.createGain();
      upmix.channelCount = 2;
      upmix.channelCountMode = "explicit";
      upmix.channelInterpretation = "speakers";
      const splitter = ctx.createChannelSplitter(2);
      const level = ctx.createGain();
      level.gain.value = RADIO_VOLUME * this.volume;
      level.connect(master);
      const panners = [this.speakers.left, this.speakers.right].map((pos, channel) => {
        const panner = ctx.createPanner();
        panner.panningModel = "equalpower";
        panner.distanceModel = "inverse";
        panner.refDistance = RADIO_REF_DISTANCE;
        panner.rolloffFactor = RADIO_ROLLOFF;
        panner.positionX.value = pos[0];
        panner.positionY.value = pos[1];
        panner.positionZ.value = pos[2];
        splitter.connect(panner, channel, 0);
        panner.connect(level);
        return panner;
      });
      source.connect(upmix);
      upmix.connect(splitter);
      this.nodes = { source, upmix, splitter, level, panners };
      return true;
    } catch (e) {
      console.warn("[Backroom Billard] radio: spatial audio not available", e);
      return false;
    }
  }

  /** Close the connection (and the nodes of it) and cancel a waiting retry. */
  closeConnection() {
    window.clearTimeout(this.retryTimer);
    if (this.element) {
      const audio = this.element;
      this.element = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (this.nodes) {
      try {
        this.nodes.source.disconnect();
        this.nodes.level.disconnect();
        this.nodes.panners.forEach((p) => p.disconnect());
      } catch {
        /* already disconnected */
      }
      this.nodes = null;
    }
    this.spatial = false;
  }

  /** This guest's level from the settings slider (0..1); applied at once. */
  setVolume(volume) {
    this.volume = volume;
    if (this.nodes) this.nodes.level.gain.value = RADIO_VOLUME * volume;
  }

  stop() {
    this.closeConnection();
    window.clearInterval(this.watchdog);
    this.watchdog = 0;
  }

  /**
   * Per frame: without spatial audio the volume follows the distance to the radio.
   * @param {import("three").Camera} camera
   * @param {import("three").Vector3} radioPosition
   */
  update(camera, radioPosition) {
    if (this.spatial || !this.element) return;
    const d = camera.position.distanceTo(radioPosition);
    const gain = RADIO_REF_DISTANCE / (RADIO_REF_DISTANCE + RADIO_ROLLOFF * Math.max(0, d - RADIO_REF_DISTANCE));
    this.element.volume = Math.min(1, gain * RADIO_VOLUME * this.volume);
  }
}
