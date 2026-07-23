// lib/slicer.js — percentage-based slicer, no model calls.
// direction: "beginning" | "recent"
// percent: 0-100, share of the total character length to keep

function messagesToText(messages) {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Claude"}: ${m.text}`)
    .join("\n\n");
}

function sliceByPercent(messages, direction, percent) {
  const full = messagesToText(messages);
  const total = full.length;
  const keep = Math.max(0, Math.min(total, Math.round((percent / 100) * total)));

  let sliced;
  if (direction === "beginning") {
    sliced = full.slice(0, keep);
  } else {
    sliced = full.slice(total - keep);
  }
  return {
    text: sliced,
    meta: { direction, percent, totalChars: total, keptChars: sliced.length }
  };
}

// exported for both the service worker (importScripts) and tests
if (typeof module !== "undefined") {
  module.exports = { sliceByPercent, messagesToText };
}
