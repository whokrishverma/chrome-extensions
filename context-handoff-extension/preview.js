chrome.storage.local.get(["theme"], ({ theme }) => {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
});

async function load() {
  const { lastResult } = await chrome.storage.local.get(["lastResult"]);
  if (!lastResult) {
    document.getElementById("output").value = "No result found. Run the extension from a claude.ai tab first.";
    return;
  }
  const { text, meta } = lastResult;
  document.getElementById("output").value = text;

  const bits = [];
  if (meta.sourceTitle) bits.push(meta.sourceTitle);
  if (meta.mode) bits.push(`mode: ${meta.mode}`);
  if (meta.direction) bits.push(`${meta.direction}, ${meta.percent}%`);
  if (meta.provider) bits.push(`via ${meta.provider}${meta.model ? " (" + meta.model + ")" : ""}`);
  if (meta.totalChars) bits.push(`${meta.keptChars}/${meta.totalChars} chars kept`);
  if (meta.usedFallback) bits.push("⚠ used generic fallback extraction — check output carefully");
  document.getElementById("meta").textContent = bits.join(" · ");
}

document.getElementById("copyBtn").addEventListener("click", async () => {
  const output = document.getElementById("output");
  await navigator.clipboard.writeText(output.value);
  const btn = document.getElementById("copyBtn");
  const original = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => (btn.textContent = original), 1500);
});

load();
