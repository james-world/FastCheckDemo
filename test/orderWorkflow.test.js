// Model-based test of a real API with fast-check.
//
// Each command calls one public operation of OrderService (the real code),
// updates a plain model, and checks the rules that must always be true.
// fast-check makes random sequences of commands. When a rule fails, it
// shrinks the sequence to the shortest one that still fails.

import fc from "fast-check";
import { OrderService } from "../src/orderService.js";

const sumPrices = (items) => items.reduce((t, i) => t + i.price, 0);

// The rules. They are checked after every command.
const checkRules = (m, real) => {
  if (real.state() !== m.state) throw new Error(`state is ${real.state()}, model says ${m.state}`);
  if (real.total() !== sumPrices(m.items)) throw new Error("total is wrong");
  if (real.total() < 0) throw new Error("total is negative");
  if (real.refunded() > real.paid()) {
    throw new Error(`refunded ${real.refunded()} but only paid ${real.paid()}`);
  }
};

// One command per public operation. Each command has three parts:
//   check:    when the command is allowed to run in the current model state
//   run:      call the real code, update the model, check the rules
//   toString: the name that fast-check prints in the trace
const addItem = (price) => ({
  check: (m) => m.state === "draft",
  run: (m, real) => { real.addItem({ price }); m.items.push({ price }); checkRules(m, real); },
  toString: () => `addItem(${price})`,
});

const removeItem = (index) => ({
  check: (m) => m.state === "draft" && m.items.length > 0,
  run: (m, real) => {
    const i = index % m.items.length;
    real.removeItem(i); m.items.splice(i, 1); checkRules(m, real);
  },
  toString: () => `removeItem(${index})`,
});

const submit = {
  check: (m) => m.state === "draft" && m.items.length > 0,
  run: (m, real) => { real.submit(); m.state = "submitted"; checkRules(m, real); },
  toString: () => "submit",
};

const pay = {
  check: (m) => m.state === "submitted",
  run: (m, real) => { real.pay(); m.state = "paid"; m.paid = sumPrices(m.items); checkRules(m, real); },
  toString: () => "pay",
};

const ship = {
  check: (m) => m.state === "paid",
  run: (m, real) => { real.ship(); m.state = "shipped"; checkRules(m, real); },
  toString: () => "ship",
};

const cancel = {
  check: (m) => m.state !== "shipped" && m.state !== "cancelled",
  run: (m, real) => { real.cancel(); m.state = "cancelled"; checkRules(m, real); },
  toString: () => "cancel",
};

const refund = (amount) => ({
  // The customer may ask for any amount. The service must reject a bad one.
  check: (m) => m.state === "cancelled" && m.paid > 0,
  run: (m, real) => {
    try {
      real.refund(amount);
      m.refunded += amount;
    } catch (e) {
      // A rejected refund is fine. The rules below still apply.
    }
    checkRules(m, real);
  },
  toString: () => `refund(${amount})`,
});

const commands = [
  fc.integer({ min: 1, max: 100 }).map(addItem),
  fc.nat(10).map(removeItem),
  fc.constant(submit),
  fc.constant(pay),
  fc.constant(ship),
  fc.constant(cancel),
  fc.integer({ min: 1, max: 200 }).map(refund),
];

const setup = () => ({
  model: { state: "draft", items: [], paid: 0, refunded: 0 },
  real: new OrderService(),
});

// ---------------------------------------------------------------------------
// Run the search.
// ---------------------------------------------------------------------------
console.log("Order workflow: addItem, removeItem, submit, pay, ship, cancel, refund.");
console.log("Asking fast-check to prove the rules hold for every sequence of operations.\n");

const result = fc.check(
  fc.property(fc.commands(commands, { size: "+1" }), (cmds) => fc.modelRun(setup, cmds)),
  { numRuns: 2000 },
);

if (!result.failed) {
  console.log("fast-check found no sequence that breaks a rule.");
  process.exit(0);
}

console.log("A rule is BROKEN. fast-check found and shrank a counterexample.\n");
console.log(`Seed: ${result.seed}   Shrink steps: ${result.numShrinks}`);
console.log(`Reason: ${result.error.split("\n")[0]}\n`);

// Replay the shrunk command sequence and print the trace.
const { model, real } = setup();
console.log("Shortest sequence found:");
console.log(`  ${String(0).padStart(2)}. ${"Init".padEnd(14)} state=${real.state()} total=${real.total()} paid=${real.paid()} refunded=${real.refunded()}`);
let step = 1;
for (const cmd of result.counterexample[0]) {
  try { cmd.run(model, real); } catch (e) { /* the last step fails by design */ }
  console.log(`  ${String(step++).padStart(2)}. ${String(cmd).padEnd(14)} state=${real.state()} total=${real.total()} paid=${real.paid()} refunded=${real.refunded()}`);
}
process.exit(1);
