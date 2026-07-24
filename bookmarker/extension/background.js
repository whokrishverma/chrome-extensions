// Insta Saver - background service worker
// Registers a right-click context menu on Instagram and opens the save popup
// pre-filled with the post's link + image.

const MENU_ID = "insta-saver-save";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save to Insta Saver",
    contexts: ["image", "page", "link"],
    documentUrlPatterns: ["*://*.instagram.com/*"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  // Best-guess image: the right-clicked image if there was one.
  const imageUrl = info.srcUrl || "";

  // Best-guess post link: prefer an explicit link target, otherwise the
  // current tab's URL (this is the actual instagram.com/p/... permalink).
  const postUrl = info.linkUrl || info.pageUrl || tab.url || "";

  const params = new URLSearchParams({
    image: imageUrl,
    url: postUrl
  });

  chrome.windows.create({
    url: chrome.runtime.getURL(`save.html?${params.toString()}`),
    type: "popup",
    width: 420,
    height: 680
  });
});
