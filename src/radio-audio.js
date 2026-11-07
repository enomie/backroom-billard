/**
 * Radio playback: an <audio> element for the stream, routed through Web Audio so the sound comes
 * from the radio's two speakers (left and right channel, positioned in the room, the listener is
 * the camera, see audio.js). If the stream does not allow cross-origin audio processing (CORS), it falls back to
 * plain playback with a volume that follows the distance.
 */
import { getAudioContext, getMasterNode } from "./audio.js";
import {
  RADIO_VOLUME,
  RADIO_REF_DISTANCE,
  RADIO_ROLLOFF,
} from "./radio-constants.js";

/** @typedef {"off" | "waiting" | "connecting" | "live" | "error"} RadioState */

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
    this.nodes = null;
    this.state = /** @type {RadioState} */ ("off");
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

  /** @param {boolean} crossOrigin — try the Web Audio (spatial, stereo) path first */
  start(crossOrigin = true) {
    this.stop();
    const audio = new Audio();
    audio.crossOrigin = crossOrigin ? "anonymous" : null;
    audio.preload = "none";
    audio.src = this.url;
    this.element = audio;
    this.setState("connecting");

    audio.addEventListener("playing", () => this.wanted && this.setState("live"));
    audio.addEventListener("waiting", () => this.wanted && this.setState("connecting"));
    audio.addEventListener("stalled", () => this.wanted && this.setState("connecting"));
    audio.addEventListener("error", () => {
      if (!this.wanted || this.element !== audio) return;
      if (crossOrigin) {
        // Probably no CORS headers: play plainly (no stereo split, volume by distance)
        console.warn("[Backroom Billard] radio: cross-origin audio failed, using plain playback");
        this.start(false);
      } else {
        this.setState("error");
      }
    });

    this.spatial = crossOrigin && this.connectSpatial(audio);
    audio.volume = this.spatial ? 1 : 0;
    audio.play().catch(() => {
      if (this.wanted && this.element === audio && !crossOrigin) this.setState("error");
    });
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
      level.gain.value = RADIO_VOLUME;
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

  stop() {
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

  /**
   * Per frame: without spatial audio the volume follows the distance to the radio.
   * @param {import("three").Camera} camera
   * @param {import("three").Vector3} radioPosition
   */
  update(camera, radioPosition) {
    if (this.spatial || !this.element) return;
    const d = camera.position.distanceTo(radioPosition);
    const gain = RADIO_REF_DISTANCE / (RADIO_REF_DISTANCE + RADIO_ROLLOFF * Math.max(0, d - RADIO_REF_DISTANCE));
    this.element.volume = Math.min(1, gain * RADIO_VOLUME);
  }
}
