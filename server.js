import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files (your frontend)
app.use(express.static(__dirname));

/* ================= SEARCH API ================= */
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  const exclude = req.query.exclude || "";

  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json` +
      `&q=${encodeURIComponent(q)}` +
      `&exclude_place_ids=${encodeURIComponent(exclude)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "World-Map-Explorer/1.0 (localhost)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Search API failed:", err);
    res.status(500).json([]);
  }
});

/* ================= REVERSE API ================= */
app.get("/api/reverse", async (req, res) => {
  const { lat, lon, zoom = 18 } = req.query;
  if (!lat || !lon) return res.status(400).json({});

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=${zoom}`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "World-Map-Explorer/1.0 (localhost)",
        "Accept": "application/json",
      },
    });
    res.json(await r.json());
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
});

/* ================= DETAILS API ================= */
app.get("/api/details", async (req, res) => {
  const { osmtype, osmid } = req.query;

  if (!osmtype || !osmid) {
    return res.status(400).json({});
  }

  const url = `https://nominatim.openstreetmap.org/details?format=json&osmtype=${osmtype}&osmid=${osmid}&addressdetails=1&extratags=1&polygon_geojson=1`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "World-Map-Explorer/1.0 (localhost)",
        "Accept": "application/json",
      },
    });

    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
});

app.get("/api/nominatim/details", async (req, res) => {
  const { osm_id } = req.query;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/details?osmtype=R&osmid=${osm_id}&addressdetails=1&extratags=1&format=json`,
      {
        headers: { "User-Agent": "World-Map-Explorer/1.0 (localhost)" },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
});

/* ================= OVERPASS API PROXY ================= */
app.all("/api/overpass", async (req, res) => {
  let query = req.body?.data || req.query?.data;
  if (!query && typeof req.body === "string") {
    query = req.body;
  }

  if (!query) {
    return res.status(400).json({ error: "Missing query data", elements: [] });
  }

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": "World-Map-Explorer/1.0 (localhost)",
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch {
          // If response is not JSON (e.g. HTML error page), try next mirror
          continue;
        }
      }
    } catch {
      // Aborted or failed, try next mirror
      continue;
    }
  }

  // Graceful empty elements fallback so client-side osmtogeojson never throws
  res.json({ version: 0.6, generator: "overpass-fallback", elements: [] });
});


/* ================= FALLBACK ================= */
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================= START SERVER ================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
