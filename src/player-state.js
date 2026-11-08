/**
 * The player's condition (see player-constants.js): thirst/drunkenness and nerves/desire, and
 * what they do to the aim: the cue sways, and a drunk shot is a little off.
 */
import {
  PLAYER_START_BODY,
  PLAYER_START_NICOTINE,
  THIRST_DRIFT,
  DESIRE_DRIFT,
  SIP_EFFECT,
  DRAG_EFFECT,
  CALM_ZONE,
  SWAY_MAX,
  SWAY_SPEED,
  DRUNK_SHOT_ERROR,
} from "./player-constants.js";

const clamp1 = (v) => Math.max(-1, Math.min(1, v));
/** How far out of the calm zone a marker is: 0 inside, up to 1 at the end of the bar. */
const outside = (v) => Math.max(0, Math.abs(v) - CALM_ZONE) / (1 - CALM_ZONE);

export function createPlayerState() {
  const state = {
    body: PLAYER_START_BODY,
    nicotine: PLAYER_START_NICOTINE,

    /** Time passes: the player gets thirsty and wants a cigarette. */
    update(dt) {
      state.body = clamp1(state.body - THIRST_DRIFT * dt);
      state.nicotine = clamp1(state.nicotine + DESIRE_DRIFT * dt);
    },
    /** One sip of a drink. */
    sip() {
      state.body = clamp1(state.body + SIP_EFFECT);
    },
    /** Drawing on a cigarette for `dt` seconds. */
    drag(dt) {
      state.nicotine = clamp1(state.nicotine - DRAG_EFFECT * dt);
    },

    /**
     * Swing of the cue and aim line (rad) at `time` seconds. Each end of the two bars has its own
     * kind of unsteadiness: nerves = fast and small, desire = slow and large, thirsty = medium and
     * irregular, drunk = very slow and large. Zero when both markers are in the calm zone.
     */
    sway(time) {
      const thirsty = outside(Math.min(state.body, 0));
      const drunk = outside(Math.max(state.body, 0));
      const nerves = outside(Math.min(state.nicotine, 0));
      const desire = outside(Math.max(state.nicotine, 0));
      const t = time * Math.PI * 2;
      const swing =
        nerves * 0.45 * (Math.sin(t * 7.3 * SWAY_SPEED.nerves) + 0.5 * Math.sin(t * 11.9 * SWAY_SPEED.nerves + 1)) +
        desire * 0.9 * (Math.sin(t * 0.55 * SWAY_SPEED.desire) + 0.4 * Math.sin(t * 1.3 * SWAY_SPEED.desire + 2)) +
        thirsty * 0.6 * (Math.sin(t * 1.4 * SWAY_SPEED.thirsty + 0.5) + 0.7 * Math.sin(t * 2.9 * SWAY_SPEED.thirsty)) +
        drunk * 1.1 * (Math.sin(t * 0.33 * SWAY_SPEED.drunk) + 0.6 * Math.sin(t * 0.81 * SWAY_SPEED.drunk + 1.7));
      return SWAY_MAX * swing;
    },
    /** Extra aim error of a shot taken now: only the drunk make it (rad, random). */
    shotError() {
      return (Math.random() * 2 - 1) * DRUNK_SHOT_ERROR * outside(Math.max(state.body, 0));
    },
  };
  return state;
}
