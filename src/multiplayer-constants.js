/** The connection to the database (SpacetimeDB on Maincloud, see _docs/multiplayer.md and spacetime/README.md). */
export const MULTIPLAYER_URI = "wss://maincloud.spacetimedb.com";
export const MULTIPLAYER_DATABASE = "backroom-billard-3000";
/** The login of this browser is kept (localStorage) so that a guest stays the same one on the next visit. */
export const MULTIPLAYER_TOKEN_KEY = "backroom-billard.spacetime-token";
/** A sign of life to the database, and the place of the own camera: every this many seconds. */
export const MULTIPLAYER_HEARTBEAT_SECONDS = 2;
export const MULTIPLAYER_PRESENCE_SECONDS = 0.1;
/** How fast the face of another guest follows his camera (1 / s: higher = faster). */
export const MULTIPLAYER_FACE_FOLLOW = 12;
/** The most the welcome screen waits for the room to be set up (s); then it says that it did not work. */
export const MULTIPLAYER_JOIN_SECONDS = 15;
