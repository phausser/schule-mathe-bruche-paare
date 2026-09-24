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
    _innerHTML: "",
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
    get() { return this._innerHTML; },
    set(value) { this._innerHTML = value; this.children = []; },
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
let sawTwoPairs = false;
let sawThreePairs = false;

for (let i = 0; i < 300; i += 1) {
  const task = vm.runInContext("generateTask()", context);
  const negatives = task.mixed.filter((factor) => factor.n < 0).length;
  if (negatives === 0) sawZeroNeg = true;
  if (negatives > 0) sawNegative = true;
  if (task.pairCount === 2) sawTwoPairs = true;
  if (task.pairCount === 3) sawThreePairs = true;

  assert.ok(task.pairCount >= 2 && task.pairCount <= 3, "pair count must stay between 2 and 3");
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

  vm.runInContext("score = 0;", context);
  for (let pairNo = 1; pairNo <= task.pairCount; pairNo += 1) {
    const value = shuffledValues[pairNo - 1].value;
    const signedValue = pairNo === 1 ? { n: -value.n, d: value.d } : value;
    document.getElementById(`in-p${pairNo}`).value = vm.runInContext(
      `fmt(${JSON.stringify(signedValue)})`,
      context
    );
  }
  document.getElementById("in-res").value = vm.runInContext("fmt(task.product)", context);
  vm.runInContext("check()", context);
  assert.strictEqual(vm.runInContext("score", context), 0, "wrong pair signs must be rejected");
  assert.match(document.getElementById("feedback").innerHTML, /Vorzeichenfehler/, "feedback should mention sign errors");

  vm.runInContext("score = 0;", context);
  for (let pairNo = 1; pairNo <= task.pairCount; pairNo += 1) {
    document.getElementById(`in-p${pairNo}`).value = vm.runInContext(
      `fmt(${JSON.stringify(shuffledValues[pairNo - 1].value)})`,
      context
    );
  }
  const wrongTotal = { n: task.product.n + task.product.d, d: task.product.d };
  document.getElementById("in-res").value = vm.runInContext(`fmt(${JSON.stringify(wrongTotal)})`, context);
  vm.runInContext("check()", context);
  assert.strictEqual(vm.runInContext("score", context), 0, "wrong total must be rejected");
  assert.match(document.getElementById("feedback").innerHTML, /Richtiges Gesamtergebnis/, "feedback should reveal the total only when pair values are correct");

  vm.runInContext("score = 0;", context);
  for (let pairNo = 1; pairNo <= task.pairCount; pairNo += 1) {
    const value = shuffledValues[pairNo - 1].value;
    const changedValue = pairNo === 1 ? { n: value.n + value.d, d: value.d } : value;
    document.getElementById(`in-p${pairNo}`).value = vm.runInContext(
      `fmt(${JSON.stringify(changedValue)})`,
      context
    );
  }
  document.getElementById("in-res").value = vm.runInContext("fmt(task.product)", context);
  vm.runInContext("check()", context);
  assert.strictEqual(vm.runInContext("score", context), 0, "wrong pair values must be rejected");
  assert.doesNotMatch(document.getElementById("feedback").innerHTML, /Richtiges Gesamtergebnis/, "feedback should not reveal the total for wrong intermediate values");
  assert.match(document.getElementById("feedback").innerHTML, /Zwischenergebnisse/, "feedback should point back to the intermediate values");
}

assert.ok(sawZeroNeg, "generator should still produce tasks without negative signs");
assert.ok(sawNegative, "generator should still produce tasks with negative signs");
assert.ok(sawTwoPairs, "generator should produce two-pair tasks");
assert.ok(sawThreePairs, "generator should produce three-pair tasks");

for (let i = 0; i < 40; i += 1) {
  const task = vm.runInContext("generateTask()", context);
  context.__task = task;
  vm.runInContext(`
    task = __task;
    pairAssignments = Array(task.mixed.length).fill(0);
    activePair = 1;
    tipStep = 0;
    poppedPair = 0;
    tipInputs = [];
    tipUsed = false;
    score = 0;
    renderInputs();
  `, context);

  for (let pairNo = 1; pairNo <= task.pairCount; pairNo += 1) {
    document.getElementById(`in-p${pairNo}`).value = "";
  }
  document.getElementById("in-res").value = "";

  task.intendedPairs[0].forEach((factor) => {
    const index = task.mixed.findIndex((item) => item.id === factor.id);
    vm.runInContext(`pairAssignments[${index}] = 2;`, context);
  });

  for (let step = 1; step <= task.pairCount; step += 1) {
    vm.runInContext("revealTip()", context);
    task.intendedPairs[step - 1].forEach((factor) => {
      const index = task.mixed.findIndex((item) => item.id === factor.id);
      assert.strictEqual(
        vm.runInContext(`pairAssignments[${index}]`, context),
        step,
        "tip must place the intended cards into the revealed pair"
      );
    });
    const expected = vm.runInContext(
      `fmt(mul(task.intendedPairs[${step - 1}][0], task.intendedPairs[${step - 1}][1]))`,
      context
    );
    assert.strictEqual(document.getElementById(`in-p${step}`).value, expected, "tip must fill the pair result");
    const feedback = document.getElementById("feedback").innerHTML;
    assert.match(feedback, new RegExp("Paar " + step + " von " + task.pairCount));
    assert.match(feedback, /keinen Punkt/, "tip feedback must say the task scores no point");
    assert.match(feedback, /nicht gelöst/);
    if (step < task.pairCount) {
      assert.strictEqual(document.getElementById("in-res").value, "", "total stays empty until the last pair");
      assert.strictEqual(document.getElementById(`in-p${step + 1}`).value, "", "later pairs stay untouched");
      assert.doesNotMatch(feedback, /Gesamtergebnis/);
      task.intendedPairs[step].forEach((factor) => {
        const index = task.mixed.findIndex((item) => item.id === factor.id);
        assert.strictEqual(vm.runInContext(`pairAssignments[${index}]`, context), 0);
      });
    } else {
      assert.strictEqual(
        document.getElementById("in-res").value,
        vm.runInContext("fmt(task.product)", context),
        "last tip must fill the total"
      );
      assert.match(feedback, /Gesamtergebnis/);
    }
  }

  vm.runInContext("score = 3; check()", context);
  assert.strictEqual(vm.runInContext("score", context), 3, "a tipped solution must not score");
  assert.match(document.getElementById("feedback").innerHTML, /Kein Punkt/);
  assert.match(document.getElementById("feedback").innerHTML, /nicht gelöst/);
  assert.doesNotMatch(document.getElementById("feedback").innerHTML, /Richtig,/);

  vm.runInContext("revealTip()", context);
  assert.strictEqual(document.getElementById("in-res").value, vm.runInContext("fmt(task.product)", context));
  assert.match(document.getElementById("feedback").innerHTML, /Lösung gezeigt/);
  assert.match(document.getElementById("feedback").innerHTML, /nicht gelöst/);
  assert.doesNotMatch(document.getElementById("feedback").innerHTML, /Alles gelöst/);

  vm.runInContext("resetPairs()", context);
  assert.strictEqual(vm.runInContext("tipStep", context), 0);
  assert.strictEqual(vm.runInContext("tipUsed", context), true, "reset must not give the point back");
  assert.ok(vm.runInContext("pairAssignments.every((value) => value === 0)", context));
  assert.strictEqual(document.getElementById("in-p1").value, "");
  assert.strictEqual(document.getElementById("in-res").value, "");
}

{
  const task = vm.runInContext("generateTask()", context);
  context.__task = task;
  vm.runInContext(`
    task = __task;
    pairAssignments = Array(task.mixed.length).fill(0);
    activePair = 1;
    tipStep = 0;
    poppedPair = 0;
    tipInputs = [];
    tipUsed = false;
    score = 4;
    renderInputs();
  `, context);

  function fillSolvedTask() {
    task.intendedPairs.forEach((pair, pairIndex) => {
      pair.forEach((factor) => {
        const index = task.mixed.findIndex((item) => item.id === factor.id);
        vm.runInContext(`pairAssignments[${index}] = ${pairIndex + 1};`, context);
      });
      document.getElementById(`in-p${pairIndex + 1}`).value = vm.runInContext(
        `fmt(mul(task.intendedPairs[${pairIndex}][0], task.intendedPairs[${pairIndex}][1]))`,
        context
      );
    });
    document.getElementById("in-res").value = vm.runInContext("fmt(task.product)", context);
  }

  vm.runInContext("revealTip()", context);
  fillSolvedTask();
  vm.runInContext("check()", context);
  assert.strictEqual(vm.runInContext("score", context), 4, "one tip is enough to withhold the point");
  assert.match(document.getElementById("feedback").innerHTML, /nicht gelöst/);

  vm.runInContext("resetPairs()", context);
  fillSolvedTask();
  vm.runInContext("check()", context);
  assert.strictEqual(vm.runInContext("score", context), 4, "the same task stays unsolved after reset");

  vm.runInContext("tipUsed = false; check()", context);
  assert.strictEqual(vm.runInContext("score", context), 5, "without a tip the same solution scores");
}

console.log("generate-task.test.js passed");
