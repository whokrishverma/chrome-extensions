const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeIcon.textContent = theme === "dark" ? "☾" : "☀";
}

chrome.storage.local.get(["theme"], ({ theme }) => {
  applyTheme(theme === "dark" ? "dark" : "light");
});

themeBtn.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
});

const tabs = document.querySelectorAll(".tab");
const panels = {
  slicer: document.getElementById("slicerPanel"),
  overview: document.getElementById("overviewPanel"),
  project: document.getElementById("projectPanel")
};
let currentMode = "slicer";

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentMode = tab.dataset.mode;
    Object.entries(panels).forEach(([mode, el]) => {
      el.classList.toggle("hidden", mode !== currentMode);
    });
  });
});

const percentInput = document.getElementById("percent");
const percentValue = document.getElementById("percentValue");
percentInput.addEventListener("input", () => {
  percentValue.textContent = percentInput.value;
});

document.getElementById("settingsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

const runBtn = document.getElementById("runBtn");
const statusEl = document.getElementById("status");

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  statusEl.textContent = "Working…";

  const job = { mode: currentMode };
  if (currentMode === "slicer") {
    job.direction = document.getElementById("direction").value;
    job.percent = Number(percentInput.value);
  }

  chrome.runtime.sendMessage({ type: "RUN_JOB", job }, (response) => {
    runBtn.disabled = false;
    if (chrome.runtime.lastError) {
      statusEl.textContent = "Error: " + chrome.runtime.lastError.message;
      return;
    }
    if (!response?.ok) {
      statusEl.textContent = "Error: " + (response?.error || "unknown error");
      return;
    }
    statusEl.textContent = "Done — opened in a new tab.";
  });
});
