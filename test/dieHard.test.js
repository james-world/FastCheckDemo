// Model-based test with fast-check.
//
// In TLA+ you write actions and an invariant, and TLC explores every reachable
// state until it finds a state where the invariant does not hold. It then prints
// the trace that leads there.
//
// fast-check does something similar with "commands": it generates random
// sequences of commands, runs them against the real system, and checks
// each command's postcondition. When a check fails, it shrinks the sequence
// to the shortest one that still fails and prints it.
//
// We give fast-check the invariant "the big jug never holds 4 gallons".
// This invariant is false, so the failing trace IS the solution to the puzzle.

import fc from "fast-check";
import {
  initialState, fillSmall, fillBig, emptySmall, emptyBig, smallToBig, bigToSmall,
  typeOk, notSolved, TARGET,
} from "../src/jugs.js";

// ---------------------------------------------------------------------------
// The "real" system: a tiny object that holds the jug levels.
// The "model" in fast-check terms is just the same pure state, kept in step.
// ---------------------------------------------------------------------------
class Jugs {
  constructor() { this.state = initialState(); }
  apply(action) { this.state = action(this.state); }
}

// One fast-check command per TLA+ action.
const makeCommand = (name, action) => ({
  check: () => true,                         // every action is always enabled
  run: (model, real) => {
    real.apply(action);
    model.state = action(model.state);       // keep the model in step

    // TypeOK must always hold. If it does not, the model itself is wrong.
    if (!typeOk(real.state)) {
      throw new Error(`TypeOK violated after ${name}: ${JSON.stringify(real.state)}`);
    }
    // The "invariant" we want fast-check to refute.
    if (!notSolved(real.state)) {
      throw new Error(`Big jug holds ${TARGET} gallons after ${name}: ${JSON.stringify(real.state)}`);
    }
  },
  toString: () => name,
});

const commands = [
  fc.constant(makeCommand("FillSmall", fillSmall)),
  fc.constant(makeCommand("FillBig", fillBig)),
  fc.constant(makeCommand("EmptySmall", emptySmall)),
  fc.constant(makeCommand("EmptyBig", emptyBig)),
  fc.constant(makeCommand("SmallToBig", smallToBig)),
  fc.constant(makeCommand("BigToSmall", bigToSmall)),
];

// ---------------------------------------------------------------------------
// Run the search.
// ---------------------------------------------------------------------------
console.log("Two-jug puzzle: small jug 3 gallons, big jug 5 gallons, target 4 gallons.");
console.log('Asking fast-check to prove: "the big jug never holds 4 gallons".\n');

const result = fc.check(
  fc.property(fc.commands(commands, { size: "+2" }), (cmds) => {
    const setup = () => ({ model: { state: initialState() }, real: new Jugs() });
    fc.modelRun(setup, cmds);
  }),
  { numRuns: 2000, verbose: false },
);

if (!result.failed) {
  console.log("fast-check did not find the target state. Increase numRuns and try again.");
  process.exit(1);
}

console.log("The property is FALSE. fast-check found and shrank a counterexample.\n");
console.log(`Seed: ${result.seed}   Shrink steps: ${result.numShrinks}`);
console.log(`Reason: ${result.error.split("\n")[0]}\n`);

// Replay the shrunk command sequence and print the trace, TLC style.
const trace = result.counterexample[0];
let state = initialState();
console.log("Shortest trace found:");
console.log(`  ${String(0).padStart(2)}. Init            small=${state.small} big=${state.big}`);
let step = 1;
for (const cmd of trace) {
  const action = { FillSmall: fillSmall, FillBig: fillBig, EmptySmall: emptySmall,
                   EmptyBig: emptyBig, SmallToBig: smallToBig, BigToSmall: bigToSmall }[String(cmd)];
  state = action(state);
  console.log(`  ${String(step++).padStart(2)}. ${String(cmd).padEnd(15)} small=${state.small} big=${state.big}`);
}
console.log(`\nThe big jug holds ${state.big} gallons. Puzzle solved in ${step - 1} steps.`);
