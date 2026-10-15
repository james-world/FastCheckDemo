// The two-jug water puzzle as a state machine.
//
// This mirrors the TLA+ "DieHard" specification by Leslie Lamport:
//
//   VARIABLES small, big
//   TypeOK  == small \in 0..3 /\ big \in 0..5
//   Init    == small = 0 /\ big = 0
//   FillSmall, FillBig, EmptySmall, EmptyBig, SmallToBig, BigToSmall
//   Next    == FillSmall \/ FillBig \/ EmptySmall \/ EmptyBig \/ SmallToBig \/ BigToSmall
//
// The state is a plain immutable object. Each action returns a new state.

export const SMALL_CAPACITY = 3;
export const BIG_CAPACITY = 5;
export const TARGET = 4;

export const initialState = () => ({ small: 0, big: 0 });

export const fillSmall = (s) => ({ ...s, small: SMALL_CAPACITY });
export const fillBig = (s) => ({ ...s, big: BIG_CAPACITY });
export const emptySmall = (s) => ({ ...s, small: 0 });
export const emptyBig = (s) => ({ ...s, big: 0 });

// Pour from the small jug into the big jug until one of them stops the pour.
export const smallToBig = (s) => {
  const poured = Math.min(s.small, BIG_CAPACITY - s.big);
  return { small: s.small - poured, big: s.big + poured };
};

// Pour from the big jug into the small jug until one of them stops the pour.
export const bigToSmall = (s) => {
  const poured = Math.min(s.big, SMALL_CAPACITY - s.small);
  return { small: s.small + poured, big: s.big - poured };
};

// TypeOK: the jugs never hold more than their capacity, and never a negative amount.
export const typeOk = (s) =>
  Number.isInteger(s.small) && Number.isInteger(s.big) &&
  s.small >= 0 && s.small <= SMALL_CAPACITY &&
  s.big >= 0 && s.big <= BIG_CAPACITY;

// The "invariant" we deliberately expect to be false somewhere.
// TLC reports a trace that violates it. fast-check does the same by shrinking
// the shortest sequence of actions that reaches the target.
export const notSolved = (s) => s.big !== TARGET;
