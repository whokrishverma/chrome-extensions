// lib/providers.js — one small adapter per provider.
// Each adapter returns {url, headers, body} for the request, and exposes
// parseResponse(json) to pull plain text back out.
// Every call is made directly from the user's browser using their own key —
// nothing passes through any server we control.

const Providers = {
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-sonnet-4-6",
    buildRequest(apiKey, model, prompt) {
      return {
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          // Required for direct browser calls to the Anthropic API.
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }]
        })
      };
    },
    parseResponse(json) {
      const block = (json.content || []).find((c) => c.type === "text");
      return block ? block.text : "";
    }
  },

  openai: {
    label: "OpenAI",
    defaultModel: "gpt-4.1-mini",
    buildRequest(apiKey, model, prompt) {
      return {
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }]
        })
      };
    },
    parseResponse(json) {
      return json.choices?.[0]?.message?.content || "";
    }
  },

  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    buildRequest(apiKey, model, prompt) {
      const m = model || "gemini-2.0-flash";
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      };
    },
    parseResponse(json) {
      return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
  },

  groq: {
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    buildRequest(apiKey, model, prompt) {
      return {
        url: "https://api.groq.com/openai/v1/chat/completions",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        })
      };
    },
    parseResponse(json) {
      return json.choices?.[0]?.message?.content || "";
    }
  },

  ollama: {
    label: "Ollama (local, free — no key needed)",
    defaultModel: "llama3.2",
    needsApiKey: false,
    // apiKey is unused; baseUrl points at the local Ollama server.
    buildRequest(apiKey, model, prompt, baseUrl) {
      const base = (baseUrl || "http://localhost:11434").replace(/\/+$/, "");
      return {
        url: `${base}/api/chat`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: model || "llama3.2",
          messages: [{ role: "user", content: prompt }],
          stream: false
        })
      };
    },
    parseResponse(json) {
      return json.message?.content || "";
    }
  }
};

if (typeof module !== "undefined") {
  module.exports = { Providers };
} else if (typeof self !== "undefined") {
  self.ContextHandoffProviders = { Providers };
}
