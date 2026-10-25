import React, { useEffect, useId, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Search,
  Navigation,
  ExternalLink,
  Loader2,
  Layers,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export interface VenueSuggestion {
  id: string;
  name: string;
  address: string;
  category?: string;
  lat: number;
  lng: number;
  source?: string;
}

interface VenueMapPickerProps {
  venueName: string;
  venueAddress: string;
  coords: { lat: number; lng: number };
  hasPinnedVenue: boolean;
  onCoordsChange: (coords: { lat: number; lng: number }, hasPinned?: boolean) => void;
  onChange: (updates: { venueName?: string; venueAddress?: string }) => void;
}

// Default quick suggestions shown before typing
const DEFAULT_SUGGESTIONS: VenueSuggestion[] = [
  {
    id: "popular-siena",
    name: "Siena's Hotel and Events Place",
    address: "315 Buliran Road Sitio Bayugo, Antipolo, 1870 Rizal",
    category: "Banquet hall",
    lat: 14.5976045,
    lng: 121.1808601,
  },
  {
    id: "popular-jardin",
    name: "Jardin de Miramar Events Venue",
    address: "276 San Jose Ext, St. Benedict's Executive Village, San Isidro, Antipolo, 1870 Rizal",
    category: "Wedding venue",
    lat: 14.593664,
    lng: 121.1791979,
  },
  {
    id: "popular-chandelier",
    name: "The Chandelier Events Place",
    address: "267 San Jose Ext, Brgy. San Isidro, Antipolo, 1870 Rizal",
    category: "Event venue",
    lat: 14.5925124,
    lng: 121.1783204,
  },
  {
    id: "popular-blue-leaf-qc",
    name: "The Blue Leaf Cosmopolitan",
    address: "Robinsons Bridgetowne, 80 E. Rodriguez Jr. Ave, Bagumbayan, Quezon City, 1110 Metro Manila",
    category: "Event venue",
    lat: 14.5919216,
    lng: 121.081658,
  },
  {
    id: "popular-glass-garden",
    name: "The Glass Garden",
    address: "257 Evangelista Ave, Brgy. Santolan, Pasig, 1610 Metro Manila",
    category: "Event venue",
    lat: 14.6194692,
    lng: 121.0818869,
  },
];

// Custom Google-Maps-style Red Pin SVG Icon
const createGooglePinIcon = () =>
  L.divIcon({
    className: "custom-google-map-pin",
    html: `
      <div style="position: relative; width: 38px; height: 48px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45)); cursor: grab;">
        <svg viewBox="0 0 384 512" width="34" height="44" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" stroke="#ffffff" stroke-width="18" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          <circle cx="192" cy="192" r="70" fill="#81171b"/>
          <circle cx="192" cy="192" r="46" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 45],
    popupAnchor: [0, -42],
  });

function formatNominatimAddress(item: any): string {
  const addr = item.address || {};
  const displayName = String(item.display_name || "");
  const placeName = String(item.name || "").trim();

  if (placeName && displayName.toLowerCase().startsWith(placeName.toLowerCase() + ",")) {
    const rest = displayName.slice(placeName.length + 1).trim();
    if (rest.length > 5) return rest;
  }

  if (displayName) return displayName;

  const parts = [
    addr.house_number ? `${addr.house_number} ${addr.road || ""}`.trim() : addr.road,
    addr.neighbourhood || addr.suburb || addr.village || addr.quarter,
    addr.city || addr.town || addr.municipality,
    addr.state || addr.province,
    addr.postcode,
    addr.country,
  ].filter(Boolean);

  return parts.join(", ");
}

export default function VenueMapPicker({
  venueName,
  venueAddress,
  coords,
  hasPinnedVenue,
  onCoordsChange,
  onChange,
}: VenueMapPickerProps) {
  const venueNameId = useId();
  const venueAddressId = useId();

  const [pinnedLabel, setPinnedLabel] = useState<string>(
    venueName.trim() || "Roxan Policarpio Events & Catering Area"
  );
  const [mapMode, setMapMode] = useState<"roadmap" | "hybrid">("roadmap");

  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isSearchingVenue, setIsSearchingVenue] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isLocatingAddress, setIsLocatingAddress] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const dropdownWrapperRef = useRef<HTMLDivElement | null>(null);

  const isUserTypingVenueRef = useRef<boolean>(false);
  const lastAutoFilledQueryRef = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCoordsChangeRef = useRef(onCoordsChange);
  onCoordsChangeRef.current = onCoordsChange;
  const venueNameRef = useRef(venueName);
  venueNameRef.current = venueName;

  // Close autocomplete dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownWrapperRef.current &&
        !dropdownWrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Reverse geocode coordinates when the user drags/moves the pin or clicks the map
  const reverseGeocodePin = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    setStatusMessage("Fetching exact Google Maps address for new pin location...");

    try {
      const [googleRevRes, nominatimRes] = await Promise.allSettled([
        fetch(`/api/google-maps?mode=reverse&lat=${lat}&lng=${lng}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        ).then((r) => (r.ok ? r.json() : null)),
      ]);

      const gmData =
        googleRevRes.status === "fulfilled" ? googleRevRes.value?.result : null;
      const nomData =
        nominatimRes.status === "fulfilled" ? nominatimRes.value : null;

      let detectedPlaceName = gmData?.placeName || "";
      let resolvedAddress = gmData?.address || "";

      if (nomData && nomData.display_name) {
        const nomAddress = formatNominatimAddress(nomData);
        if (!detectedPlaceName && nomData.name && nomData.category !== "highway") {
          detectedPlaceName = nomData.name;
        }
        // Prefer whichever address is more descriptive/complete (e.g., if Google returned only City/Province)
        if (!resolvedAddress || (resolvedAddress.split(",").length < 2 && nomAddress)) {
          resolvedAddress = nomAddress;
        }
      }

      if (!resolvedAddress) {
        resolvedAddress = `Pinned Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      if (detectedPlaceName) {
        setPinnedLabel(detectedPlaceName);
        onChangeRef.current({
          venueName: detectedPlaceName,
          venueAddress: resolvedAddress,
        });
        setStatusMessage(
          `Pin moved to "${detectedPlaceName}" — Venue Name & Address updated`
        );
      } else {
        setPinnedLabel(
          venueNameRef.current.trim() || resolvedAddress.split(",")[0] || "Pinned Location"
        );
        onChangeRef.current({
          venueAddress: resolvedAddress,
        });
        setStatusMessage(
          "Pin moved — Venue Address updated to new Google Maps location"
        );
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      onChangeRef.current({
        venueAddress: `Pinned Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
      });
      setStatusMessage("Pin moved — Coordinates updated");
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Initialize interactive Google Maps view via Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tileLayer = L.tileLayer(
      "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      {
        maxZoom: 20,
      }
    ).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], {
      draggable: true,
      icon: createGooglePinIcon(),
      autoPan: true,
    }).addTo(map);

    // When user drags the pin to a new location
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onCoordsChangeRef.current({ lat: pos.lat, lng: pos.lng }, true);
      map.panTo(pos, { animate: true });
      reverseGeocodePin(pos.lat, pos.lng);
    });

    // Also allow clicking anywhere on the map to move the pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onCoordsChangeRef.current({ lat, lng }, true);
      map.panTo([lat, lng], { animate: true });
      reverseGeocodePin(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    tileLayerRef.current = tileLayer;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Switch between Google Road Map (lyrs=m) and Google Satellite Hybrid (lyrs=y)
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const lyrs = mapMode === "hybrid" ? "y" : "m";
    tileLayerRef.current.setUrl(
      `https://mt1.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`
    );
  }, [mapMode]);

  // Helper to move map & pin programmatically
  const moveMapAndPin = (lat: number, lng: number, label?: string) => {
    onCoordsChangeRef.current({ lat, lng }, true);
    if (label) setPinnedLabel(label);

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    }
  };

  // Enrich short autocomplete address with Google Maps exact street number & postal code
  const enrichGooglePlaceAddress = async (suggestion: VenueSuggestion) => {
    if (suggestion.source === "google-suggest" && !/\d{4}/.test(suggestion.address)) {
      try {
        const q = `${suggestion.name}, ${suggestion.address}`;
        const res = await fetch(
          `/api/google-maps?mode=details&q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          const detail = data?.result;
          if (detail?.address && detail.address.length >= suggestion.address.length) {
            onChangeRef.current({ venueAddress: detail.address });
          }
        }
      } catch {
        // Keep existing address on error
      }
    }
  };

  // Live Google Maps Place Search & Autocomplete as user types in Venue Name
  useEffect(() => {
    const query = venueName.trim();
    if (!isUserTypingVenueRef.current) return;

    if (query.length < 2) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      setIsSearchingVenue(false);
      return;
    }

    setIsSearchingVenue(true);
    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(query);

        // 1. Primary: Query live Google Maps Autocomplete + Search API via server middleware
        const gmRes = await fetch(
          `/api/google-maps?mode=search&q=${encoded}&lat=14.58&lng=121.13`,
          { signal: abortController.signal }
        );

        let results: VenueSuggestion[] = [];
        if (gmRes.ok) {
          const gmData = await gmRes.json();
          if (Array.isArray(gmData?.results)) {
            results = gmData.results;
          }
        }

        // 2. Fallback to Nominatim + Photon only if Google Maps endpoint returned empty
        if (results.length === 0) {
          const [nomRes, phoRes] = await Promise.allSettled([
            fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ph&limit=5&q=${encoded}`,
              {
                signal: abortController.signal,
                headers: { "Accept-Language": "en" },
              }
            ).then((r) => (r.ok ? r.json() : [])),
            fetch(
              `https://photon.komoot.io/api/?q=${encoded}&lat=14.58&lon=121.13&bbox=116.8,4.5,126.6,21.2&limit=5`,
              { signal: abortController.signal }
            ).then((r) => (r.ok ? r.json() : null)),
          ]);

          if (nomRes.status === "fulfilled" && Array.isArray(nomRes.value)) {
            for (const item of nomRes.value) {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (!isNaN(lat) && !isNaN(lng)) {
                results.push({
                  id: `nom-${item.place_id}`,
                  name: item.name || String(item.display_name || "").split(",")[0],
                  address: formatNominatimAddress(item),
                  category: item.type ? String(item.type).replace(/_/g, " ") : "Place",
                  lat,
                  lng,
                });
              }
            }
          }

          if (phoRes.status === "fulfilled" && Array.isArray(phoRes.value?.features)) {
            for (const feat of phoRes.value.features) {
              const [lng, lat] = feat.geometry?.coordinates || [];
              const props = feat.properties || {};
              if (typeof lat === "number" && typeof lng === "number" && props.name) {
                results.push({
                  id: `pho-${props.osm_id || Math.random()}`,
                  name: props.name,
                  address: [props.street, props.locality, props.city, props.state]
                    .filter(Boolean)
                    .join(", "),
                  category: props.osm_value || "Place",
                  lat,
                  lng,
                });
              }
            }
          }
        }

        setSuggestions(results);
        setHighlightedIndex(results.length > 0 ? 0 : -1);

        if (results.length > 0) {
          setShowDropdown(true);

          // Automatically populate the exact address in Venue Address box and move the Google Map pin
          const bestMatch = results[0];
          if (lastAutoFilledQueryRef.current !== query) {
            lastAutoFilledQueryRef.current = query;
            onChangeRef.current({
              venueAddress: bestMatch.address,
            });
            moveMapAndPin(bestMatch.lat, bestMatch.lng, bestMatch.name);
            setStatusMessage(
              `Matched "${bestMatch.name}" on Google Maps — exact address & pin updated`
            );
            enrichGooglePlaceAddress(bestMatch);
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Venue search error:", err);
        }
      } finally {
        setIsSearchingVenue(false);
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [venueName]);

  // Handle clicking or pressing Enter on a Google Maps venue suggestion
  const handleSelectSuggestion = async (suggestion: VenueSuggestion) => {
    isUserTypingVenueRef.current = false;
    setShowDropdown(false);

    onChange({
      venueName: suggestion.name,
      venueAddress: suggestion.address,
    });
    moveMapAndPin(suggestion.lat, suggestion.lng, suggestion.name);
    setStatusMessage(
      `Pinned "${suggestion.name}" — drag the red pin on the map if you need to adjust the location`
    );
    await enrichGooglePlaceAddress(suggestion);
  };

  // Forward geocode if the user manually edits the Venue Address and clicks "Sync Pin to Address"
  const handleLocateFromAddress = async () => {
    const addrQuery = venueAddress.trim() || venueName.trim();
    if (!addrQuery) return;

    setIsLocatingAddress(true);
    setStatusMessage("Locating address on Google Maps...");
    try {
      const encoded = encodeURIComponent(addrQuery);
      const gmRes = await fetch(
        `/api/google-maps?mode=search&q=${encoded}&lat=${coords.lat}&lng=${coords.lng}`
      );
      if (gmRes.ok) {
        const gmData = await gmRes.json();
        const top = gmData?.results?.[0];
        if (top && typeof top.lat === "number" && typeof top.lng === "number") {
          moveMapAndPin(top.lat, top.lng, venueName.trim() || top.name);
          setStatusMessage("Map pin updated to match the entered address");
          return;
        }
      }
      setStatusMessage("Could not find exact coordinates for that address — drag the pin manually on the map below.");
    } catch (err) {
      console.error("Address locate error:", err);
    } finally {
      setIsLocatingAddress(false);
    }
  };

  const googleMapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;

  return (
    <div className="col-span-full space-y-6">
      {/* Venue Name Input with Google Maps Place Autocomplete */}
      <div className="space-y-2 relative z-30" ref={dropdownWrapperRef}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={venueNameId}
            className="text-base text-white/80 font-bold flex items-center gap-2"
          >
            Venue Name <span className="text-red-400">*</span>
          </label>
        </div>

        <div className="relative">
          <MapPin
            size={18}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-400 pointer-events-none"
          />
          <input
            id={venueNameId}
            name="venueName"
            type="text"
            required
            autoComplete="off"
            placeholder="Search any venue on Google Maps (e.g., Siena's Events Place, The Blue Leaf, Jardin de Miramar...)"
            className="w-full bg-white/5 border border-white/10 pl-13 pr-12 py-4 text-lg focus:outline-none focus:border-gold-400/60 transition-all font-medium text-white placeholder:text-white/35"
            value={venueName}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowDropdown(true);
              } else if (!venueName.trim()) {
                setSuggestions(DEFAULT_SUGGESTIONS);
                setShowDropdown(true);
              }
            }}
            onKeyDown={(e) => {
              if (!showDropdown || suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev < suggestions.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev > 0 ? prev - 1 : suggestions.length - 1
                );
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                handleSelectSuggestion(suggestions[highlightedIndex]);
              } else if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
            onChange={(e) => {
              isUserTypingVenueRef.current = true;
              onChange({ venueName: e.target.value });
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearchingVenue && (
              <Loader2 size={18} className="text-gold-400 animate-spin" />
            )}
            {!isSearchingVenue && venueName && (
              <button
                type="button"
                onClick={() => setShowDropdown((prev) => !prev)}
                className="p-1.5 text-white/40 hover:text-gold-400 transition-colors cursor-pointer"
                title="Show matching Google Maps venues"
              >
                <Search size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Google Maps Autocomplete Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-[1000] bg-[#111111] border border-gold-400/40 rounded-md shadow-2xl max-h-80 overflow-y-auto divide-y divide-white/10">
            <div className="px-4 py-2 bg-white/5 flex items-center justify-between text-[11px] uppercase tracking-widest text-gold-400 font-bold">
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-red-500" />
                Google Maps Places
              </span>
              <span>Select or Press Enter</span>
            </div>
            {suggestions.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelectSuggestion(item)}
                  className={`w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3.5 cursor-pointer group ${
                    isHighlighted ? "bg-gold-400/15" : "hover:bg-gold-400/10"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isHighlighted
                        ? "bg-gold-400 text-black border-gold-400"
                        : "bg-gold-400/10 border-gold-400/30 text-gold-400 group-hover:bg-gold-400 group-hover:text-black"
                    }`}
                  >
                    <MapPin size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold transition-colors text-sm ${
                          isHighlighted
                            ? "text-gold-400"
                            : "text-white group-hover:text-gold-400"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.category && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white/70 rounded-xs font-semibold">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                      {item.address}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Venue Address Box (auto-populated from Google Maps search or draggable pin, and editable) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={venueAddressId}
            className="text-base text-white/80 font-bold flex items-center gap-2"
          >
            Venue Address <span className="text-red-400">*</span>
            {isReverseGeocoding && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gold-400 font-normal">
                <Loader2 size={13} className="animate-spin" />
                Updating from moved pin...
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={handleLocateFromAddress}
            disabled={isLocatingAddress || (!venueAddress.trim() && !venueName.trim())}
            className="text-xs font-bold text-gold-400 hover:text-gold-300 flex items-center gap-1.5 px-3 py-1 border border-gold-400/30 hover:border-gold-400 bg-gold-400/5 rounded-xs transition-all disabled:opacity-40 cursor-pointer"
          >
            {isLocatingAddress ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Navigation size={12} />
            )}
            Sync Pin to Address
          </button>
        </div>

        <textarea
          id={venueAddressId}
          name="venueAddress"
          autoComplete="street-address"
          required
          placeholder="Exact street address will automatically appear here when you type a venue name or move the map pin..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium resize-none text-white placeholder:text-white/35"
          value={venueAddress}
          onChange={(e) => {
            onChange({ venueAddress: e.target.value });
          }}
        />
      </div>

      {/* Embedded Interactive Google Map with Draggable Pin */}
      <div className="space-y-2.5 relative z-0 isolate">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400">
            <MapPin size={14} className="text-red-500" />
            <span>Google Maps Venue Pin</span>

          </div>
          <p className="text-xs text-white/60 font-medium">
            Drag the <span className="text-red-400 font-bold">red pin</span> or{" "}
            <span className="text-white/90 font-semibold">click anywhere on the map</span>{" "}
            to change the exact location & address
          </p>
        </div>

        <div className="relative z-0 isolate w-full h-[360px] md:h-[400px] border border-white/15 rounded-sm overflow-hidden shadow-2xl bg-[#1a1a1a]">
          {/* Interactive Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Google Maps Embed Style Info Card Overlay (Top-Left) */}
          <div className="absolute top-3 left-3 z-[400] max-w-[290px] sm:max-w-[330px] bg-white text-gray-900 rounded-xs shadow-lg border border-gray-200 p-3 pointer-events-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                  {venueName.trim() || pinnedLabel}
                </p>
                <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-snug">
                  {venueAddress.trim() ||
                    "Type a venue name above or drag the red pin to select a location"}
                </p>
              </div>
              <a
                href={googleMapsExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex flex-col items-center text-[10px] font-semibold text-blue-600 hover:underline px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                title="Open in Google Maps"
              >
                <ExternalLink size={14} className="mb-0.5" />
                <span>View</span>
              </a>
            </div>
            <div className="mt-2 pt-1.5 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
              <span className="font-mono">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
              <a
                href={googleMapsExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                View larger map
              </a>
            </div>
          </div>

          {/* Map / Satellite Switcher & Recenter (Top-Right) */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 pointer-events-auto">
            <div className="bg-white rounded-xs shadow-md border border-gray-200 flex overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMapMode("roadmap")}
                className={`px-3 py-1.5 cursor-pointer transition-colors ${
                  mapMode === "roadmap"
                    ? "bg-gray-900 text-white font-bold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapMode("hybrid")}
                className={`px-3 py-1.5 cursor-pointer transition-colors border-l border-gray-200 flex items-center gap-1 ${
                  mapMode === "hybrid"
                    ? "bg-gray-900 text-white font-bold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Layers size={12} />
                Satellite
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([coords.lat, coords.lng], 17, {
                    animate: true,
                  });
                }
              }}
              className="bg-white text-gray-800 hover:bg-gray-100 p-1.5 rounded-xs shadow-md border border-gray-200 cursor-pointer"
              title="Center on Pin"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Status Feedback Bar */}
        {statusMessage && (
          <div className="flex items-center gap-2 text-xs text-gold-400/90 bg-gold-400/5 border border-gold-400/20 px-3.5 py-2 rounded-xs">
            <MapPin size={13} className="shrink-0 text-gold-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
