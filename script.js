const display = document.getElementById("display");
const historyList = document.getElementById("historyList");
const historyPanel = document.getElementById("historyPanel");
const themePicker = document.getElementById("themePicker");
const scientificPanel = document.getElementById("scientificPanel");
const currencyPanel = document.getElementById("currencyPanel");
const toast = document.getElementById("toast");
const modeTitle = document.getElementById("modeTitle");

let history = JSON.parse(localStorage.getItem("calcHistory")) || [];
let lastResult = null;
let audioCtx = null;
let rates = {};
let currencyOpen = false;

// Sound
function playSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.05;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.stop(audioCtx.currentTime + 0.08);
    } catch {}
}

function appendValue(value) {
    playSound();
    if (display.value === "Error") display.value = "";
    if (lastResult !== null && !["+", "-", "*", "/", "%", "("].includes(value) && value !== "." && display.value === String(lastResult)) {
        display.value = "";
    }
    lastResult = null;

    const current = display.value;
    const lastChar = current.slice(-1);

    if (["+", "-", "*", "/", "%"].includes(value) && ["+", "-", "*", "/", "%"].includes(lastChar)) {
        display.value = current.slice(0, -1) + value;
        return;
    }

    if (value === "." && current.split(/[\+\-\*\/\%\(]/).pop().includes(".")) return;

    if (value === "00" && (current === "" || ["+", "-", "*", "/", "%"].includes(lastChar))) return;

    display.value += value;
}

function allClear() {
    playSound();
    display.value = "";
    lastResult = null;
}

function deleteLast() {
    playSound();
    if (display.value === "Error") { allClear(); return; }
    display.value = display.value.slice(0, -1);
}

function evaluateExpression(expr) {
    expr = expr.replace(/(\d+\.?\d*)%/g, "($1/100)");
    expr = expr.replace(/sin\(([^)]+)\)/g, "Math.sin($1*Math.PI/180)");
    expr = expr.replace(/cos\(([^)]+)\)/g, "Math.cos($1*Math.PI/180)");
    expr = expr.replace(/tan\(([^)]+)\)/g, "Math.tan($1*Math.PI/180)");
    return Function('"use strict"; return (' + expr + ')')();
}

function calculate() {
    playSound();
    try {
        let expr = display.value;
        if (!expr) return;

        const result = evaluateExpression(expr);

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
    playSound();
    display.value = String(history[index].result);
    lastResult = history[index].result;
    if (window.innerWidth <= 600) historyPanel.classList.remove("open");
}

function clearHistory() {
    playSound();
    history = [];
    localStorage.removeItem("calcHistory");
    renderHistory();
}

function toggleHistory() {
    playSound();
    themePicker.classList.remove("open");
    scientificPanel.classList.remove("open");
    currencyPanel.classList.remove("open");
    currencyOpen = false;
    historyPanel.classList.toggle("open");
}

// Currency
function toggleCurrency() {
    playSound();
    currencyPanel.classList.toggle("open");
    themePicker.classList.remove("open");
    scientificPanel.classList.remove("open");
    historyPanel.classList.remove("open");
    currencyOpen = currencyPanel.classList.contains("open");
    modeTitle.textContent = currencyOpen ? "CURRENCY CONVERTER" : "CALCULATOR";
    if (currencyOpen && Object.keys(rates).length === 0) fetchRates();
}

function swapCurrencies() {
    playSound();
    const from = document.getElementById("currencyFrom");
    const to = document.getElementById("currencyTo");
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    convertCurrency();
}

async function fetchRates() {
    try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const data = await res.json();
        rates = data.rates;
        document.getElementById("rateInfo").textContent = "Rates updated: " + new Date().toLocaleDateString();
    } catch {
        document.getElementById("rateInfo").textContent = "Failed to fetch rates";
    }
}

function convertCurrency() {
    playSound();
    const amount = parseFloat(document.getElementById("currencyAmount").value);
    const from = document.getElementById("currencyFrom").value;
    const to = document.getElementById("currencyTo").value;
    const resultField = document.getElementById("currencyResult");

    if (isNaN(amount) || amount === 0) {
        resultField.value = "Enter amount";
        return;
    }

    if (Object.keys(rates).length === 0) {
        resultField.value = "Loading rates...";
        fetchRates().then(() => convertCurrency());
        return;
    }

    const inUSD = amount / rates[from];
    const result = inUSD * rates[to];
    resultField.value = result.toFixed(2) + " " + to;

    addToHistory(`${amount} ${from} → ${to}`, result.toFixed(2));
}

// Theme
function toggleTheme() {
    playSound();
    themePicker.classList.toggle("open");
    scientificPanel.classList.remove("open");
    historyPanel.classList.remove("open");
    if (currencyPanel.classList.contains("open")) toggleCurrency();
}

function setTheme(theme) {
    playSound();
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("calcTheme", theme);
    document.querySelectorAll(".theme-dot").forEach(d => d.classList.remove("active"));
    document.querySelector(`.theme-dot.${theme}`).classList.add("active");
}

// Scientific
function toggleScientific() {
    playSound();
    scientificPanel.classList.toggle("open");
    themePicker.classList.remove("open");
    historyPanel.classList.remove("open");
    if (currencyPanel.classList.contains("open")) toggleCurrency();
}

// Copy
function copyResult() {
    if (!display.value || display.value === "Error") return;
    navigator.clipboard.writeText(display.value).then(() => {
        showToast("Copied!");
    }).catch(() => {
        showToast("Failed to copy");
    });
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1500);
}

// Keyboard
document.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "9") appendValue(e.key);
    else if (["+", "-", "*", "/"].includes(e.key)) appendValue(e.key);
    else if (e.key === "%") appendValue("%");
    else if (e.key === ".") appendValue(".");
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calculate(); }
    else if (e.key === "Backspace") deleteLast();
    else if (e.key === "Escape" || e.key === "Delete") allClear();
});

// Load saved theme
const savedTheme = localStorage.getItem("calcTheme") || "purple";
document.body.setAttribute("data-theme", savedTheme);
document.querySelector(`.theme-dot.${savedTheme}`)?.classList.add("active");

renderHistory();

// PWA
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
