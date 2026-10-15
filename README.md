# Two-Jug Puzzle With fast-check

## 1. What this demo does

This demo shows how to use the `fast-check` library to find the solution to the two-jug puzzle.

The puzzle is:

- You have a small jug. It holds 3 gallons.
- You have a big jug. It holds 5 gallons.
- You must put exactly 4 gallons of water in the big jug.

Leslie Lamport uses this puzzle in his TLA+ course. He writes the puzzle as a state machine. The TLC model checker then finds the solution. This demo does the same with JavaScript and `fast-check`.

## 2. How the state machine works

The state has two values:

| Value   | Meaning                           | Range  |
|---------|-----------------------------------|--------|
| [`small`](src/jugs.js#L17) | Gallons of water in the small jug | 0 to 3 |
| [`big`](src/jugs.js#L17)   | Gallons of water in the big jug   | 0 to 5 |

At the start, both jugs are empty. See [`initialState`](src/jugs.js#L17).

There are six actions. Each action changes the state.

| Action       | What it does                                              |
|--------------|-----------------------------------------------------------|
| [`FillSmall`](src/jugs.js#L19)  | Fill the small jug to the top.                            |
| `FillBig`    | Fill the big jug to the top.                              |
| [`EmptySmall`](src/jugs.js#L21) | Pour all water out of the small jug.                      |
| `EmptyBig`   | Pour all water out of the big jug.                        |
| [`SmallToBig`](src/jugs.js#L25) | Pour water from the small jug into the big jug. Stop when the small jug is empty or the big jug is full. |
| [`BigToSmall`](src/jugs.js#L31) | Pour water from the big jug into the small jug. Stop when the big jug is empty or the small jug is full. |

The file [`src/jugs.js`](src/jugs.js) contains the state and the six actions. The capacities and the target are at the top of the file. See [`SMALL_CAPACITY`, `BIG_CAPACITY` and `TARGET`](src/jugs.js#L13-L15).

## 3. How fast-check finds the solution

In TLA+ you give TLC an invariant. An invariant is a rule that must be true in every state. TLC looks at every state it can reach. When TLC finds a state where the rule is not true, it shows the sequence of actions that leads to that state.

To solve the puzzle with TLC, you give it this rule: "The big jug never holds 4 gallons." This rule is false. TLC shows the sequence of actions that makes the rule false. That sequence is the solution to the puzzle.

This demo uses the same method with `fast-check`:

1. Each of the six actions becomes a `fast-check` command. See [`makeCommand`](test/dieHard.test.js#L31) and [`commands`](test/dieHard.test.js#L49).
2. `fast-check` makes random sequences of commands. See [`fc.commands`](test/dieHard.test.js#L65).
3. `fast-check` runs each sequence from the initial state. See [`fc.check`](test/dieHard.test.js#L64).
4. After each command, the demo checks the rule "The big jug never holds 4 gallons." See [`notSolved`](src/jugs.js#L45) and [the check in `run`](test/dieHard.test.js#L42).
5. When the rule is false, `fast-check` stops. It then makes the sequence shorter and shorter, until it cannot remove a command and keep the failure. This is called shrinking.
6. The demo prints the shortest sequence. This is the solution.

The demo also checks a second rule after each command: the jugs never hold more water than their capacity, and never a negative amount. In TLA+ this rule is called `TypeOK`. This rule must always be true. If it is not true, the model has an error. See [`typeOk`](src/jugs.js#L37) and [the check in `run`](test/dieHard.test.js#L38).

The file [`test/dieHard.test.js`](test/dieHard.test.js) contains the commands and the search.

## 4. How to run the demo

You need Node.js version 18 or later.

Run this command from the project folder:

```bash
./run-demo.sh
```

The script installs the dependencies on the first run. Then it runs the demo.

You can also run the demo with npm:

```bash
npm install
npm run demo
```

## 5. What the output shows

The output has three parts:

1. A line that shows the rule that `fast-check` tried to prove.
2. The seed and the number of shrink steps. Use the seed to run the same search again.
3. The shortest trace. Each line shows one action and the state after that action.

This is an example of the trace:

```
Shortest trace found:
   0. Init            small=0 big=0
   1. FillBig         small=0 big=5
   2. BigToSmall      small=3 big=2
   3. EmptySmall      small=0 big=2
   4. BigToSmall      small=2 big=0
   5. FillBig         small=2 big=5
   6. BigToSmall      small=3 big=4

The big jug holds 4 gallons. Puzzle solved in 6 steps.
```

The search is random. The trace can be different on each run. The shortest possible solution has 6 steps. `fast-check` usually finds a 6-step trace, but it can show a longer trace.

## 6. Differences from TLC

TLC looks at every state. `fast-check` looks at random states. For this small puzzle, the difference is not important. For a large state space, TLC gives a full proof and `fast-check` does not.

TLC always shows the shortest trace. `fast-check` shrinks the trace, but shrinking does not always give the shortest trace.

`fast-check` runs against real code. TLC runs against a specification. You can use `fast-check` to test that your code agrees with your model.

## 7. How to use this method on real code

The jug puzzle is small. The method is not. You can use the same method to test real code.

### 7.1 The idea

Most code has a state machine inside it. An order, a user session, a document, a payment. Each has a state. Each has a set of operations that change the state. Each has rules that must always be true.

To test the code with `fast-check`:

1. Write one command for each public operation of your code. The `run` function of the command calls the real operation.
2. Keep a simple model next to the real code. The model is a plain object. It holds only the facts you need to check the rules.
3. After each command, check the rules. Compare the real code with the model.
4. Let `fast-check` make random sequences of commands.

`fast-check` tries sequences that a person does not think to write. When a sequence breaks a rule, `fast-check` shrinks it. You get the shortest sequence that shows the problem. This is the same result that TLC gives for the jug puzzle.

### 7.2 A practical example: an order workflow

An order service has these operations:

| Operation     | What it does                                        |
|---------------|-----------------------------------------------------|
| `addItem`     | Add an item with a price to the order.              |
| `removeItem`  | Remove an item from the order.                      |
| `submit`      | Change the order from `draft` to `submitted`.       |
| `pay`         | Change the order from `submitted` to `paid`.        |
| `ship`        | Change the order from `paid` to `shipped`.          |
| `cancel`      | Change the order to `cancelled`.                    |
| `refund`      | Return money to the customer.                       |

These rules must always be true:

- The total of the order is the sum of the item prices. It is never negative.
- You cannot ship an order that is not paid.
- You cannot cancel an order that is shipped.
- The refunded amount is never more than the paid amount.
- You cannot add or remove items after the order is submitted.

This is a `fast-check` test for the service. The model holds only the state name, the items, and the money.

```js
import fc from "fast-check";
import { OrderService } from "../src/orderService.js";

const sumPrices = (items) => items.reduce((t, i) => t + i.price, 0);

// One command per public operation. Each command has three parts:
//   check: when the command is allowed to run in the current model state
//   run:   call the real code, update the model, check the rules
//   toString: the name that fast-check prints in the trace
const addItem = (price) => ({
  check: (m) => m.state === "draft",
  run: (m, real) => {
    real.addItem({ price });
    m.items.push({ price });
    if (real.total() !== sumPrices(m.items)) throw new Error("total is wrong");
  },
  toString: () => `addItem(${price})`,
});

const submit = {
  check: (m) => m.state === "draft" && m.items.length > 0,
  run: (m, real) => { real.submit(); m.state = "submitted"; },
  toString: () => "submit",
};

const pay = {
  check: (m) => m.state === "submitted",
  run: (m, real) => { real.pay(); m.state = "paid"; m.paid = sumPrices(m.items); },
  toString: () => "pay",
};

const ship = {
  check: (m) => m.state === "paid",
  run: (m, real) => { real.ship(); m.state = "shipped"; },
  toString: () => "ship",
};

const cancel = {
  check: (m) => m.state !== "shipped" && m.state !== "cancelled",
  run: (m, real) => { real.cancel(); m.state = "cancelled"; },
  toString: () => "cancel",
};

const refund = (amount) => ({
  check: (m) => m.state === "cancelled" && m.paid > 0,
  run: (m, real) => {
    real.refund(amount);
    m.refunded += amount;
    if (real.refunded() > real.paid()) throw new Error("refunded more than paid");
  },
  toString: () => `refund(${amount})`,
});

const commands = [
  fc.integer({ min: 1, max: 100 }).map(addItem),
  fc.constant(submit),
  fc.constant(pay),
  fc.constant(ship),
  fc.constant(cancel),
  fc.integer({ min: 1, max: 200 }).map(refund),
];

fc.assert(
  fc.property(fc.commands(commands), (cmds) => {
    const setup = () => ({
      model: { state: "draft", items: [], paid: 0, refunded: 0 },
      real: new OrderService(),
    });
    fc.modelRun(setup, cmds);
  }),
);
```

Note the difference from the jug puzzle. In the jug puzzle, every action is always allowed. Here, the `check` function of each command tells `fast-check` when the operation is allowed. `fast-check` does not run a command when its `check` returns false. This keeps the sequences valid. If you want to test that the real code rejects an operation, remove the `check` and assert that the real code throws an error.

### 7.3 What the test can find

Think of a service where `refund` only checks that the amount is not more than the order total. It does not subtract the amount that was already refunded. `fast-check` finds a sequence like this:

```
addItem(50), submit, pay, cancel, refund(50), refund(50)
```

The second refund passes the check in the service, because 50 is not more than the total. The rule "the refunded amount is never more than the paid amount" fails. `fast-check` prints the sequence above. A person can then read the sequence and find the cause.

A test that a person writes by hand usually tests one refund. It does not test two refunds after a cancel. `fast-check` tests thousands of sequences. It finds the sequences that a person does not write.

### 7.4 When to use this method

Use this method when:

- Your code has state, and the order of operations is important.
- You can write the rules that must always be true.
- A simple model can tell you what the correct answer is.

Do not use this method as the only test. Use it with your unit tests. The unit tests show that each operation does its job. The model-based test shows that the operations work together.

## 8. Files

| File                    | Content                                      |
|-------------------------|----------------------------------------------|
| [`src/jugs.js`](src/jugs.js)           | The state, the six actions, and the rules    |
| [`test/dieHard.test.js`](test/dieHard.test.js)  | The `fast-check` commands and the search     |
| [`run-demo.sh`](run-demo.sh)           | The launch script                            |
| [`package.json`](package.json)          | The project definition and dependencies      |
