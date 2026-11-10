/** The stake window and the table bet (see stake-window.js): the amounts in $. The database applies the same limits (spacetime/src/index.ts). */
export const STAKE_MIN = 100; // the least; whoever has less may put in all he has
export const STAKE_STEPS = [-100, -10, 10, 100]; // the buttons
export const STAKE_ROUND = 10; // amounts are multiples of this (except "all my money")
