const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const UPSTREAM_TIMEOUT_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const MAX_RATE_BUCKET_ENTRIES = 1000;
const rateBuckets = new Map();

const ALLOWED_MODES = new Set(["search", "reverse", "details"]);
const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://rpcatering.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getAllowedOrigins() {
  const allowed = new Set(DEFAULT_ALLOWED_ORIGINS);
  const envOrigins = String(process.env.ALLOWED_ORIGINS || "");
  for (const part of envOrigins.split(",")) {
    const trimmed = part.trim().replace(/\/+$/, "");
    if (trimmed) allowed.add(trimmed);
  }
  return allowed;
}

function isOriginAuthorized(req) {
  const hostHeader = String(req.headers?.host || "").toLowerCase();
  const originHeader = String(req.headers?.origin || "").trim();
  const refererHeader = String(req.headers?.referer || "").trim();
  const allowed = getAllowedOrigins();

  const checkUrlOrigin = (rawUrl) => {
    try {
      const parsed = new URL(rawUrl);
      const origin = `${parsed.protocol}//${parsed.host}`.toLowerCase();
      if (allowed.has(origin)) return true;
      if (hostHeader && parsed.host.toLowerCase() === hostHeader) return true;
      if (
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        (parsed.protocol === "http:" || parsed.protocol === "https:")
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  if (originHeader) return checkUrlOrigin(originHeader);
  if (refererHeader) return checkUrlOrigin(refererHeader);

  // Direct same-origin browser/dev-middleware fetches without Origin/Referer
  return Boolean(hostHeader && (hostHeader.startsWith("localhost:") || hostHeader.startsWith("127.0.0.1:")));
}

function getClientIp(req) {
  const xff = String(req.headers?.["x-forwarded-for"] || "");
  if (xff) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  if (rateBuckets.size > MAX_RATE_BUCKET_ENTRIES) {
    for (const [key, entry] of rateBuckets.entries()) {
      if (entry.resetAt <= now) rateBuckets.delete(key);
    }
    if (rateBuckets.size > MAX_RATE_BUCKET_ENTRIES) {
      rateBuckets.clear();
    }
  }

  const current = rateBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseFiniteCoord(raw, min, max) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return num;
}

function isInsidePhilippines(lat, lng) {
  return lat >= 4.5 && lat <= 21.5 && lng >= 116.5 && lng <= 127.0;
}

function cleanGoogleAddress(address, placeName = "") {
  if (!address) return "";
  let cleaned = String(address).trim();
  if (
    placeName &&
    cleaned.toLowerCase().startsWith(placeName.toLowerCase() + ",")
  ) {
    cleaned = cleaned.slice(placeName.length + 1).trim();
  }
  cleaned = cleaned.replace(
    /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,5}(?:,|\s+)\s*/i,
    ""
  );
  return cleaned || String(address).trim();
}

export async function getGoogleMapsEmbedPlace(query) {
  const q = String(query || "").trim();
  if (q.length < 2 || q.length > 150) return null;

  try {
    const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=en&gl=ph&output=embed`;
    const res = await fetchWithTimeout(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-PH,en;q=0.9",
      },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const m = html.match(/initEmbed\((\[[\s\S]*?\])\);\s*\}/);
    if (!m) return null;

    const data = JSON.parse(m[1]);
    const placeEntry = data?.[21]?.[3];
    if (!Array.isArray(placeEntry)) return null;

    const meta = placeEntry[0];
    const name = typeof placeEntry[1] === "string" ? placeEntry[1].trim() : "";
    const coords = Array.isArray(meta?.[2]) ? meta[2] : null;
    const lat = typeof coords?.[0] === "number" ? coords[0] : null;
    const lng = typeof coords?.[1] === "number" ? coords[1] : null;
    const category =
      typeof placeEntry[12] === "string" && placeEntry[12].length < 40
        ? placeEntry[12]
        : undefined;
    const rawAddr =
      (typeof placeEntry[13] === "string" && placeEntry[13]) ||
      (Array.isArray(placeEntry[2]) && placeEntry[2].filter(Boolean).join(", ")) ||
      (typeof meta?.[1] === "string" && meta[1]) ||
      "";
    const address = cleanGoogleAddress(rawAddr, name);
    const id =
      (typeof placeEntry[27] === "string" && placeEntry[27]) ||
      (typeof meta?.[0] === "string" && meta[0]) ||
      `gm-embed-${lat}-${lng}`;

    if (name && address && lat !== null && lng !== null) {
      return {
        id,
        name,
        address,
        category,
        lat,
        lng,
        source: "google-embed",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchGoogleMapsPlaces(
  query,
  biasLat = 14.58,
  biasLng = 121.13,
  options = {}
) {
  const q = String(query || "").trim();
  if (q.length < 2 || q.length > 150) return [];
  const skipEmbed = Boolean(options?.skipEmbed);

  const suggestPb = `!2i10!4m12!1m3!1d45000!2d${biasLng}!3d${biasLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i10`;
  const suggestUrl = `https://www.google.com/s?tbm=map&gs_ri=maps&suggest=p&authuser=0&hl=en&gl=ph&pb=${suggestPb}&q=${encodeURIComponent(q)}`;

  const searchPb = `!4m12!1m3!1d65000!2d${biasLng}!3d${biasLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i10!10b1!12m8!1m1!18b1!2m3!5m1!6e2!20e3!10b1!16b1!19m4!2m3!1i360!2i120!4i8!20m57!2m2!1i203!2i100!3m2!2i4!5b1!6m6!1m2!1i86!2i86!1m2!1i408!2i240!7m42!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e9!2b1!3e2!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e4!2b1!4b1!9b0!22m6!1s!2z!7e81!12e3!17s!18e1!24m15!2b1!5m4!2b1!3b1!5b1!6b1!10m1!8e3!14m1!3b1!17b1!20m2!1e3!1e6!24b1!26m4!2m3!1i80!2i92!4i8!30m28!1m6!1m2!1i0!2i0!2m2!1i458!2i768!1m6!1m2!1i974!2i0!2m2!1i1024!2i768!1m6!1m2!1i0!2i0!2m2!1i1024!2i20!1m6!1m2!1i0!2i748!2m2!1i1024!2i768!34m13!2b1!3b1!4b1!6b1!8m4!1b1!3b1!4b1!6b1!9b1!12b1!14b1!20b1!37m1!1e81!42b1!47m0!49m1!3b1`;
  const searchUrl = `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=ph&pb=${searchPb}&q=${encodeURIComponent(q)}`;

  const [suggestRes, searchRes, embedPlaceRes] = await Promise.allSettled([
    fetchWithTimeout(suggestUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-PH,en;q=0.9",
      },
    }).then((r) => (r.ok ? r.text() : "")),
    fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-PH,en;q=0.9",
      },
    }).then((r) => (r.ok ? r.text() : "")),
    skipEmbed ? Promise.resolve(null) : getGoogleMapsEmbedPlace(q),
  ]);

  const rawItems = [];
  const detailedByCoord = new Map();

  if (embedPlaceRes.status === "fulfilled" && embedPlaceRes.value) {
    const ep = embedPlaceRes.value;
    const coordKey = `${ep.lat.toFixed(3)},${ep.lng.toFixed(3)}`;
    detailedByCoord.set(coordKey, ep);
    rawItems.push(ep);
  }

  if (searchRes.status === "fulfilled" && searchRes.value) {
    try {
      const clean = searchRes.value.replace(/^\)\]\}'\s*/, "");
      const parsed = JSON.parse(clean);

      const walk = (node) => {
        if (!Array.isArray(node)) return;
        if (
          typeof node[11] === "string" &&
          Array.isArray(node[9]) &&
          typeof node[9][2] === "number" &&
          typeof node[9][3] === "number"
        ) {
          const name = node[11].trim();
          const lat = node[9][2];
          const lng = node[9][3];
          const addr39 = typeof node[39] === "string" ? node[39].trim() : "";
          const addrLines = Array.isArray(node[2])
            ? node[2].filter(Boolean).join(", ")
            : "";
          const addr18 = typeof node[18] === "string" ? node[18].trim() : "";
          const address = cleanGoogleAddress(
            addr39 || addrLines || addr18,
            name
          );
          const category =
            Array.isArray(node[13]) && typeof node[13][0] === "string"
              ? node[13][0]
              : undefined;
          const id =
            (typeof node[78] === "string" && node[78]) ||
            (typeof node[10] === "string" && node[10]) ||
            `gm-search-${lat.toFixed(5)}-${lng.toFixed(5)}`;

          if (name && address) {
            const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
            const entry = {
              id,
              name,
              address,
              category,
              lat,
              lng,
              source: "google-search",
            };
            if (!detailedByCoord.has(coordKey)) {
              detailedByCoord.set(coordKey, entry);
            }
            rawItems.push(entry);
          }
          return;
        }
        for (let i = 0; i < node.length; i++) {
          walk(node[i]);
        }
      };

      walk(parsed);
    } catch {
      // Ignore parse errors
    }
  }

  const suggestItems = [];
  if (suggestRes.status === "fulfilled" && suggestRes.value) {
    try {
      const clean = suggestRes.value.replace(/^\)\]\}'\s*/, "");
      const parsed = JSON.parse(clean);
      const list = parsed?.[0]?.[1] || [];

      for (const item of list) {
        const p = item?.[22];
        if (!p) continue;
        const fullText = p?.[0]?.[0] || "";
        const name = (p?.[1]?.[0] || fullText.split(",")[0] || "").trim();
        const rawAddr = p?.[2]?.[0] || fullText;
        const address = cleanGoogleAddress(rawAddr, name);
        const lat = p?.[11]?.[2];
        const lng = p?.[11]?.[3];
        const id = p?.[0]?.[27] || `gm-sug-${lat}-${lng}`;

        if (name && typeof lat === "number" && typeof lng === "number") {
          const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          const detailed = detailedByCoord.get(coordKey);
          suggestItems.push({
            id: detailed?.id || id,
            name: detailed?.name || name,
            address:
              detailed?.address && detailed.address.length > address.length
                ? detailed.address
                : address,
            category: detailed?.category || "Google Maps",
            lat,
            lng,
            source: "google-suggest",
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  const allCandidates = [
    ...(embedPlaceRes.status === "fulfilled" && embedPlaceRes.value
      ? [embedPlaceRes.value]
      : []),
    ...suggestItems,
    ...rawItems,
  ];
  const deduped = [];
  const seenKeys = new Set();

  for (const item of allCandidates) {
    const coordKey = `${item.name.toLowerCase().slice(0, 12)}|${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (!seenKeys.has(coordKey)) {
      seenKeys.add(coordKey);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => {
    const aPh = isInsidePhilippines(a.lat, a.lng) ? 0 : 1;
    const bPh = isInsidePhilippines(b.lat, b.lng) ? 0 : 1;
    return aPh - bPh;
  });

  return deduped.slice(0, 8);
}

export async function reverseGeocodeGoogleMaps(lat, lng) {
  const numLat = parseFiniteCoord(lat, -90, 90);
  const numLng = parseFiniteCoord(lng, -180, 180);
  if (numLat === null || numLng === null) {
    return null;
  }

  const pb = `!1m4!1m3!1d100!2d${numLng}!3d${numLat}!2m2!1i1024!2i768!3m2!2d${numLng}!3d${numLat}!4f13.1!5m2!1b1!2b1`;
  const revealUrl = `https://www.google.com/maps/preview/reveal?authuser=0&hl=en&gl=ph&pb=${encodeURIComponent(pb)}`;

  try {
    const res = await fetchWithTimeout(revealUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-PH,en;q=0.9",
      },
    });
    if (!res.ok) return null;

    const raw = (await res.text()).replace(/^\)\]\}'\s*/, "");
    const data = JSON.parse(raw);

    const primaryTitle = data?.[0]?.[0] || "";
    const secondaryAddr = data?.[0]?.[1] || "";
    const fullFormatted = data?.[2]?.[18] || "";
    const category = data?.[2]?.[13]?.[0] || "";

    const isPlusCode =
      /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,5}$/i.test(
        primaryTitle.trim()
      );

    const placeName =
      !isPlusCode &&
      primaryTitle &&
      category &&
      !["Building", "Street", "Road"].includes(category)
        ? primaryTitle
        : "";

    const address = cleanGoogleAddress(
      fullFormatted || secondaryAddr || primaryTitle,
      placeName
    );

    return {
      placeName,
      address,
      category,
      lat: numLat,
      lng: numLng,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end(JSON.stringify({ error: "Method not allowed.", results: [] }));
    return;
  }

  if (!isOriginAuthorized(req)) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "Forbidden origin.", results: [] }));
    return;
  }

  if (isRateLimited(getClientIp(req))) {
    res.statusCode = 429;
    res.setHeader("Retry-After", "60");
    res.end(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment.", results: [] }));
    return;
  }

  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const mode = urlObj.searchParams.get("mode") || "search";

    if (!ALLOWED_MODES.has(mode)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid lookup mode.", results: [] }));
      return;
    }

    if (mode === "reverse") {
      const lat = parseFiniteCoord(urlObj.searchParams.get("lat"), -90, 90);
      const lng = parseFiniteCoord(urlObj.searchParams.get("lng"), -180, 180);
      if (lat === null || lng === null) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Valid lat and lng query parameters are required.", result: null }));
        return;
      }

      const result = await reverseGeocodeGoogleMaps(lat, lng);
      if (result) {
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ result }));
      return;
    }

    const q = String(urlObj.searchParams.get("q") || "").trim();
    if (q.length < 2 || q.length > 150) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Query parameter 'q' must be between 2 and 150 characters.", results: [] }));
      return;
    }

    if (mode === "details") {
      let result = await getGoogleMapsEmbedPlace(q);
      if (!result) {
        const list = await searchGoogleMapsPlaces(q, 14.58, 121.13, { skipEmbed: true });
        result = list[0] || null;
      }
      if (result) {
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ result }));
      return;
    }

    const lat = parseFiniteCoord(urlObj.searchParams.get("lat"), -90, 90) ?? 14.58;
    const lng = parseFiniteCoord(urlObj.searchParams.get("lng"), -180, 180) ?? 121.13;
    const results = await searchGoogleMapsPlaces(q, lat, lng);

    if (results.length > 0) {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ results }));
  } catch {
    res.statusCode = 500;
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: "Location lookup temporarily unavailable.", results: [] }));
  }
}
