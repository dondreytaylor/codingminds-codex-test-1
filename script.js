const resultDisplay = document.querySelector("#result");
const expressionDisplay = document.querySelector("#expression");
const keypad = document.querySelector(".keypad");
const formulaSelect = document.querySelector("#formula-select");
const formulaForm = document.querySelector("#formula-form");
const formulaResult = document.querySelector("#formula-result");

const state = {
  displayValue: "0",
  firstOperand: null,
  operator: null,
  waitingForOperand: false,
  expression: "",
  angleMode: "DEG",
};

const operationSymbols = {
  "+": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => (b === 0 ? null : a / b),
  "^": (a, b) => a ** b,
};

function formatDisplay(value) {
  if (value === "Error") return value;

  const stringValue = value.toString();
  const exponentMatch = stringValue.match(/^(-?(?:\d+\.?\d*|\.\d+))[eE]([+-]?\d*)$/);
  if (exponentMatch) {
    const exponent = exponentMatch[2].replace("-", "−");
    return `${exponentMatch[1]} × 10^${exponent}`;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return "Error";

  const [integer, decimal] = stringValue.split(".");
  const formattedInteger = Number(integer).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
}

function fitResultText() {
  const length = resultDisplay.textContent.length;
  resultDisplay.style.fontSize = length > 13 ? "32px" : length > 9 ? "42px" : "";
}

function updateDisplay() {
  resultDisplay.textContent = formatDisplay(state.displayValue);
  expressionDisplay.textContent = state.expression || "\u00a0";
  document.querySelectorAll(".key-operator").forEach((button) => {
    button.classList.toggle(
      "is-active",
      state.waitingForOperand && button.dataset.value === state.operator,
    );
  });
  document.querySelectorAll("[data-mode-label]").forEach((label) => {
    label.classList.toggle("is-active", label.dataset.modeLabel === state.angleMode);
  });
  fitResultText();
}

function clearCalculator() {
  state.displayValue = "0";
  state.firstOperand = null;
  state.operator = null;
  state.waitingForOperand = false;
  state.expression = "";
}

function inputDigit(digit) {
  if (state.displayValue === "Error" || state.waitingForOperand) {
    state.displayValue = digit;
    state.waitingForOperand = false;
  } else if (state.displayValue.toLowerCase().includes("e")) {
    const [coefficient, exponent = ""] = state.displayValue.toLowerCase().split("e");
    if (exponent.replace("-", "").length < 3) {
      state.displayValue = `${coefficient}e${exponent === "0" ? digit : exponent + digit}`;
    }
  } else if (state.displayValue.replace("-", "").length < 12) {
    state.displayValue = state.displayValue === "0" ? digit : state.displayValue + digit;
  }
}

function inputDecimal() {
  if (state.displayValue === "Error" || state.waitingForOperand) {
    state.displayValue = "0.";
    state.waitingForOperand = false;
  } else if (!state.displayValue.includes(".") && !state.displayValue.toLowerCase().includes("e")) {
    state.displayValue += ".";
  }
}

function inputExponent() {
  if (state.displayValue === "Error" || state.waitingForOperand) {
    state.displayValue = "1e";
    state.waitingForOperand = false;
  } else if (!state.displayValue.toLowerCase().includes("e")) {
    state.displayValue += "e";
  }
}

function calculate(first, second, operator) {
  const result = operationSymbols[operator](first, second);
  if (result === null || !Number.isFinite(result)) return "Error";

  return String(Number.parseFloat(result.toPrecision(12)));
}

function chooseOperator(nextOperator) {
  if (state.displayValue === "Error") clearCalculator();
  if (state.displayValue.endsWith("e") || state.displayValue.endsWith("e-")) return;

  const inputValue = Number.parseFloat(state.displayValue);

  if (state.operator && state.waitingForOperand) {
    state.operator = nextOperator;
    state.expression = `${formatDisplay(String(state.firstOperand))} ${nextOperator}`;
    return;
  }

  if (state.firstOperand === null) {
    state.firstOperand = inputValue;
  } else if (state.operator) {
    const result = calculate(state.firstOperand, inputValue, state.operator);
    state.displayValue = result;
    if (result === "Error") {
      state.expression = state.operator === "÷" ? "Cannot divide by zero" : "Calculation error";
      state.firstOperand = null;
      state.operator = null;
      return;
    }
    state.firstOperand = Number(result);
  }

  state.operator = nextOperator;
  state.waitingForOperand = true;
  state.expression = `${formatDisplay(String(state.firstOperand))} ${nextOperator}`;
}

function performEquals() {
  if (!state.operator || state.waitingForOperand || state.displayValue === "Error") return;

  const secondOperand = Number.parseFloat(state.displayValue);
  const fullExpression = `${formatDisplay(String(state.firstOperand))} ${state.operator} ${formatDisplay(String(secondOperand))} =`;
  const result = calculate(state.firstOperand, secondOperand, state.operator);

  state.displayValue = result;
  state.expression =
    result === "Error"
      ? state.operator === "÷"
        ? "Cannot divide by zero"
        : "Calculation error"
      : fullExpression;
  state.firstOperand = result === "Error" ? null : Number(result);
  state.operator = null;
  state.waitingForOperand = true;
}

function toggleSign() {
  if (state.displayValue.toLowerCase().includes("e")) {
    const [coefficient, exponent = ""] = state.displayValue.toLowerCase().split("e");
    state.displayValue = `${coefficient}e${exponent.startsWith("-") ? exponent.slice(1) : `-${exponent}`}`;
    return;
  }
  if (state.displayValue !== "0" && state.displayValue !== "Error") {
    state.displayValue = String(Number.parseFloat(state.displayValue) * -1);
  }
}

const scientificOperations = {
  sin: (value) => Math.sin(toRadians(value)),
  cos: (value) => Math.cos(toRadians(value)),
  tan: (value) => {
    const radians = toRadians(value);
    return Math.abs(Math.cos(radians)) < 1e-12 ? null : Math.tan(radians);
  },
  log: (value) => (value > 0 ? Math.log10(value) : null),
  ln: (value) => (value > 0 ? Math.log(value) : null),
  sqrt: (value) => (value >= 0 ? Math.sqrt(value) : null),
  square: (value) => value ** 2,
  reciprocal: (value) => (value === 0 ? null : 1 / value),
};

const scientificLabels = {
  sin: "sin",
  cos: "cos",
  tan: "tan",
  log: "log",
  ln: "ln",
  sqrt: "√",
  square: "sqr",
  reciprocal: "1/",
};

function toRadians(value) {
  return state.angleMode === "DEG" ? (value * Math.PI) / 180 : value;
}

function applyScientificOperation(operation) {
  if (state.displayValue === "Error" || state.displayValue.endsWith("e")) return;

  const input = Number(state.displayValue);
  const result = scientificOperations[operation](input);
  const inputLabel = formatDisplay(state.displayValue);

  if (result === null || !Number.isFinite(result)) {
    state.displayValue = "Error";
    state.expression = "Domain error";
    state.waitingForOperand = true;
    return;
  }

  state.displayValue = String(Number.parseFloat(result.toPrecision(12)));
  state.expression =
    operation === "square"
      ? `${inputLabel}²`
      : operation === "reciprocal"
        ? `1 / ${inputLabel}`
        : `${scientificLabels[operation]}(${inputLabel})`;
  state.waitingForOperand = true;
}

function inputConstant(constant) {
  state.displayValue = String(constant === "pi" ? Math.PI : Math.E);
  state.expression = constant === "pi" ? "π" : "e";
  state.waitingForOperand = false;
}

function toggleAngleMode() {
  state.angleMode = state.angleMode === "DEG" ? "RAD" : "DEG";
}

function inputPercent() {
  if (state.displayValue === "Error") return;
  state.displayValue = String(Number.parseFloat(state.displayValue) / 100);
}

function deleteLastDigit() {
  if (state.waitingForOperand || state.displayValue === "Error") return;
  state.displayValue = state.displayValue.length > 1 ? state.displayValue.slice(0, -1) : "0";
  if (state.displayValue === "-") state.displayValue = "0";
}

function handleAction(action, value) {
  if (action === "number") inputDigit(value);
  if (action === "decimal") inputDecimal();
  if (action === "operator") chooseOperator(value);
  if (action === "equals") performEquals();
  if (action === "clear") clearCalculator();
  if (action === "sign") toggleSign();
  if (action === "percent") inputPercent();
  if (action === "scientific") applyScientificOperation(value);
  if (action === "constant") inputConstant(value);
  if (action === "exp") inputExponent();
  if (action === "angle-mode") toggleAngleMode();
  if (action === "delete") deleteLastDigit();
  updateDisplay();
}

if (keypad) {
  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    handleAction(button.dataset.action, button.dataset.value);
  });
}

const keyMap = {
  "/": ["operator", "÷"],
  "*": ["operator", "×"],
  "-": ["operator", "−"],
  "+": ["operator", "+"],
  ".": ["decimal"],
  ",": ["decimal"],
  "%": ["percent"],
  "^": ["operator", "^"],
  Enter: ["equals"],
  "=": ["equals"],
  Escape: ["clear"],
  Delete: ["clear"],
  Backspace: ["delete"],
};

document.addEventListener("keydown", (event) => {
  if (!keypad) return;
  const mapping = /^\d$/.test(event.key) ? ["number", event.key] : keyMap[event.key];
  if (!mapping) return;

  event.preventDefault();
  handleAction(...mapping);

  const selector = mapping[1]
    ? `[data-value="${mapping[1]}"]`
    : `[data-action="${mapping[0]}"]`;
  const button = document.querySelector(selector);
  if (button) {
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 100);
  }
});

if (keypad) updateDisplay();

const formulaDefinitions = {
  quadratic: {
    title: "Quadratic roots: ax² + bx + c = 0",
    variables: [
      { name: "a", label: "a coefficient" },
      { name: "b", label: "b coefficient" },
      { name: "c", label: "c coefficient" },
      { name: "x", label: "x root" },
    ],
    solve(values, missing) {
      const { a, b, c, x } = values;
      if (missing === "x") {
        if (a === 0) return formulaError("a cannot be 0 for a quadratic equation.");
        const discriminant = b ** 2 - 4 * a * c;
        const steps = [
          `Start with ax² + bx + c = 0.`,
          `Substitute values: ${formatFormulaNumber(a)}x² + ${formatFormulaNumber(b)}x + ${formatFormulaNumber(c)} = 0.`,
          `Use the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a.`,
          `Calculate the discriminant: b² - 4ac = ${formatFormulaNumber(b)}² - 4(${formatFormulaNumber(a)})(${formatFormulaNumber(c)}) = ${formatFormulaNumber(discriminant)}.`,
        ];
        if (discriminant < 0) {
          steps.push("Because the discriminant is negative, there are no real roots.");
          return { result: `No real roots. Discriminant = ${formatFormulaNumber(discriminant)}.`, steps };
        }
        const root = Math.sqrt(discriminant);
        const x1 = (-b + root) / (2 * a);
        const x2 = (-b - root) / (2 * a);
        steps.push(`Find the square root: √${formatFormulaNumber(discriminant)} = ${formatFormulaNumber(root)}.`);
        steps.push(`Divide by 2a: 2(${formatFormulaNumber(a)}) = ${formatFormulaNumber(2 * a)}.`);
        steps.push(
          discriminant === 0
            ? `Solve: x = ${formatFormulaNumber(x1)}.`
            : `Solve both roots: x = ${formatFormulaNumber(x1)} or x = ${formatFormulaNumber(x2)}.`,
        );
        return { result: discriminant === 0 ? `x = ${formatFormulaNumber(x1)}` : `x = ${formatFormulaNumber(x1)} or ${formatFormulaNumber(x2)}`, steps };
      }

      const denominator = missing === "a" ? x ** 2 : missing === "b" ? x : 1;
      if (denominator === 0) return formulaError(`${missing} cannot be solved from this input because it would require dividing by 0.`);
      const result = missing === "a" ? -(b * x + c) / x ** 2 : missing === "b" ? -(a * x ** 2 + c) / x : -(a * x ** 2 + b * x);
      const rearranged = {
        a: "a = -(bx + c) / x²",
        b: "b = -(ax² + c) / x",
        c: "c = -(ax² + bx)",
      }[missing];
      return {
        result: `${missing} = ${formatFormulaNumber(result)}`,
        steps: [
          "Start with ax² + bx + c = 0.",
          `Rearrange to isolate ${missing}: ${rearranged}.`,
          `Substitute the known values: a=${formatFormulaNumber(a)}, b=${formatFormulaNumber(b)}, c=${formatFormulaNumber(c)}, x=${formatFormulaNumber(x)}.`,
          `${missing} = ${formatFormulaNumber(result)}.`,
        ],
      };
    },
  },
  linear: {
    title: "Linear equation: ax + b = c",
    variables: [
      { name: "a", label: "a coefficient" },
      { name: "x", label: "x value" },
      { name: "b", label: "b value" },
      { name: "c", label: "c value" },
    ],
    solve(values, missing) {
      const { a, x, b, c } = values;
      const formulas = {
        a: { text: "a = (c - b) / x", value: () => (c - b) / x, zero: x },
        x: { text: "x = (c - b) / a", value: () => (c - b) / a, zero: a },
        b: { text: "b = c - ax", value: () => c - a * x },
        c: { text: "c = ax + b", value: () => a * x + b },
      };
      const formula = formulas[missing];
      if (formula.zero === 0) return formulaError(`${missing} cannot be solved because the rearranged formula divides by 0.`);
      const result = formula.value();
      return {
        result: `${missing} = ${formatFormulaNumber(result)}`,
        steps: ["Start with ax + b = c.", `Rearrange to isolate ${missing}: ${formula.text}.`, `Substitute the known values: a=${formatFormulaNumber(a)}, x=${formatFormulaNumber(x)}, b=${formatFormulaNumber(b)}, c=${formatFormulaNumber(c)}.`, `${missing} = ${formatFormulaNumber(result)}.`],
      };
    },
  },
  pythagorean: {
    title: "Pythagorean theorem: a² + b² = c²",
    variables: [
      { name: "a", label: "side a" },
      { name: "b", label: "side b" },
      { name: "c", label: "hypotenuse c" },
    ],
    solve(values, missing) {
      const { a, b, c } = values;
      if (Object.entries(values).some(([key, value]) => key !== missing && value < 0)) return formulaError("Side lengths must be zero or greater.");
      const inside = missing === "c" ? a ** 2 + b ** 2 : c ** 2 - (missing === "a" ? b ** 2 : a ** 2);
      if (inside < 0) return formulaError("These side lengths do not make a real right triangle.");
      const result = Math.sqrt(inside);
      const formulaText = missing === "c" ? "c = √(a² + b²)" : missing === "a" ? "a = √(c² - b²)" : "b = √(c² - a²)";
      return { result: `${missing} = ${formatFormulaNumber(result)}`, steps: ["Start with a² + b² = c².", `Rearrange to isolate ${missing}: ${formulaText}.`, `Substitute the known values: a=${formatFormulaNumber(a)}, b=${formatFormulaNumber(b)}, c=${formatFormulaNumber(c)}.`, `${missing} = √${formatFormulaNumber(inside)} = ${formatFormulaNumber(result)}.`] };
    },
  },
  interest: {
    title: "Simple interest: I = P × r × t",
    variables: [
      { name: "interest", label: "interest (I)" },
      { name: "principal", label: "principal (P)" },
      { name: "rate", label: "annual rate (%)" },
      { name: "time", label: "time (years)" },
    ],
    solve(values, missing) {
      const { interest, principal, rate, time } = values;
      const decimalRate = rate / 100;
      const formulas = {
        interest: { text: "I = P × (r / 100) × t", value: () => principal * decimalRate * time },
        principal: { text: "P = I / ((r / 100) × t)", value: () => interest / (decimalRate * time), zero: decimalRate * time },
        rate: { text: "r = (I / (P × t)) × 100", value: () => (interest / (principal * time)) * 100, zero: principal * time },
        time: { text: "t = I / (P × (r / 100))", value: () => interest / (principal * decimalRate), zero: principal * decimalRate },
      };
      const formula = formulas[missing];
      if (formula.zero === 0) return formulaError(`${missing} cannot be solved because the rearranged formula divides by 0.`);
      const result = formula.value();
      const label = missing === "rate" ? "rate" : missing;
      return { result: `${label} = ${formatFormulaNumber(result)}${missing === "rate" ? "%" : ""}`, steps: ["Start with I = P × r × t, where r is entered as a percent.", `Rearrange to isolate ${label}: ${formula.text}.`, `Substitute the known values: I=${formatFormulaNumber(interest)}, P=${formatFormulaNumber(principal)}, r=${formatFormulaNumber(rate)}%, t=${formatFormulaNumber(time)}.`, `${label} = ${formatFormulaNumber(result)}${missing === "rate" ? "%" : ""}.`] };
    },
  },
};

function formulaError(message) {
  return { result: message, steps: [] };
}

function formatFormulaNumber(value) {
  if (!Number.isFinite(value)) return "?";
  return Number.parseFloat(value.toPrecision(10)).toLocaleString("en-US");
}

function renderFormulaFields() {
  if (!formulaForm || !formulaSelect) return;
  const formula = formulaDefinitions[formulaSelect.value];
  const fields = formula.variables
    .map(
      (field) => `
        <label for="formula-${field.name}">
          <span>${field.label}</span>
          <input id="formula-${field.name}" name="${field.name}" type="number" step="any" placeholder="Leave blank if missing" />
        </label>`,
    )
    .join("");

  formulaForm.innerHTML = `
    <p class="formula-help">Fill in every known variable and leave exactly one variable blank for Calclio to solve.</p>
    <div class="formula-inputs">${fields}</div>
    <div class="formula-actions">
      <button class="formula-button" type="submit">Solve formula</button>
      <button class="formula-button secondary" type="reset">Clear</button>
    </div>`;
  formulaResult.innerHTML = "Pick one missing variable, enter the known values, then solve.";
}

function solveFormula(event) {
  event.preventDefault();
  const formula = formulaDefinitions[formulaSelect.value];
  const entries = formula.variables.map((field) => {
    const inputValue = formulaForm.elements[field.name].value.trim();
    return [field.name, inputValue === "" ? null : Number(inputValue)];
  });
  const missing = entries.filter(([, value]) => value === null).map(([name]) => name);
  const hasInvalidValue = entries.some(([, value]) => value !== null && !Number.isFinite(value));

  if (missing.length !== 1) {
    formulaResult.innerHTML = "Please leave exactly one variable blank so Calclio knows what to solve.";
    return;
  }

  if (hasInvalidValue) {
    formulaResult.innerHTML = "Please enter only valid numbers for the known variables.";
    return;
  }

  const values = Object.fromEntries(entries.map(([name, value]) => [name, value ?? 0]));
  const solution = formula.solve(values, missing[0]);
  renderFormulaSolution(solution);
}

function renderFormulaSolution(solution) {
  const steps = solution.steps.length
    ? `<ol class="formula-steps">${solution.steps.map((step) => `<li>${step}</li>`).join("")}</ol>`
    : "";
  formulaResult.innerHTML = `<strong class="formula-answer">${solution.result}</strong>${steps}`;
}

if (formulaSelect && formulaForm && formulaResult) {
  formulaSelect.addEventListener("change", renderFormulaFields);
  formulaForm.addEventListener("submit", solveFormula);
  formulaForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      formulaResult.innerHTML = "Pick one missing variable, enter the known values, then solve.";
    }, 0);
  });
  renderFormulaFields();
}
