const display = document.getElementById("display");
const historyList = document.getElementById("historyList");
const historyPanel = document.getElementById("historyPanel");
let history = JSON.parse(localStorage.getItem("calcHistory")) || [];
let lastResult = null;

function appendValue(value) {
    if (display.value === "Error") display.value = "";
    if (lastResult !== null && !["+", "-", "*", "/", "%"].includes(value) && value !== "." && display.value === String(lastResult)) {
        display.value = "";
    }
    lastResult = null;

    const current = display.value;
    const lastChar = current.slice(-1);

    if (["+", "-", "*", "/", "%"].includes(value) && ["+", "-", "*", "/", "%"].includes(lastChar)) {
        display.value = current.slice(0, -1) + value;
        return;
    }

    if (value === "." && current.split(/[\+\-\*\/\%]/).pop().includes(".")) return;

    if (value === "00" && (current === "" || ["+", "-", "*", "/", "%"].includes(lastChar))) return;

    display.value += value;
}

function allClear() {
    display.value = "";
    lastResult = null;
}

function deleteLast() {
    if (display.value === "Error") { allClear(); return; }
    display.value = display.value.slice(0, -1);
}

function calculate() {
    try {
        let expr = display.value;
        if (!expr) return;

        expr = expr.replace(/(\d+\.?\d*)%/g, "($1/100)");

        const result = Function('"use strict"; return (' + expr + ')')();

        if (!isFinite(result)) {
            display.value = "Error";
            return;
        }

        const displayResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));
        addToHistory(expr, displayResult);
        display.value = displayResult;
        lastResult = displayResult;
    } catch {
        display.value = "Error";
    }
}

function addToHistory(expr, result) {
    history.unshift({ expr, result, time: new Date().toLocaleTimeString() });
    if (history.length > 20) history.pop();
    localStorage.setItem("calcHistory", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = history.length === 0
        ? '<p class="empty">No calculations yet</p>'
        : history.map((item, i) => `
            <div class="history-item" onclick="useHistory(${i})">
                <span class="history-expr">${item.expr}</span>
                <span class="history-result">= ${item.result}</span>
            </div>
        `).join("");
}

function useHistory(index) {
    display.value = String(history[index].result);
    lastResult = history[index].result;
    if (window.innerWidth <= 600) historyPanel.classList.remove("open");
}

function clearHistory() {
    history = [];
    localStorage.removeItem("calcHistory");
    renderHistory();
}

function toggleHistory() {
    historyPanel.classList.toggle("open");
}

document.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "9") appendValue(e.key);
    else if (["+", "-", "*", "/"].includes(e.key)) appendValue(e.key);
    else if (e.key === "%") appendValue("%");
    else if (e.key === ".") appendValue(".");
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calculate(); }
    else if (e.key === "Backspace") deleteLast();
    else if (e.key === "Escape" || e.key === "Delete") allClear();
});

renderHistory();
