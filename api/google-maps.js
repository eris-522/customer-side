const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
  // Strip leading Plus Code if followed by a comma/street address (e.g., "H598+R3G, Cabrera Rd...")
  cleaned = cleaned.replace(
    /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,5}(?:,|\s+)\s*/i,
    ""
  );
  return cleaned || String(address).trim();
}

export async function getGoogleMapsEmbedPlace(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  try {
    const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=en&gl=ph&output=embed`;
    const res = await fetch(embedUrl, {
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
  biasLng = 121.13
) {
  const q = String(query || "").trim();
  if (!q) return [];

  const suggestPb = `!2i10!4m12!1m3!1d45000!2d${biasLng}!3d${biasLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i10`;
  const suggestUrl = `https://www.google.com/s?tbm=map&gs_ri=maps&suggest=p&authuser=0&hl=en&gl=ph&pb=${suggestPb}&q=${encodeURIComponent(q)}`;

  const searchPb = `!4m12!1m3!1d65000!2d${biasLng}!3d${biasLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i10!10b1!12m8!1m1!18b1!2m3!5m1!6e2!20e3!10b1!16b1!19m4!2m3!1i360!2i120!4i8!20m57!2m2!1i203!2i100!3m2!2i4!5b1!6m6!1m2!1i86!2i86!1m2!1i408!2i240!7m42!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e9!2b1!3e2!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e4!2b1!4b1!9b0!22m6!1s!2z!7e81!12e3!17s!18e1!24m15!2b1!5m4!2b1!3b1!5b1!6b1!10m1!8e3!14m1!3b1!17b1!20m2!1e3!1e6!24b1!26m4!2m3!1i80!2i92!4i8!30m28!1m6!1m2!1i0!2i0!2m2!1i458!2i768!1m6!1m2!1i974!2i0!2m2!1i1024!2i768!1m6!1m2!1i0!2i0!2m2!1i1024!2i20!1m6!1m2!1i0!2i748!2m2!1i1024!2i768!34m13!2b1!3b1!4b1!6b1!8m4!1b1!3b1!4b1!6b1!9b1!12b1!14b1!20b1!37m1!1e81!42b1!47m0!49m1!3b1`;
  const searchUrl = `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=ph&pb=${searchPb}&q=${encodeURIComponent(q)}`;

  const [suggestRes, searchRes, embedPlaceRes] = await Promise.allSettled([
    fetch(suggestUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-PH,en;q=0.9",
      },
    }).then((r) => (r.ok ? r.text() : "")),
    fetch(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-PH,en;q=0.9",
      },
    }).then((r) => (r.ok ? r.text() : "")),
    getGoogleMapsEmbedPlace(q),
  ]);

  const rawItems = [];
  const detailedByCoord = new Map();

  if (embedPlaceRes.status === "fulfilled" && embedPlaceRes.value) {
    const ep = embedPlaceRes.value;
    const coordKey = `${ep.lat.toFixed(3)},${ep.lng.toFixed(3)}`;
    detailedByCoord.set(coordKey, ep);
    rawItems.push(ep);
  }

  // 1. Parse Google Maps Full Search (`tbm=map`) for rich address & category metadata
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

  // 2. Parse Google Maps Autocomplete Suggest (`s?tbm=map`) and merge/enrich with detailed search
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

  // Combine embed spotlit result + suggest items + full search items
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

  // Sort Philippine results first
  deduped.sort((a, b) => {
    const aPh = isInsidePhilippines(a.lat, a.lng) ? 0 : 1;
    const bPh = isInsidePhilippines(b.lat, b.lng) ? 0 : 1;
    return aPh - bPh;
  });

  return deduped.slice(0, 8);
}

export async function reverseGeocodeGoogleMaps(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    return null;
  }

  const pb = `!1m4!1m3!1d100!2d${numLng}!3d${numLat}!2m2!1i1024!2i768!3m2!2d${numLng}!3d${numLat}!4f13.1!5m2!1b1!2b1`;
  const revealUrl = `https://www.google.com/maps/preview/reveal?authuser=0&hl=en&gl=ph&pb=${encodeURIComponent(pb)}`;

  try {
    const res = await fetch(revealUrl, {
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
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const mode = urlObj.searchParams.get("mode") || "search";

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60");

    if (mode === "reverse") {
      const lat = urlObj.searchParams.get("lat");
      const lng = urlObj.searchParams.get("lng");
      const result = await reverseGeocodeGoogleMaps(lat, lng);
      res.statusCode = 200;
      res.end(JSON.stringify({ result }));
      return;
    }

    if (mode === "details") {
      const q = urlObj.searchParams.get("q") || "";
      let result = await getGoogleMapsEmbedPlace(q);
      if (!result) {
        const list = await searchGoogleMapsPlaces(q);
        result = list[0] || null;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ result }));
      return;
    }

    const q = urlObj.searchParams.get("q") || "";
    const lat = parseFloat(urlObj.searchParams.get("lat") || "14.58") || 14.58;
    const lng = parseFloat(urlObj.searchParams.get("lng") || "121.13") || 121.13;
    const results = await searchGoogleMapsPlaces(q, lat, lng);

    res.statusCode = 200;
    res.end(JSON.stringify({ results }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err?.message || "Internal error", results: [] }));
  }
}

