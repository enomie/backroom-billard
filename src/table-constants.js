/**
 * WPA 9-Fuß Pool (Recommended Equipment Specifications) — Meter.
 * @see https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf
 */

/** Spielfläche 100″ × 50″ */
export const PLAY_L = 2.54;
export const PLAY_W = 1.27;

/** Spieloberfläche Filz (beliebte Möbelhöhe; WPA regelt Boden–Rail separat) */
export const TABLE_H = 0.85;

export const BALL_DIAMETER = 0.05715;
export const BALL_RADIUS_REAL = BALL_DIAMETER / 2;

/** Kissen: Nose-Line bis Tuch, 63,5 % des Kugeldurchmessers (WPA-Mitte) */
export const CUSHION_NOSE_TO_BED = 0.635 * BALL_DIAMETER;

/**
 * Bandengummi (K-66 / typisch): ~40 mm Profilbreite, leichter Überhang aufs Filz.
 * (WPA erlaubt 1,7/8″–2″ ≈ 48–51 mm.)
 */
export const CUSHION_PROFILE_WIDTH = 0.04;

/** Unterkante Gummi etwas über Filzkante nach außen (Trapez, nicht Quader). */
export const CUSHION_PROFILE_BOTTOM_OUTSET = 0.006;

/**
 * K-66-Profil: Die Nase liegt OBEN (Höhe `CUSHION_NOSE_TO_BED`), die Gummifläche
 * weicht nach unten um diesen Betrag zurück (Fuß der Fläche am Tuch).
 */
export const CUSHION_PROFILE_FACE_RECESS = 0.012;

/**
 * Kugelmittelpunkt-Abstand zur Nasenlinie beim Bandenkontakt: Die Kugel berührt die
 * Nase (Punkt in Höhe `CUSHION_NOSE_TO_BED`), ihr Mittelpunkt liegt aber nur
 * `BALL_RADIUS_REAL` über dem Tuch → horizontaler Abstand √(R² − (H − R)²) ≈ 27,5 mm.
 */
export const CUSHION_BALL_CONTACT_R = Math.sqrt(
  BALL_RADIUS_REAL ** 2 - (CUSHION_NOSE_TO_BED - BALL_RADIUS_REAL) ** 2
);

/** Holzrahmen außerhalb der Filzkante (Turnier-üblich ~110 mm). */
export const RAIL_WOOD_DEPTH = 0.11;

/** Nasenlinie → Tisch-Außenkante (~150 mm / 6″, WPA 4″–7½″). */
export const RAIL_CAP_WIDTH = CUSHION_PROFILE_WIDTH + RAIL_WOOD_DEPTH;

/** Platte / Schiefer mind. 1″ */
export const FELT_BED_DEPTH = 0.0254;

/** Taschen-Mündung (mouth) WPA-Mittel → Zylinder-Näherung radius = mouth/2 */
const CORNER_MOUTH =
  (0.1143 + 0.1175) / 2;
const SIDE_MOUTH = (0.127 + 0.130175) / 2;

export const POCKET_R_CORNER = CORNER_MOUTH / 2;
export const POCKET_R_SIDE = SIDE_MOUTH / 2;

export const POCKET_CORNER_OFFSET_FACTOR = 0.35;
export const POCKET_SIDE_OFFSET_FACTOR = 0.2;
export const POCKET_OVERHANG_TOP = 0.02;
export const POCKET_DEPTH_BOTTOM = 0.15;
