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
| `small` | Gallons of water in the small jug | 0 to 3 |
| `big`   | Gallons of water in the big jug   | 0 to 5 |

At the start, both jugs are empty.

There are six actions. Each action changes the state.

| Action       | What it does                                              |
|--------------|-----------------------------------------------------------|
| `FillSmall`  | Fill the small jug to the top.                            |
| `FillBig`    | Fill the big jug to the top.                              |
| `EmptySmall` | Pour all water out of the small jug.                      |
| `EmptyBig`   | Pour all water out of the big jug.                        |
| `SmallToBig` | Pour water from the small jug into the big jug. Stop when the small jug is empty or the big jug is full. |
| `BigToSmall` | Pour water from the big jug into the small jug. Stop when the big jug is empty or the small jug is full. |

The file `src/jugs.js` contains the state and the six actions.

## 3. How fast-check finds the solution

In TLA+ you give TLC an invariant. An invariant is a rule that must be true in every state. TLC looks at every state it can reach. When TLC finds a state where the rule is not true, it shows the sequence of actions that leads to that state.

To solve the puzzle with TLC, you give it this rule: "The big jug never holds 4 gallons." This rule is false. TLC shows the sequence of actions that makes the rule false. That sequence is the solution to the puzzle.

This demo uses the same method with `fast-check`:

1. Each of the six actions becomes a `fast-check` command.
2. `fast-check` makes random sequences of commands.
3. `fast-check` runs each sequence from the initial state.
4. After each command, the demo checks the rule "The big jug never holds 4 gallons."
5. When the rule is false, `fast-check` stops. It then makes the sequence shorter and shorter, until it cannot remove a command and keep the failure. This is called shrinking.
6. The demo prints the shortest sequence. This is the solution.

The demo also checks a second rule after each command: the jugs never hold more water than their capacity, and never a negative amount. In TLA+ this rule is called `TypeOK`. This rule must always be true. If it is not true, the model has an error.

The file `test/dieHard.test.js` contains the commands and the search.

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

## 7. Files

| File                    | Content                                      |
|-------------------------|----------------------------------------------|
| `src/jugs.js`           | The state, the six actions, and the rules    |
| `test/dieHard.test.js`  | The `fast-check` commands and the search     |
| `run-demo.sh`           | The launch script                            |
| `package.json`          | The project definition and dependencies      |
