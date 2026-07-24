# Insta Saver

A personal tool to save Instagram posts with a custom title, category, and
labels — right from a right-click — into a searchable local gallery.

No subscriptions, no npm installs, no external accounts. Everything runs
locally on your Mac.

## What's inside

```
insta-saver/
  extension/     <- the browser extension (Chrome/Brave/Arc/Opera)
  server/        <- the local backend + gallery page
```

## Setup (one-time, ~5 minutes)

### 1. Install Node.js (skip if you already have it)

Check first:
```
node --version
```
If that fails, install it from https://nodejs.org (the LTS version), or via
Homebrew: `brew install node`.

### 2. Start the local server

Open Terminal:
```
cd path/to/insta-saver/server
node server.js
```
You should see:
```
📌 Insta Saver server running!
   Gallery:  http://localhost:4321
```
**Leave this Terminal window open** — the server needs to keep running for
saving and browsing to work. (Later, if you want it to start automatically
in the background, we can set that up too — just ask.)

### 3. Load the extension into your browser

This works the same way in Chrome, Brave, Arc, and Opera (all Chromium-based):

1. Go to `chrome://extensions` (in Brave: `brave://extensions`, in Arc: `arc://extensions`, in Opera: `opera://extensions`)
2. Turn on **Developer mode** (toggle, usually top-right)
3. Click **Load unpacked**
4. Select the `insta-saver/extension` folder
5. Done — you should see "Insta Saver" appear in your extensions list

Repeat step 3 in each browser you want it in (Chrome, Brave, Arc, Opera each
need their own "Load unpacked", but it's the same folder each time).

## How to use it

1. Go to Instagram, find a post you want to save
2. Right-click on the post image (or the post itself) → **Save to Insta Saver**
3. A small popup appears with the image preview already loaded — fill in:
   - **Title** (required) — your own name for it
   - **Category** — e.g. Recipes, Fitness, Ideas (start typing to reuse an existing one)
   - **Labels** — type a word + Enter to add a tag, add as many as you like
   - **Notes** — optional, why you saved it
4. Click **Save Post**

To browse everything: open **http://localhost:4321** in any browser while
the server is running. Search, filter by category/label, click a card to
edit or delete it, or click the image/title to jump back to the original
Instagram post.

## Notes

- Your data lives in `server/data/posts.json` — plain text, easy to back up
  (just copy that file) or peek at directly.
- Images are saved as embedded copies (not just links), so they won't break
  even if the original Instagram post is deleted or the link expires.
- If the popup says "Couldn't reach the local server," it just means the
  Terminal running `node server.js` isn't open — start it again.
- This is unpublished, personal-use code — it only runs when you load it
  via Developer mode, and isn't going through Chrome Web Store review.

## What's next (when you're ready)

You mentioned wanting to eventually save links from other sites too, not
just Instagram. The data already has a generic `platform` field, and the
categories/labels/title/notes structure isn't Instagram-specific — so
extending this to other sites later mostly means teaching the extension how
to grab the preview image/link from each new site, not rebuilding the
gallery or storage.
