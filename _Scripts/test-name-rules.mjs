/** Examples for src/name-rules.js: `npm test` */
import assert from "node:assert/strict";
import { filterName, normalizeName, isValidName, middleInitial, displayName } from "../src/name-rules.js";

const cases = [
  // filter: letters, dot after a letter, hyphen after a letter or dot
  [filterName("Anna"), "Anna"],
  [filterName("An1na!"), "Anna"],
  [filterName("Jean-Luc"), "Jean-Luc"],
  [filterName("J.-L."), "J.-L."],
  [filterName("--Anna"), "Anna"],
  [filterName("An--na"), "An-na"],
  [filterName("T..x"), "T.x"],
  [filterName(".T"), "T"],
  [filterName("Anna Lena"), "AnnaLena"],
  [filterName("Zoë Ñandú"), "ZoëÑandú"],
  [filterName("Å".repeat(40)).length, 10],
  // normalize
  [normalizeName("mario"), "Mario"],
  [normalizeName("jean-luc"), "Jean-Luc"],
  [normalizeName("McDonald"), "McDonald"],
  [normalizeName("anna-"), "Anna"],
  [normalizeName("öztürk"), "Öztürk"],
  // valid
  [isValidName("Anna", true), true],
  [isValidName("", true), false],
  [isValidName("", false), true],
  [isValidName(".", true), false],
  [isValidName("T.", false), true],
  // middle initial
  [middleInitial("Theodor"), "T."],
  [middleInitial("t"), "T."],
  [middleInitial("T."), "T."],
  [middleInitial("Jean-Luc"), "J.-L."],
  [middleInitial(""), ""],
  [middleInitial("ärmel"), "Ä."],
  // display
  [displayName({ firstName: "Anna", middleName: "Theodor", lastName: "Meier" }, "full"), "Anna Theodor Meier"],
  [displayName({ firstName: "Anna", middleName: "Theodor", lastName: "Meier" }, "short"), "Anna T. Meier"],
  [displayName({ firstName: "Anna", middleName: "Theodor", lastName: "Meier" }, "initials"), "A. T. M."],
  [displayName({ firstName: "Anna", middleName: "", lastName: "Meier" }, "short"), "Anna Meier"],
  [displayName({ firstName: "Anna", middleName: "T.", lastName: "Meier" }, "full"), "Anna T. Meier"],
  [displayName(null), ""],
];
cases.forEach(([got, want], i) => assert.deepEqual(got, want, `case ${i}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`));
console.log(`name-rules: ${cases.length} examples ok`);
