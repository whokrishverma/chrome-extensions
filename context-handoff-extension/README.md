# Context Handoff for Claude, ChatGPT & Gemini

A Chrome extension that pulls the messages out of your current Claude, ChatGPT, or
Gemini chat so you can hand off context to a new chat — either as a raw
percentage-based slice, or as an LLM-generated summary (Overview / Project mode)
using your own API key.

## Supported sites

- claude.ai
- chatgpt.com / chat.openai.com
- gemini.google.com

## Modes

- **Slicer** — no model call, zero setup. Pick a direction (from the beginning or
  from the most recent messages) and a percentage, and it slices the transcript by
  character count.
- **Overview** — sends the transcript to your configured provider and asks for a
  concise handoff summary: goal, decisions, constraints, next steps.
- **Project** — same idea, structured for technical work: Goal, Current State,
  Decisions & Rationale, Files/Artifacts produced, Open Issues, Next Steps.

## Install (unpacked / developer mode)

1. Clone or download this repo.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Pin the extension from the puzzle-piece menu for quick access.

## Setup (only needed for Overview / Project modes)

1. Click the extension icon → the ⚙ settings icon (or right-click the icon → Options).
2. Pick a provider (Anthropic, OpenAI, Gemini, Groq, or **Ollama** for a free local model)
   and paste your API key — Ollama needs no key.
3. Optionally set a specific model name — a sensible default is used if left blank.

### Using Ollama (free, runs locally)

1. Install [Ollama](https://ollama.com) and pull a model: `ollama pull llama3.2`.
2. Start it: `ollama serve` (it usually starts automatically after install).
3. Since the request comes from a Chrome extension, tell Ollama to allow that origin:
   `OLLAMA_ORIGINS=chrome-extension://* ollama serve`
4. In Settings, select **Ollama**, leave the server URL as `http://localhost:11434`
   (or change it if you run Ollama elsewhere), and save. No API key needed.

Your key is stored only in `chrome.storage.local` on your machine. Requests go
directly from your browser to the provider's API — nothing passes through any
server we control.

## Usage

1. Open a chat on claude.ai, chatgpt.com, or gemini.google.com and make sure the
   tab is active.
2. Click the extension icon.
3. Pick a mode, adjust options if needed, click **Run**.
4. A new tab opens with the result and a **Copy** button.

## Project structure

```
manifest.json      MV3 manifest
content.js          Extracts chat messages from the claude.ai DOM
background.js       Service worker: orchestrates extract → slice/summarize → preview
popup.html/js/css    Main UI (mode selection, slicer controls, Run button)
options.html/js/css  Settings page (provider + API key)
preview.html/js/css  Result page with Copy button
lib/slicer.js        Percentage-based slicing logic (no LLM)
lib/providers.js      Per-provider request/response adapters (BYOK)
lib/engine.js          Prompt templates + routing to the configured provider
```

## Publishing to the Chrome Web Store (later)

1. Register as a Chrome Web Store developer ($5 one-time fee).
2. Zip this folder's contents (not the folder itself) and create a new item in the
   [developer dashboard](https://chrome.google.com/webstore/devconsole).
3. Fill out the **Privacy Practices** disclosure — this extension reads chat content
   (`host_permissions` on claude.ai) and sends it to a third-party API the user
   configures, so be explicit about that in the listing.
4. Host a simple privacy policy page (a static page describing what's read, why,
   and where it's sent — nothing more is needed since there's no server-side
   collection) and link it in the listing.
5. Submit for review; budget a few days, and expect a question about the
   `host_permissions` scope.

Until then, "clone the repo and Load unpacked" is the distribution path — which is
also how open-source contributors would run it during development.

## Known limitation / TODO

The DOM selectors in `content.js` are best-effort against each site's current UI
and include a generic fallback strategy, but Anthropic/OpenAI/Google can change
class names, test-ids, or custom element tags at any time. If extraction starts
returning empty or garbled results on a given site, that's the first place to
look — update the relevant `extractClaude()` / `extractChatGPT()` / `extractGemini()`
function in `content.js`.
