const resultDisplay = document.querySelector("#result");
const expressionDisplay = document.querySelector("#expression");
const keypad = document.querySelector(".keypad");

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

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  handleAction(button.dataset.action, button.dataset.value);
});

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

updateDisplay();
