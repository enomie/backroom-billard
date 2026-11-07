/** Radio and sideboard parameters (meters). See _docs/radio.md. */

/** Direct AAC 256k stream of the station. */
export const RADIO_STREAM_URL = "https://knkx-live-a.edge.audiocdn.com/6285_256k";
export const RADIO_STATION_NAME = "KNKX";
/** Seconds between title requests while the radio plays. */
export const RADIO_METADATA_INTERVAL = 20;

/** Placement: the sideboard stands against a long wall (x = ±ROOM_WIDTH/2); +1 = +x wall, −1 = −x wall. */
export const RADIO_WALL_SIDE = 1;
/** Position along the wall (z, 0 = in line with the table center). */
export const RADIO_WALL_Z = 0;

/** Sideboard (wooden): width along the wall, depth from the wall, height. */
export const SIDEBOARD_WIDTH = 1.6;
export const SIDEBOARD_DEPTH = 0.42;
export const SIDEBOARD_HEIGHT = 0.78;

/** Radio body. */
export const RADIO_WIDTH = 0.56;
export const RADIO_HEIGHT = 0.31;
export const RADIO_DEPTH = 0.26;

/** Speakers (stereo): horizontal distance from the radio center to each speaker, and height. */
export const RADIO_SPEAKER_OFFSET_X = 0.15;
export const RADIO_SPEAKER_HEIGHT = 0.2;

/** Audio: master level of the radio, and distance model (the radio gets quieter with distance). */
export const RADIO_VOLUME = 0.7;
export const RADIO_REF_DISTANCE = 2.5; // full level up to this distance (m)
export const RADIO_ROLLOFF = 1.1;

/** Clicks on the power knob only count when the camera is closer than this (m). */
export const RADIO_CLICK_DISTANCE = 6;

/** Colors. */
export const RADIO_COLOR_WOOD = 0x6b4328;
export const RADIO_COLOR_GRILLE = 0xc9a45c;
export const RADIO_COLOR_BRASS = 0xb08d4a;
export const RADIO_COLOR_KNOB = 0xe6dcc3;
