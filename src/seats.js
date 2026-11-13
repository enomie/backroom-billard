/**
 * The two seats of the billard table as wholes (see _docs/trinken-rauchen.md): the glass, the pack of cigarettes, the lighter and the ashtray with
 * its cigarettes of one seat belong together. They live in five modules (each with its own list by side); this is the one place that knows them
 * all: a seat is taken or free, it has a kit that the hands use, and a kit that can be read and set ({ drink, sips, pack, packCount }).
 * Side 0 is the −z half of the table, side 1 the +z half (seat 1 is side 1, seat 2 is side 0).
 */

/**
 * @param {{ glasses: any, packs: any, lighters: any, ashtrays: any, cigarettes: any }} sets
 */
export function createSeats({ glasses, packs, lighters, ashtrays, cigarettes }) {
  const kits = [];
  return {
    /** The things of a seat stand on the table only while a guest sits there. */
    setTaken(side, taken) {
      glasses.setSeat(side, taken);
      packs.setSeat(side, taken);
      lighters.setSeat(side, taken);
      ashtrays.setSeat(side, taken);
      cigarettes.setSeat(side, taken);
    },
    /** What the hands (drinking.js, smoking.js) use at this seat: `{ carried: false, glass, pack, lighter, glowing(), spawn() }`. */
    kit(side) {
      return (kits[side] ??= {
        carried: false,
        glass: glasses.seat(side),
        pack: packs.packs[side],
        lighter: lighters.lighters[side],
        glowing: () => cigarettes.playerCigarette(side),
        spawn: () => cigarettes.spawn(side),
      });
    },
    /** The kit as it stands at the seat now. */
    read(side) {
      const glass = glasses.seat(side);
      const pack = packs.packs[side];
      return { drink: glass.kind, sips: glass.sipsLeft, pack: pack.design, packCount: pack.count };
    },
    /** Put a kit at the seat: the glass with its sips, the pack with its cigarettes. */
    set(side, kit) {
      glasses.setSeatGlass(side, kit.drink, kit.sips);
      packs.setSeatPack(side, kit.pack, kit.packCount);
    },
  };
}
