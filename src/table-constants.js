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

/** Rückseite des Gummis sitzt senkrecht und ragt so weit ins Holz (kein Spalt zur Holzwand). */
export const CUSHION_PROFILE_BOTTOM_OUTSET = 0.002;

/**
 * K-66-Profil: Die Nase liegt OBEN (Höhe `CUSHION_NOSE_TO_BED`), die Gummifläche
 * weicht nach unten um diesen Betrag zurück (Fuß der Fläche am Tuch).
 */
export const CUSHION_PROFILE_FACE_RECESS = 0.012;

/** Holzrahmen außerhalb der Filzkante (Turnier-üblich ~110 mm). */
export const RAIL_WOOD_DEPTH = 0.11;

/** Grüne Spielplatte (Filz auf Träger): 5 mm dick; darunter beginnt der Taschenbecher. */
export const FELT_BED_DEPTH = 0.005;

/** Taschen-Mündung (mouth) WPA-Mittel → Zylinder-Näherung radius = mouth/2 */
const CORNER_MOUTH =
  (0.1143 + 0.1175) / 2;
const SIDE_MOUTH = (0.127 + 0.130175) / 2;

export const POCKET_R_CORNER = CORNER_MOUTH / 2;
export const POCKET_R_SIDE = SIDE_MOUTH / 2;

/** 0 = Lochmitte genau auf der Filzkanten-Ecke (Skizze). */
export const POCKET_CORNER_OFFSET_FACTOR = 0;
/** 0 = Lochmitte genau auf der Filzkante (Skizze). */
export const POCKET_SIDE_OFFSET_FACTOR = 0;
export const POCKET_OVERHANG_TOP = 0.02;
export const POCKET_DEPTH_BOTTOM = 0.15;

/**
 * Bandenenden an den Taschen (Facette): Die Rückseite des Gummis (an der Filzkante) endet am runden
 * Loch, die Nase ist zurückgeschnitten. `k` = Rücksprung der Endfläche pro Meter Gummitiefe
 * (k = 1 → 45°, k = 0,25 → ca. 14°).
 */
export const CUSHION_END_RECESS_CORNER = 1.0;
export const CUSHION_END_RECESS_SIDE = 0.25;
