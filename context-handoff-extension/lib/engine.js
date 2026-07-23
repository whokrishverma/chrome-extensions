// lib/engine.js — turns extracted chat + mode into a final handoff document.

const PROMPTS = {
  overview: (chatText) => `You will be given a transcript of a conversation with an AI assistant.
Produce a concise "context handoff" summary that a new chat could use to continue the work
with no loss of important context. Include: the overall goal, key decisions made, any
constraints or preferences stated, open questions, and next steps. Keep it tight — this is
meant to be pasted as the first message of a new chat, not a full recap.

Transcript:
"""
${chatText}
"""`,

  project: (chatText) => `You will be given a transcript of a conversation with an AI assistant
working on a specific project or piece of code. Produce a structured "project state" handoff
document with sections: Goal, Current State, Decisions & Rationale, Files/Artifacts produced
(list names only, don't reproduce full content), Open Issues, Next Steps. Be specific and
technical where the transcript is technical. This will be pasted into a new chat to resume work.

Transcript:
"""
${chatText}
"""`
};

async function callProvider(providerKey, apiKey, model, prompt, baseUrl) {
  const { Providers } = self.ContextHandoffProviders || (typeof require !== "undefined" ? require("./providers.js") : {});
  const provider = Providers[providerKey];
  if (!provider) throw new Error(`Unknown provider: ${providerKey}`);
  if (provider.needsApiKey !== false && !apiKey) {
    throw new Error("No API key configured for this provider.");
  }

  const { url, headers, body } = provider.buildRequest(apiKey, model, prompt, baseUrl);
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Provider request failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  const json = await res.json();
  return provider.parseResponse(json);
}

async function runSummaryMode(mode, chatText, config) {
  const buildPrompt = PROMPTS[mode];
  if (!buildPrompt) throw new Error(`Unknown mode: ${mode}`);
  const prompt = buildPrompt(chatText);
  return callProvider(config.provider, config.apiKey, config.model, prompt, config.baseUrl);
}

if (typeof module !== "undefined") {
  module.exports = { runSummaryMode, callProvider, PROMPTS };
}
