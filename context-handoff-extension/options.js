chrome.storage.local.get(["theme"], ({ theme }) => {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
});

const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const baseUrlEl = document.getElementById("baseUrl");
const apiKeyRow = document.getElementById("apiKeyRow");
const baseUrlRow = document.getElementById("baseUrlRow");
const statusEl = document.getElementById("status");

function updateVisibility() {
  const isOllama = providerEl.value === "ollama";
  apiKeyRow.classList.toggle("hidden", isOllama);
  baseUrlRow.classList.toggle("hidden", !isOllama);
}

providerEl.addEventListener("change", updateVisibility);

async function load() {
  const { provider, model, apiKey, baseUrl } = await chrome.storage.local.get([
    "provider",
    "model",
    "apiKey",
    "baseUrl"
  ]);
  if (provider) providerEl.value = provider;
  if (model) modelEl.value = model;
  if (apiKey) apiKeyEl.value = apiKey;
  baseUrlEl.value = baseUrl || "http://localhost:11434";
  updateVisibility();
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({
    provider: providerEl.value,
    model: modelEl.value.trim(),
    apiKey: apiKeyEl.value.trim(),
    baseUrl: baseUrlEl.value.trim() || "http://localhost:11434"
  });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 2000);
});

load();
