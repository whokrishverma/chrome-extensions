// Insta Saver - save popup logic
const API_BASE = "http://localhost:4321";

const params = new URLSearchParams(location.search);
const imageUrl = params.get("image") || "";
const postUrl = params.get("url") || "";

const previewWrap = document.getElementById("previewWrap");
const titleEl = document.getElementById("title");
const categoryEl = document.getElementById("category");
const categoryList = document.getElementById("categoryList");
const labelList = document.getElementById("labelList");
const chipInput = document.getElementById("chipInput");
const labelInput = document.getElementById("labelInput");
const notesEl = document.getElementById("notes");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const statusEl = document.getElementById("status");

let imageDataUrl = ""; // base64 version of the image, so it never breaks/expires
let labels = [];

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = kind || "";
}

// --- Load + convert the image to base64 so it's saved permanently ---
async function loadPreview() {
  if (!imageUrl) {
    previewWrap.innerHTML = '<div class="placeholder">No image detected.<br>Right-click directly on the post image for a preview.</div>';
    return;
  }
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    imageDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    previewWrap.innerHTML = `<img src="${imageDataUrl}" alt="preview">`;
  } catch (e) {
    previewWrap.innerHTML = '<div class="placeholder">Couldn\'t load preview, but the link will still be saved.</div>';
  }
}

// --- Load existing categories/labels for autocomplete ---
async function loadMeta() {
  try {
    const res = await fetch(`${API_BASE}/api/meta`);
    const meta = await res.json();
    categoryList.innerHTML = (meta.categories || [])
      .map(c => `<option value="${escapeHtml(c)}">`).join("");
    labelList.innerHTML = (meta.labels || [])
      .map(l => `<option value="${escapeHtml(l)}">`).join("");
  } catch (e) {
    // Server might not be running yet - not fatal, just no autocomplete.
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// --- Label chip handling ---
function renderChips() {
  chipInput.querySelectorAll(".chip").forEach(el => el.remove());
  labels.forEach((label, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${escapeHtml(label)} <button type="button" data-i="${i}">×</button>`;
    chipInput.insertBefore(chip, labelInput);
  });
}

chipInput.addEventListener("click", (e) => {
  if (e.target.matches("button[data-i]")) {
    const i = Number(e.target.dataset.i);
    labels.splice(i, 1);
    renderChips();
  }
});

labelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = labelInput.value.trim();
    if (val && !labels.includes(val)) {
      labels.push(val);
      renderChips();
    }
    labelInput.value = "";
  } else if (e.key === "Backspace" && !labelInput.value && labels.length) {
    labels.pop();
    renderChips();
  }
});

// --- Save ---
saveBtn.addEventListener("click", async () => {
  const title = titleEl.value.trim();
  if (!title) {
    setStatus("Title is required.", "error");
    titleEl.focus();
    return;
  }

  saveBtn.disabled = true;
  setStatus("Saving…");

  const payload = {
    title,
    category: categoryEl.value.trim(),
    labels,
    notes: notesEl.value.trim(),
    url: postUrl,
    image: imageDataUrl,
    platform: "instagram"
  };

  try {
    const res = await fetch(`${API_BASE}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    setStatus("Saved! ✓", "ok");
    setTimeout(() => window.close(), 500);
  } catch (e) {
    setStatus("Couldn't reach the local server. Is it running?", "error");
    saveBtn.disabled = false;
  }
});

cancelBtn.addEventListener("click", () => window.close());

loadPreview();
loadMeta();
