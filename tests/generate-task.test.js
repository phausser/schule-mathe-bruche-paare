const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const scriptMatch = html.match(/<script id="trainer-script">([\s\S]*?)<\/script>/i);
assert.ok(scriptMatch, "trainer script block must exist");
const script = scriptMatch[1];

function makeEl(id = "") {
  const element = {
    id,
    value: "",
    textContent: "",
    className: "",
    dataset: {},
    children: [],
    style: {},
    type: "",
    classList: { add() {}, remove() {} },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener() {},
    querySelectorAll() { return []; },
  };
  Object.defineProperty(element, "innerHTML", {
    get() { return ""; },
    set() { this.children = []; },
  });
  return element;
}

function findById(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const match = findById(child, id);
    if (match) return match;
  }
  return null;
}

const ids = [
  "start", "play", "win", "factors", "feedback", "pairing-label", "pair-legend", "inputs",
  "score", "clock", "final-time", "btn-start", "btn-again", "btn-check", "btn-reset-pair", "btn-tip",
];
const elements = Object.fromEntries(ids.map((id) => [id, makeEl(id)]));
const document = {
  getElementById(id) {
    if (!elements[id]) {
      for (const element of Object.values(elements)) {
        const match = findById(element, id);
        if (match) {
          elements[id] = match;
          break;
        }
      }
    }
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
  },
  createElement(tag) {
    return makeEl(tag);
  },
};

const context = {
  document,
  console,
  Math,
  Date,
  setTimeout: () => {},
  clearInterval: () => {},
  setInterval: () => 0,
};

vm.createContext(context);
vm.runInContext(script, context);

let sawZeroNeg = false;
let sawNegative = false;
let sawFourPairs = false;

for (let i = 0; i < 300; i += 1) {
  const task = vm.runInContext("generateTask()", context);
  const negatives = task.mixed.filter((factor) => factor.n < 0).length;
  if (negatives === 0) sawZeroNeg = true;
  if (negatives > 0) sawNegative = true;
  if (task.pairCount === 4) sawFourPairs = true;

  assert.ok(task.pairCount >= 2 && task.pairCount <= 4, "pair count must stay between 2 and 4");
  assert.strictEqual(task.mixed.length, task.pairCount * 2, "task must contain two fractions per pair");
  assert.ok(task.mixed.every((factor) => factor.d > 1), "generated factors must not have denominator 1");
  assert.ok(task.maxCleverPairs > 0 && task.maxCleverPairs <= task.pairCount, "clever-pair score must stay in range");

  context.__task = task;
  vm.runInContext("task = __task; pairAssignments = Array(task.mixed.length).fill(0); score = 0; renderInputs();", context);

  task.intendedPairs.forEach((pair, pairIndex) => {
    pair.forEach((factor) => {
      const index = task.mixed.indexOf(factor);
      vm.runInContext(`pairAssignments[${index}] = ${pairIndex + 1};`, context);
    });
  });

  const pairValues = vm.runInContext("pairValues()", context);
  const shuffledValues = [...pairValues].reverse();
  for (let pairNo = 1; pairNo <= task.pairCount; pairNo += 1) {
    document.getElementById(`in-p${pairNo}`).value = vm.runInContext(
      `fmt(${JSON.stringify(shuffledValues[pairNo - 1].value)})`,
      context
    );
  }
  document.getElementById("in-res").value = vm.runInContext("fmt(task.product)", context);
  vm.runInContext("check()", context);
  assert.strictEqual(vm.runInContext("score", context), 1, "correct answers must be accepted");
}

assert.ok(sawZeroNeg, "generator should still produce tasks without negative signs");
assert.ok(sawNegative, "generator should still produce tasks with negative signs");
assert.ok(sawFourPairs, "generator should produce four-pair tasks");

console.log("generate-task.test.js passed");
