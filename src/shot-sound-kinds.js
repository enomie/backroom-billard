/**
 * The sounds of a shot as numbered kinds: played here, and (in a multiplayer game) written down by the shot recorder
 * so the others hear the same sounds in the replay.
 */
import { playDrawBackSound, playForwardSound, playStrikeSound } from "./shot-sounds.js";
import { playBallHitSound, playCushionHitSound } from "./collision-sounds.js";
import { playPocketEntrySound, playCupLandingSound, playCupWallSound } from "./cup-sounds.js";

export const SOUND_DRAW_BACK = 1;
export const SOUND_FORWARD = 2;
export const SOUND_STRIKE = 3;
export const SOUND_POCKET_ENTRY = 4;
export const SOUND_CUP_LANDING = 5;
export const SOUND_CUP_WALL = 6;
export const SOUND_CUSHION_HIT = 7;
export const SOUND_BALL_HIT = 8;

/** Where the cue sounds come from: the cue behind the ball and the player's head further back. */
function cueSoundPositions(angle, ballPos) {
  const back = [Math.sin(angle), 0, Math.cos(angle)];
  const at = (distance, up) => [ballPos.x + back[0] * distance, ballPos.y + up, ballPos.z + back[2] * distance];
  return { cue: at(0.5, 0.06), head: at(1.1, 0.5) };
}

/**
 * Play one sound of a shot.
 * @param {number} kind — SOUND_*
 * @param {number} p1 — the strength or speed
 * @param {number} p2 — the seconds (cue sounds), the ball (the numbers of both for a clack: a × 100 + b)
 * @param {number[]} position — where it is heard (for the cue sounds: the angle of the shot in the first place)
 * @param {{ x: number, y: number, z: number }} cueBallPos — the white ball (the cue sounds are placed behind it)
 */
export function playShotSound(kind, p1, p2, position, cueBallPos) {
  switch (kind) {
    case SOUND_DRAW_BACK:
      playDrawBackSound(p1, p2, cueSoundPositions(position[0], cueBallPos));
      break;
    case SOUND_FORWARD:
      playForwardSound(p1, p2, cueSoundPositions(position[0], cueBallPos));
      break;
    case SOUND_STRIKE:
      playStrikeSound(p1, position);
      break;
    case SOUND_POCKET_ENTRY:
      playPocketEntrySound(p1, `r${p2}`, position);
      break;
    case SOUND_CUP_LANDING:
      playCupLandingSound(p1, `f${p2}`, position);
      break;
    case SOUND_CUP_WALL:
      playCupWallSound(p1, `w${p2}`, position);
      break;
    case SOUND_CUSHION_HIT:
      playCushionHitSound(p1, `c${p2}`, position);
      break;
    case SOUND_BALL_HIT:
      playBallHitSound(p1, `b${Math.floor(p2 / 100)}-${p2 % 100}`, position);
      break;
  }
}
