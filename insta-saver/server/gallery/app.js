const API = "/api/posts";
const META = "/api/meta";

const grid = document.getElementById("grid");
const emptyMsg = document.getElementById("emptyMsg");
const searchEl = document.getElementById("search");
const categoryFilter = document.getElementById("categoryFilter");
const labelFilter = document.getElementById("labelFilter");
const countEl = document.getElementById("count");

const modalOverlay = document.getElementById("modalOverlay");
const editTitle = document.getElementById("editTitle");
const editCategory = document.getElementById("editCategory");
const editLabels = document.getElementById("editLabels");
const editNotes = document.getElementById("editNotes");
const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");
const modalDelete = document.getElementById("modalDelete");

let allPosts = [];
let currentEditId = null;

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadMeta() {
  const res = await fetch(META);
  const meta = await res.json();
  categoryFilter.innerHTML = '<option value="">All categories</option>' +
    meta.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  labelFilter.innerHTML = '<option value="">All labels</option>' +
    meta.labels.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
}

async function loadPosts() {
  const params = new URLSearchParams();
  if (searchEl.value.trim()) params.set("q", searchEl.value.trim());
  if (categoryFilter.value) params.set("category", categoryFilter.value);
  if (labelFilter.value) params.set("label", labelFilter.value);

  const res = await fetch(`${API}?${params.toString()}`);
  allPosts = await res.json();
  render();
}

function render() {
  countEl.textContent = allPosts.length
    ? `${allPosts.length} post${allPosts.length === 1 ? "" : "s"}`
    : "";

  grid.querySelectorAll(".card").forEach(c => c.remove());
  emptyMsg.style.display = allPosts.length ? "none" : "block";

  allPosts.forEach(post => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = post.id;

    const thumb = post.image
      ? `<img class="thumb" src="${post.image}" alt="">`
      : `<div class="thumb placeholder">No preview</div>`;

    const labelsHtml = (post.labels || [])
      .map(l => `<span class="label-chip">${escapeHtml(l)}</span>`).join("");

    card.innerHTML = `
      ${thumb}
      <button class="edit-btn" title="Edit">✎</button>
      <div class="body">
        <span class="category-badge">${escapeHtml(post.category || "Uncategorized")}</span>
        <div class="title">${escapeHtml(post.title)}</div>
        <div class="labels">${labelsHtml}</div>
        <div class="date">${formatDate(post.dateSaved)}</div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".edit-btn")) {
        openEditModal(post);
      } else if (post.url) {
        window.open(post.url, "_blank");
      }
    });

    grid.appendChild(card);
  });
}

function openEditModal(post) {
  currentEditId = post.id;
  editTitle.value = post.title || "";
  editCategory.value = post.category || "";
  editLabels.value = (post.labels || []).join(", ");
  editNotes.value = post.notes || "";
  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  currentEditId = null;
}

modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

modalSave.addEventListener("click", async () => {
  if (!currentEditId) return;
  const body = {
    title: editTitle.value.trim(),
    category: editCategory.value.trim(),
    labels: editLabels.value.split(",").map(s => s.trim()).filter(Boolean),
    notes: editNotes.value.trim()
  };
  await fetch(`${API}/${currentEditId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  closeModal();
  await loadMeta();
  await loadPosts();
});

modalDelete.addEventListener("click", async () => {
  if (!currentEditId) return;
  if (!confirm("Delete this saved post?")) return;
  await fetch(`${API}/${currentEditId}`, { method: "DELETE" });
  closeModal();
  await loadMeta();
  await loadPosts();
});

let searchTimeout;
searchEl.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadPosts, 250);
});
categoryFilter.addEventListener("change", loadPosts);
labelFilter.addEventListener("change", loadPosts);

loadMeta();
loadPosts();
