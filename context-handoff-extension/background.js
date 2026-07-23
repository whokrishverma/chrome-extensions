// background.js — MV3 service worker. Orchestrates the whole flow:
// 1. ask the content script on the active claude.ai tab to extract the chat
// 2. either slice it (no LLM) or summarize it (calls the user's chosen provider)
// 3. stash the result in chrome.storage.local and open preview.html to show it

importScripts("lib/slicer.js", "lib/providers.js", "lib/engine.js");

const SUPPORTED_HOSTS = ["claude.ai", "chatgpt.com", "chat.openai.com", "gemini.google.com"];

async function getActiveClaudeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isSupported = tab?.url && SUPPORTED_HOSTS.some((host) => tab.url.includes(`://${host}/`) || tab.url.includes(`://${host}`));
  if (!tab || !isSupported) {
    throw new Error("Open a Claude, ChatGPT, or Gemini chat tab and make it active, then try again.");
  }
  return tab;
}

async function extractFromTab(tab) {
  const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_CHAT" });
  if (!response?.ok) {
    throw new Error(response?.error || "Could not read the chat on this page.");
  }
  if (!response.data.messages.length) {
    throw new Error("No messages found — the chat extraction selectors may need updating.");
  }
  return response.data;
}

async function runJob(job) {
  const tab = await getActiveClaudeTab();
  const chat = await extractFromTab(tab);

  let resultText;
  let resultMeta = { sourceUrl: chat.url, sourceTitle: chat.title, mode: job.mode, usedFallback: chat.usedFallback };

  if (job.mode === "slicer") {
    const { text, meta } = sliceByPercent(chat.messages, job.direction, job.percent);
    resultText = text;
    resultMeta = { ...resultMeta, ...meta };
  } else {
    const config = await chrome.storage.local.get(["provider", "apiKey", "model", "baseUrl"]);
    if (config.provider !== "ollama" && !config.apiKey) {
      throw new Error("No API key set. Add one in Settings first.");
    }
    const chatText = messagesToText(chat.messages);
    resultText = await runSummaryMode(job.mode, chatText, config);
    resultMeta = { ...resultMeta, provider: config.provider, model: config.model };
  }

  await chrome.storage.local.set({
    lastResult: { text: resultText, meta: resultMeta, createdAt: new Date().toISOString() }
  });

  await chrome.tabs.create({ url: chrome.runtime.getURL("preview.html") });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "RUN_JOB") {
    runJob(msg.job)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true; // keep the message channel open for the async response
  }
});
