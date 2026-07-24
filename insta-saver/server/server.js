// Insta Saver - local server
// Pure Node.js, no npm install required. Stores everything in data/posts.json.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 4321;
const DATA_FILE = path.join(__dirname, "data", "posts.json");
const GALLERY_DIR = path.join(__dirname, "gallery");

// --- Storage helpers ---
function loadPosts() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function savePosts(posts) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
}

// --- Helpers ---
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      // Guard against absurdly large payloads (>25MB)
      if (size > 25 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function serveStatic(req, res, urlPath) {
  let filePath = urlPath === "/" ? "/index.html" : urlPath;
  const fullPath = path.join(GALLERY_DIR, filePath);

  // Prevent path traversal outside the gallery folder
  if (!fullPath.startsWith(GALLERY_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
}

// --- Request handler ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  try {
    // GET /api/posts?category=...&label=...&q=...
    if (pathname === "/api/posts" && req.method === "GET") {
      let posts = loadPosts();
      const category = url.searchParams.get("category");
      const label = url.searchParams.get("label");
      const q = url.searchParams.get("q");

      if (category) posts = posts.filter(p => p.category === category);
      if (label) posts = posts.filter(p => (p.labels || []).includes(label));
      if (q) {
        const needle = q.toLowerCase();
        posts = posts.filter(p =>
          (p.title || "").toLowerCase().includes(needle) ||
          (p.notes || "").toLowerCase().includes(needle)
        );
      }
      posts.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved));
      sendJson(res, 200, posts);
      return;
    }

    // POST /api/posts
    if (pathname === "/api/posts" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.title) {
        sendJson(res, 400, { error: "Title is required" });
        return;
      }
      const posts = loadPosts();
      const newPost = {
        id: crypto.randomUUID(),
        title: body.title,
        category: body.category || "Uncategorized",
        labels: Array.isArray(body.labels) ? body.labels : [],
        notes: body.notes || "",
        url: body.url || "",
        image: body.image || "",
        platform: body.platform || "instagram",
        dateSaved: new Date().toISOString()
      };
      posts.push(newPost);
      savePosts(posts);
      sendJson(res, 201, newPost);
      return;
    }

    // PATCH /api/posts/:id
    if (pathname.startsWith("/api/posts/") && req.method === "PATCH") {
      const id = pathname.split("/").pop();
      const body = await readBody(req);
      const posts = loadPosts();
      const idx = posts.findIndex(p => p.id === id);
      if (idx === -1) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }
      posts[idx] = { ...posts[idx], ...body, id: posts[idx].id };
      savePosts(posts);
      sendJson(res, 200, posts[idx]);
      return;
    }

    // DELETE /api/posts/:id
    if (pathname.startsWith("/api/posts/") && req.method === "DELETE") {
      const id = pathname.split("/").pop();
      let posts = loadPosts();
      const before = posts.length;
      posts = posts.filter(p => p.id !== id);
      savePosts(posts);
      sendJson(res, 200, { deleted: before !== posts.length });
      return;
    }

    // GET /api/meta - unique categories + labels, for autocomplete
    if (pathname === "/api/meta" && req.method === "GET") {
      const posts = loadPosts();
      const categories = [...new Set(posts.map(p => p.category).filter(Boolean))].sort();
      const labelSet = new Set();
      posts.forEach(p => (p.labels || []).forEach(l => labelSet.add(l)));
      sendJson(res, 200, { categories, labels: [...labelSet].sort() });
      return;
    }

    // Everything else -> serve the gallery static files
    if (req.method === "GET") {
      serveStatic(req, res, pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n📌 Insta Saver server running!`);
  console.log(`   Gallery:  http://localhost:${PORT}`);
  console.log(`   API:      http://localhost:${PORT}/api/posts\n`);
  console.log(`Keep this terminal window open while you use the extension.\n`);
});
