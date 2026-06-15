const resultDisplay = document.querySelector("#result");
const expressionDisplay = document.querySelector("#expression");
const keypad = document.querySelector(".keypad");

const state = {
  displayValue: "0",
  firstOperand: null,
  operator: null,
  waitingForOperand: false,
  expression: "",
};

const operationSymbols = {
  "+": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => (b === 0 ? null : a / b),
};

function formatDisplay(value) {
  if (value === "Error") return value;

  const number = Number(value);
  if (!Number.isFinite(number)) return "Error";

  const [integer, decimal] = value.toString().split(".");
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
  } else if (state.displayValue.replace("-", "").length < 12) {
    state.displayValue = state.displayValue === "0" ? digit : state.displayValue + digit;
  }
}

function inputDecimal() {
  if (state.displayValue === "Error" || state.waitingForOperand) {
    state.displayValue = "0.";
    state.waitingForOperand = false;
  } else if (!state.displayValue.includes(".")) {
    state.displayValue += ".";
  }
}

function calculate(first, second, operator) {
  const result = operationSymbols[operator](first, second);
  if (result === null || !Number.isFinite(result)) return "Error";

  return String(Number.parseFloat(result.toPrecision(12)));
}

function chooseOperator(nextOperator) {
  if (state.displayValue === "Error") clearCalculator();

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
      state.expression = "Cannot divide by zero";
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
  state.expression = result === "Error" ? "Cannot divide by zero" : fullExpression;
  state.firstOperand = result === "Error" ? null : Number(result);
  state.operator = null;
  state.waitingForOperand = true;
}

function toggleSign() {
  if (state.displayValue !== "0" && state.displayValue !== "Error") {
    state.displayValue = String(Number.parseFloat(state.displayValue) * -1);
  }
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
