// content.js — runs on claude.ai, chatgpt.com/chat.openai.com, and gemini.google.com
// Job: read the currently open chat's messages out of the page and hand them
// back to the background worker on request. Uses DOM extraction (robust to
// internal API changes) with per-site selectors plus a generic fallback.
//
// Key rule: a candidate strategy is only accepted if it finds BOTH a user
// message and an assistant message. A strategy that only matches one role
// (e.g. because the site stopped tagging assistant turns the way we expect)
// is rejected and we fall through to the next strategy instead of silently
// returning a half-conversation.

function textOf(el) {
  return (el.innerText || el.textContent || "").trim();
}

function hasBothRoles(messages) {
  if (!messages || messages.length < 2) return false;
  const roles = new Set(messages.map((m) => m.role));
  return roles.has("user") && roles.has("assistant");
}

// --- Claude.ai -------------------------------------------------------------
function extractClaude() {
  // Candidate A: direct role-carrying test-ids on the turn element itself.
  const direct = Array.from(
    document.querySelectorAll('[data-testid="user-turn"], [data-testid="assistant-turn"]')
  ).map((node) => ({
    role: node.getAttribute("data-testid") === "user-turn" ? "user" : "assistant",
    text: textOf(node)
  })).filter((m) => m.text.length > 0);
  if (hasBothRoles(direct)) return direct;

  // Candidate B: numbered turn wrappers, role inferred from a nested
  // role-specific class rather than the wrapper's own test-id.
  const wrappers = Array.from(document.querySelectorAll('[data-testid^="conversation-turn-"]'));
  if (wrappers.length >= 2) {
    const viaWrapper = wrappers.map((node) => {
      const isUser = !!node.querySelector('[class*="font-user-message"], [data-testid="user-turn"]');
      return { role: isUser ? "user" : "assistant", text: textOf(node) };
    }).filter((m) => m.text.length > 0);
    if (hasBothRoles(viaWrapper)) return viaWrapper;
  }

  // Candidate C: class-name based, older/alternate Claude.ai builds.
  const byClass = Array.from(
    document.querySelectorAll('div[class*="font-user-message"], div[class*="font-claude-message"]')
  ).map((node) => ({
    role: (node.className || "").includes("user-message") ? "user" : "assistant",
    text: textOf(node)
  })).filter((m) => m.text.length > 0);
  if (hasBothRoles(byClass)) return byClass;

  return null;
}

// --- ChatGPT (chatgpt.com / chat.openai.com) -------------------------------
function extractChatGPT() {
  const nodes = Array.from(document.querySelectorAll("[data-message-author-role]"));
  const messages = nodes.map((node) => ({
    role: node.getAttribute("data-message-author-role") === "user" ? "user" : "assistant",
    text: textOf(node)
  })).filter((m) => m.text.length > 0);
  return hasBothRoles(messages) ? messages : null;
}

// --- Gemini (gemini.google.com) --------------------------------------------
function extractGemini() {
  const nodes = Array.from(document.querySelectorAll("user-query, model-response"));
  const messages = nodes.map((node) => ({
    role: node.tagName.toLowerCase() === "user-query" ? "user" : "assistant",
    text: textOf(node)
  })).filter((m) => m.text.length > 0);
  return hasBothRoles(messages) ? messages : null;
}

// --- Generic fallback (any site, if the selectors above find nothing) ------
// Grabs leaf text blocks in document order and alternates role assignment,
// starting from "user" since every chat opens with a user message. This is
// a last resort — used only when no site-specific strategy above found both
// roles present.
function extractViaFallback() {
  const main = document.querySelector("main") || document.body;
  const blocks = Array.from(main.querySelectorAll("div"))
    .filter((el) => el.children.length === 0 && textOf(el).length > 40);
  const seen = new Set();
  const messages = [];
  for (const el of blocks) {
    const t = textOf(el);
    if (seen.has(t)) continue;
    seen.add(t);
    messages.push({ role: messages.length % 2 === 0 ? "user" : "assistant", text: t });
  }
  return messages;
}

function extractChat() {
  const host = location.hostname;
  let primary = null;

  if (host.includes("claude.ai")) {
    primary = extractClaude();
  } else if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) {
    primary = extractChatGPT();
  } else if (host.includes("gemini.google.com")) {
    primary = extractGemini();
  }

  const messages = primary && primary.length ? primary : extractViaFallback();
  return {
    url: location.href,
    title: document.title,
    extractedAt: new Date().toISOString(),
    messages,
    usedFallback: !primary
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "EXTRACT_CHAT") {
    try {
      sendResponse({ ok: true, data: extractChat() });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  }
  return true; // async-safe
});
