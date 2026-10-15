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

The script installs the dependencies on the first run. Then it runs both demos: the two-jug puzzle, and the order workflow from section 7.

To run one demo only, give its name:

```bash
./run-demo.sh jugs
```

```bash
./run-demo.sh order
```

You can also run the demos with npm:

```bash
npm install
npm run demo
npm run demo:order
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

The file [`src/orderService.js`](src/orderService.js) is a small order service. It is the "real code" in this example. It has these operations:

| Operation     | What it does                                        |
|---------------|-----------------------------------------------------|
| [`addItem`](src/orderService.js#L23)     | Add an item with a price to the order.              |
| [`removeItem`](src/orderService.js#L29)  | Remove an item from the order.                      |
| [`submit`](src/orderService.js#L35)      | Change the order from `draft` to `submitted`.       |
| [`pay`](src/orderService.js#L41)         | Change the order from `submitted` to `paid`.        |
| [`ship`](src/orderService.js#L47)        | Change the order from `paid` to `shipped`.          |
| [`cancel`](src/orderService.js#L52)      | Change the order to `cancelled`.                    |
| [`refund`](src/orderService.js#L59)      | Return money to the customer.                       |

These rules must always be true:

- The total of the order is the sum of the item prices. It is never negative.
- You cannot ship an order that is not paid.
- You cannot cancel an order that is shipped.
- The refunded amount is never more than the paid amount.
- You cannot add or remove items after the order is submitted.

The file [`test/orderWorkflow.test.js`](test/orderWorkflow.test.js) is the `fast-check` test for the service. It has three parts:

1. [`checkRules`](test/orderWorkflow.test.js#L14) checks the rules. It compares the real service with the model. The model holds only the state name, the items, and the money.
2. One command for each operation, from [`addItem`](test/orderWorkflow.test.js#L27) to [`refund`](test/orderWorkflow.test.js#L66). Each command has three parts:
   - `check` tells `fast-check` when the operation is allowed in the current model state.
   - `run` calls the real operation, updates the model, and calls `checkRules`.
   - `toString` gives the name that `fast-check` prints in the trace.
3. [`fc.check`](test/orderWorkflow.test.js#L102) runs the search. It is the same call as in the jug demo.

This is the `refund` command. The customer can ask for any amount. The service must reject a bad amount. The command does not stop a bad amount. It lets the service decide, and then it checks the rules.

```js
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
```

Note the difference from the jug puzzle. In the jug puzzle, every action is always allowed. Here, the `check` function of each command tells `fast-check` when the operation is allowed. `fast-check` does not run a command when its `check` returns false. This keeps the sequences valid.

### 7.3 What the test finds

The service has a bug. [`refund`](src/orderService.js#L59) checks that the amount is not more than the order total. It does not subtract the amount that was already refunded. Two refunds can return more money than was paid.

Run the test:

```bash
./run-demo.sh order
```

This is an example of the output:

```
A rule is BROKEN. fast-check found and shrank a counterexample.

Seed: -1604632105   Shrink steps: 5
Reason: Error: refunded 71 but only paid 70

Shortest sequence found:
   0. Init           state=draft total=0 paid=0 refunded=0
   1. addItem(70)    state=draft total=70 paid=0 refunded=0
   2. submit         state=submitted total=70 paid=0 refunded=0
   3. pay            state=paid total=70 paid=70 refunded=0
   4. cancel         state=cancelled total=70 paid=70 refunded=0
   5. refund(1)      state=cancelled total=70 paid=70 refunded=1
   6. refund(70)     state=cancelled total=70 paid=70 refunded=71
```

The second refund passes the check in the service, because 70 is not more than the total. The rule "the refunded amount is never more than the paid amount" fails. `fast-check` prints the sequence. A person can then read the sequence and find the cause.

A test that a person writes by hand usually tests one refund. It does not test two refunds after a cancel. `fast-check` tests thousands of sequences. It finds the sequences that a person does not write.

To fix the bug, change the line marked `BUG` in [`src/orderService.js`](src/orderService.js#L62) so that it compares the amount with `paid - refunded`. Then run the test again. `fast-check` reports that it found no sequence that breaks a rule.

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
| [`src/orderService.js`](src/orderService.js)   | The order workflow, with a deliberate bug    |
| [`test/orderWorkflow.test.js`](test/orderWorkflow.test.js) | The model-based test of the order workflow |
| [`run-demo.sh`](run-demo.sh)           | The launch script for both demos             |
| [`package.json`](package.json)          | The project definition and dependencies      |
