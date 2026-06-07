import { useEffect, useRef, useState } from "react";
import { API_URL } from '../config';

const geocodeCache = new Map();

// Removed dummy travelers data

export default function MapSection({ activeFilter, onOpenSearch }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerGroupRef = useRef(null);
  const [markersData, setMarkersData] = useState({ rides: [], groups: [] });
  const [discoveryData, setDiscoveryData] = useState({ count: 0, travelers: [] });
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sentRequests, setSentRequests] = useState(new Set());

  const handleSendRequest = async () => {
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
      
      // Use the actual _id for the backend if available, fallback to uniqueId
      const userId = selectedUser._id || selectedUser.uniqueId;

      const response = await fetch(`${API_URL}/api/users/follow/${userId}`, {
        method: "POST",
        headers: { "x-auth-token": token }
      });

      if (response.ok) {
        setSentRequests((prev) => new Set(prev).add(selectedUser.uniqueId));
      } else {
        const data = await response.json();
        console.error("Failed to send request:", data.msg);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setShowConnectModal(false);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/stats/travelers`)
      .then(res => res.json())
      .then(data => setDiscoveryData(data))
      .catch(err => console.error("Error fetching discovery travelers:", err));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/stats/markers`)
      .then(res => res.json())
      .then(data => setMarkersData(data))
      .catch(err => console.error("Error fetching markers:", err));
  }, []);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeaflet = async () => {
      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (mapRef.current && !mapInstanceRef.current) {
        const L = window.L;

        // Center on India/Asia area
        // Bounds matched to Google Maps official India boundary lines
        // Northern Ladakh border (dark line) sits at ~36.0°N
        // Western J&K border (dark line) starts at ~73.9°E
        const indiaBounds = L.latLngBounds(
          [6.4, 68.1],   // SW — Indira Point / Sir Creek (Rann of Kutch)
          [36.0, 97.4]    // NE — Northern Ladakh boundary / Arunachal Pradesh
        );

        const map = L.map(mapRef.current, {
          center: [22.0, 80.0],       // Center of India — all states visible
          zoom: 5,                    // Full India in view
          minZoom: 5,                 // Can't zoom out beyond India
          maxZoom: 13,                // Can zoom into cities/streets
          maxBounds: indiaBounds,     // Hard lock to India's official boundaries
          maxBoundsViscosity: 1.0,    // No elastic bounce outside India
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        // Use Google Maps tiles
        L.tileLayer(
          "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
          {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: "© Google Maps"
          }
        ).addTo(map);

        // Fetch India GeoJSON and apply inverted polygon blur mask
        fetch("https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson")
          .then(res => res.json())
          .then(data => {
            const worldBounds = [
              [90, -360], [90, 360], [-90, 360], [-90, -360]
            ];
            const geom = data.features[0].geometry;
            let holes = [];
            if (geom.type === "Polygon") {
              holes.push(geom.coordinates[0].map(c => [c[1], c[0]]));
            } else if (geom.type === "MultiPolygon") {
              geom.coordinates.forEach(poly => {
                holes.push(poly[0].map(c => [c[1], c[0]]));
              });
            }
            L.polygon([worldBounds, ...holes], {
              color: "transparent",
              fillColor: "rgba(255, 255, 255, 0.8)",
              fillOpacity: 1,
              className: 'map-blur-overlay'
            }).addTo(map);
          })
          .catch(err => console.error("Failed to load India GeoJSON:", err));

        // Fetch India States GeoJSON for internal borders
        fetch("https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States")
          .then(res => res.json())
          .then(data => {
            L.geoJSON(data, {
              style: {
                color: "#6B7280", // Subtle gray border for states
                weight: 1,
                fill: false,
                opacity: 0.8
              }
            }).addTo(map);
          })
          .catch(err => console.error("Failed to load India States GeoJSON:", err));

        const mkIcon = (color, size = 13) =>
          L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            className: "",
          });

        // Store the mkIcon function on the map instance for later use
        map.mkIcon = mkIcon;
        markerLayerGroupRef.current = L.layerGroup().addTo(map);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Geocode and render markers dynamically based on active filter
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !markerLayerGroupRef.current) return;
    const L = window.L;
    const layerGroup = markerLayerGroupRef.current;
    const mkIcon = mapInstanceRef.current.mkIcon;

    layerGroup.clearLayers();

    const geocodeAndPlot = async (locationStr, title, color) => {
      if (!locationStr) return;
      let coords = geocodeCache.get(locationStr);

      if (!coords) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            geocodeCache.set(locationStr, coords);
          }
        } catch (err) {
          console.error("Geocoding failed:", err);
        }
        // sleep 200ms to respect rate limit
        await new Promise(r => setTimeout(r, 200));
      }

      if (coords) {
        L.marker(coords, { icon: mkIcon(color, 14) }).addTo(layerGroup).bindPopup(title);
      }
    };

    const runGeocoding = async () => {
      if (activeFilter === "Biking" && markersData.rides) {
        for (const ride of markersData.rides) {
          await geocodeAndPlot(ride.startLocation, ride.routeName, "#EAB308"); // Yellow
        }
      } else if (activeFilter === "Travel Groups" && markersData.groups) {
        for (const group of markersData.groups) {
          await geocodeAndPlot(group.destination, group.name, "#3B82F6"); // Blue
        }
      }
    };

    runGeocoding();
  }, [activeFilter, markersData]);

  return (
    <section className="flex flex-col w-full">
      {/* MAP */}
      <div className="w-full relative h-[500px]" style={{ minHeight: "500px" }}>
        <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 0 }} />

        {/* Left icon bar */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          {["🌐", "🚴", "👥"].map((icon, i) => (
            <button
              key={i}
              className="w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center text-sm hover:bg-gray-50"
            >
              {icon}
            </button>
          ))}
        </div>


      </div>

      {/* PEOPLE DISCOVERY PANEL */}
      <div
        className="w-full bg-gray-50 border-t border-gray-200 p-8"
        style={{ zIndex: 1 }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h3
              className="font-bold text-gray-900 text-2xl"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              People Discovery
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">Found {discoveryData.count} active travelers globally</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoveryData.travelers.map((t, idx) => {
              const displayName = (t.firstName || t.lastName) ? `${t.firstName || ""} ${t.lastName || ""}`.trim() : t.username;
              const tags = (t.interests && t.interests.length > 0) ? t.interests : ["New Member"];
              const location = t.location || "Location not added";
              const uniqueId = t._id || t.username || idx;
              const isSent = sentRequests.has(uniqueId);

              return (
                <div key={uniqueId} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    {t.avatarUrl ? (
                      <img
                        src={t.avatarUrl}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900 truncate">{displayName}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {location}</p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isSent) {
                        setSelectedUser({ ...t, uniqueId });
                        setShowConnectModal(true);
                      }
                    }}
                    className={`w-full text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm ${isSent ? "bg-green-500 hover:bg-green-600 cursor-default" : "bg-blue-500 hover:bg-blue-600"
                      }`}
                  >
                    {isSent ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Sent
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                        Connect
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <button 
            onClick={onOpenSearch}
            className="mt-8 w-full md:w-auto mx-auto px-8 py-3 bg-white border border-gray-200 rounded-xl text-sm text-blue-600 hover:bg-gray-50 font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            Find More Travelers →
          </button>
        </div>
      </div>

      {/* CONNECT MODAL */}
      {showConnectModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl transform transition-all">
            <h3 className="font-bold text-xl mb-2 text-gray-900" style={{ fontFamily: "Sora, sans-serif" }}>Send find req?</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Do you want to send a connection request to <span className="font-semibold text-gray-700">{selectedUser.firstName || selectedUser.username}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-semibold shadow-md transition-colors"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}