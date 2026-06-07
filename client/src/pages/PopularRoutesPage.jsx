import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

export const routes = [
  { name: "Manali–Leh Highway", distance: "479 km", difficulty: "Hard", difficulty_color: "#ef4444", riders: 42, img: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=600&q=80" },
  { name: "Shimla–Spiti Valley", distance: "350 km", difficulty: "Medium", difficulty_color: "#f59e0b", riders: 25, img: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&q=80" },
  { name: "Srinagar–Leh", distance: "720 km", difficulty: "Hard", difficulty_color: "#ef4444", riders: 30, img: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80" },
  { name: "Dehradun–Mussoorie", distance: "80 km", difficulty: "Easy", difficulty_color: "#10b981", riders: 20, img: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&q=80" },
  { name: "Rishikesh–Auli", distance: "150 km", difficulty: "Medium", difficulty_color: "#f59e0b", riders: 15, img: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80" },
  { name: "Jaipur–Jaisalmer", distance: "560 km", difficulty: "Medium", difficulty_color: "#f59e0b", riders: 28, img: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&q=80" },
  { name: "Udaipur–Mount Abu", distance: "270 km", difficulty: "Easy", difficulty_color: "#10b981", riders: 12, img: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=80" },
  { name: "Chandigarh–Kasol", distance: "260 km", difficulty: "Medium", difficulty_color: "#f59e0b", riders: 18, img: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80" },
];

// Dates for each route
const routeDates = {
  "Manali–Leh Highway": ["June 15, 2026", "July 02, 2026", "August 12, 2026"],
  "Shimla–Spiti Valley": ["June 28, 2026", "July 18, 2026", "September 05, 2026"],
  "Srinagar–Leh": ["June 20, 2026", "July 10, 2026", "August 24, 2026"],
  "Dehradun–Mussoorie": ["June 06, 2026", "June 13, 2026", "June 20, 2026"],
  "Rishikesh–Auli": ["June 12, 2026", "June 26, 2026", "July 10, 2026"],
  "Jaipur–Jaisalmer": ["October 15, 2026", "November 10, 2026", "December 20, 2026"],
  "Udaipur–Mount Abu": ["June 18, 2026", "July 08, 2026", "August 18, 2026"],
  "Chandigarh–Kasol": ["June 05, 2026", "June 19, 2026", "July 03, 2026"]
};

// Extended details for each route to show in the modal
const routeDetailsMap = {
  "Manali–Leh Highway": {
    terrain: "Gravel, Rock, Asphalt, Water Crossings",
    elevation: "5,328m (Taglang La)",
    bestTime: "June to September",
    description: "The holy grail of Indian biking expeditions. Cross high-mountain passes like Rohtang, Baralacha La, and Lachung La. Experience raw adventure, breathtaking views, and unpredictable weather.",
    gear: "Thermal liners, rain cover, puncture kit, oxygen canister, heavy-duty riding boots.",
    highlights: ["Gata Loops (21 hairpin bends)", "Morey Plains (40km high altitude plain)", "Keylong & Jispa valleys"]
  },
  "Shimla–Spiti Valley": {
    terrain: "Off-road, Dirt, Loose Scree, Mud",
    elevation: "4,590m (Kunzum La)",
    bestTime: "June to October",
    description: "Known as the 'treacherous road' of India. Ride along the Spiti river, visit thousand-year-old monasteries like Key Monastery, and explore the highest post office in the world at Hikkim.",
    gear: "Warm layer clothing, dry bags, chain lube, waterproof gloves, hydration pack.",
    highlights: ["Chicham Bridge (highest in Asia)", "Kaza town", "Chandratal Lake detour"]
  },
  "Srinagar–Leh": {
    terrain: "Smooth Highway, Steeps, Dirt/Slush",
    elevation: "3,528m (Zoji La)",
    bestTime: "May to October",
    description: "A gorgeous scenic route passing through the lush green valleys of Kashmir, cross the daunting Zoji La pass, and ride along historical military towns like Kargil and Drass.",
    gear: "Gore-Tex gear, camera gear, warm riding gloves, multi-tool kit.",
    highlights: ["Zoji La pass", "Kargil War Memorial", "Magnetic Hill marvel"]
  },
  "Dehradun–Mussoorie": {
    terrain: "Smooth Asphalt, Curvy Hairpins",
    elevation: "2,005m (Mussoorie)",
    bestTime: "October to June",
    description: "A short, delightful weekend escape featuring tight curves, lush oak forests, and amazing views of the Doon valley. Perfect for beginner riders looking for a quick hill climbing practice.",
    gear: "Light jacket, riding jeans, standard helmet.",
    highlights: ["Lal Tibba views", "Mall Road cruise", "Kempty Falls detour"]
  },
  "Rishikesh–Auli": {
    terrain: "Hilly Roads, Landslide Zones, Asphalt",
    elevation: "2,505m (Auli)",
    bestTime: "September to May",
    description: "Follow the holy Alaknanda river upstream through Panch Prayag (five sacred confluences). The route winds through pine forests ending at India's premiere ski destination with panoramic Himalayan views.",
    gear: "Windproof jacket, knee guards, action camera, first-aid kit.",
    highlights: ["Devprayag confluence", "Karnaprayag valley", "Joshimath cable car connection"]
  },
  "Jaipur–Jaisalmer": {
    terrain: "Flat Highway, Desert Sands, High Speed Asphalt",
    elevation: "220m",
    bestTime: "November to February",
    description: "Cruise down wide, open highways cutting through the Thar desert. Experience historical forts, traditional Rajasthani culture, and camp under the starlit desert sky.",
    gear: "Breathable mesh riding jacket, tinted visor, sunscreen, camelback water bladder.",
    highlights: ["Sam Sand Dunes sunset", "Jodhpur Blue City detour", "Traditional folk music nights"]
  },
  "Udaipur–Mount Abu": {
    terrain: "Curvy Hill Roads, Scenic Expressways",
    elevation: "1,220m (Mount Abu)",
    bestTime: "October to March",
    description: "A scenic ride climbing the ancient Aravalli range. Perfect mix of fast highway cruising and twisty mountain bends leading to Rajasthan's only hill station.",
    gear: "Textile riding suit, touring boots, modular helmet.",
    highlights: ["Nakki Lake cruise", "Dilwara Temples stop", "Aravalli valley viewpoints"]
  },
  "Chandigarh–Kasol": {
    terrain: "River Valleys, Twists, Landslide Slush",
    elevation: "1,580m (Kasol)",
    bestTime: "March to June, October to December",
    description: "Ride along the gushing Beas and Parvati rivers. Climb past the mighty green mountains of Himachal into the hippie capital of Kasol. A favorite among young riders and backpackers.",
    gear: "Warm fleece, rain cover for luggage, extra socks, GoPro mount.",
    highlights: ["Parvati valley breeze", "Manikaran hot springs", "Chalal forest trail walking"]
  }
};

export default function PopularRoutesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedDates, setSelectedDates] = useState({});
  const [joinedRoutes, setJoinedRoutes] = useState({});
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Handle joining/leaving a route
  const handleJoinToggle = (routeName, date) => {
    const key = `${routeName}-${date}`;
    const isJoined = !!joinedRoutes[key];

    setJoinedRoutes((prev) => ({
      ...prev,
      [key]: !isJoined
    }));

    // Trigger toast message
    if (!isJoined) {
      showToast(`🎉 Registered for ${routeName} on ${date}!`);
    } else {
      showToast(`ℹ️ Left the ride for ${routeName} on ${date}.`);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Filter routes based on search term & difficulty level
  const filteredRoutes = routes.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.distance.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = selectedDifficulty === "All" || r.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="font-sans bg-gray-50 text-gray-900 min-h-screen flex flex-col relative">
      <Navbar />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-800 animate-bounce">
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage("")} className="text-gray-400 hover:text-white font-bold text-xs">✕</button>
        </div>
      )}

      {/* Page Content */}
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-6 flex-grow w-full">
        {/* Header */}
        <div className="mb-10 text-center md:text-left md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center md:justify-start gap-2">
              🏍️ Popular Biker Routes
            </h1>
            <p className="text-gray-500 mt-2">
              Browse, filter, and join the most famous riding expeditions across India.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to="/bikers" className="text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5">
              ← Back to Biker Hub
            </Link>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by route name or distance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>

          {/* Difficulty Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {["All", "Easy", "Medium", "Hard", "Expert"].map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedDifficulty === difficulty
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>

        {/* Routes Grid */}
        {filteredRoutes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((r) => {
              const dates = routeDates[r.name] || [];
              const firstDate = dates[0] || "TBD";
              const isAnyJoined = dates.some(d => joinedRoutes[`${r.name}-${d}`]);
              const displayRiders = isAnyJoined ? r.riders + 1 : r.riders;

              return (
                <div 
                  key={r.name} 
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between cursor-pointer"
                  onClick={() => setSelectedRoute(r)}
                >
                  <div>
                    {/* Image Area */}
                    <div className="relative h-44 overflow-hidden">
                      <img 
                        src={r.img} 
                        alt={r.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <span 
                        className="absolute top-3 left-3 text-xs font-bold text-white px-2 py-0.5 rounded-full" 
                        style={{ backgroundColor: r.difficulty_color }}
                      >
                        {r.difficulty}
                      </span>
                    </div>

                    {/* Content Area */}
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 text-base mb-1 hover:text-orange-600 transition-colors">
                        {r.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4 mt-2">
                        <span>📍 {r.distance}</span>
                        <span>🏍️ {displayRiders} riders</span>
                        <span className="text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded">📅 {firstDate}</span>
                      </div>
                      
                      {/* Short Description snippet */}
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {routeDetailsMap[r.name]?.description || "Explore this stunning riding route and experience India like never before."}
                      </p>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="px-5 pb-5 pt-2 flex gap-3">
                    <button 
                      className="w-full text-xs font-semibold text-orange-600 border border-orange-200 rounded-xl py-2 hover:bg-orange-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoute(r);
                      }}
                    >
                      View Details & Schedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-4xl">🏜️</span>
            <h3 className="font-bold text-gray-700 text-lg mt-4">No routes found</h3>
            <p className="text-gray-400 text-sm mt-1">Try relaxing your search terms or filter constraints.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Detailed Modal with Date selector */}
      {selectedRoute && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Cover Image & Close */}
            <div className="relative h-52 w-full flex-shrink-0">
              <img 
                src={selectedRoute.img} 
                alt={selectedRoute.name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button 
                onClick={() => setSelectedRoute(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span 
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: selectedRoute.difficulty_color }}
                >
                  {selectedRoute.difficulty} Route
                </span>
                <h2 className="text-2xl font-black mt-1.5">{selectedRoute.name}</h2>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed text-gray-600">
              {/* Quick Specs */}
              <div className="grid grid-cols-3 gap-4 text-center border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Distance</p>
                  <p className="font-bold text-gray-900 mt-0.5">📍 {selectedRoute.distance}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Peak Elevation</p>
                  <p className="font-bold text-gray-900 mt-0.5">🏔️ {routeDetailsMap[selectedRoute.name]?.elevation || "Varies"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Bikers Interested</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    Map: 🏍️ {
                      (() => {
                        const dates = routeDates[selectedRoute.name] || [];
                        const isAnyJoined = dates.some(d => joinedRoutes[`${selectedRoute.name}-${d}`]);
                        return isAnyJoined ? selectedRoute.riders + 1 : selectedRoute.riders;
                      })()
                    }
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Route Overview</h4>
                <p className="text-gray-500 text-xs">
                  {routeDetailsMap[selectedRoute.name]?.description || "Explore this stunning riding route and experience India like never before."}
                </p>
              </div>

              {/* Date Selection list */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">📅 Select Departure Schedule</h4>
                <div className="space-y-2">
                  {(routeDates[selectedRoute.name] || []).map((date) => {
                    const key = `${selectedRoute.name}-${date}`;
                    const isJoined = !!joinedRoutes[key];
                    const isSelected = selectedDates[selectedRoute.name] === date || (!selectedDates[selectedRoute.name] && routeDates[selectedRoute.name][0] === date);

                    return (
                      <div 
                        key={date}
                        onClick={() => setSelectedDates(prev => ({ ...prev, [selectedRoute.name]: date }))}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected 
                            ? "border-orange-500 bg-orange-50/50" 
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🗓️</span>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{date}</p>
                            <p className="text-[10px] text-gray-400">Guaranteed departure</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isJoined && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Joined
                            </span>
                          )}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-orange-500" : "border-gray-300"}`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <h5 className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">🛣️ Terrain Type</h5>
                  <p className="text-xs text-gray-500">{routeDetailsMap[selectedRoute.name]?.terrain || "Mix of asphalt and dirt roads"}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <h5 className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">📅 Best Season</h5>
                  <p className="text-xs text-gray-500">{routeDetailsMap[selectedRoute.name]?.bestTime || "October to April"}</p>
                </div>
              </div>

              {/* Key Highlights */}
              {routeDetailsMap[selectedRoute.name]?.highlights && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1.5">🌟 Key Highlights</h4>
                  <ul className="list-disc pl-5 text-xs text-gray-500 space-y-1">
                    {routeDetailsMap[selectedRoute.name].highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Gear */}
              {routeDetailsMap[selectedRoute.name]?.gear && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">🎒 Recommended Gear</h4>
                  <p className="text-xs text-gray-500 italic">
                    {routeDetailsMap[selectedRoute.name].gear}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50">
              <button 
                onClick={() => setSelectedRoute(null)}
                className="px-5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const activeDate = selectedDates[selectedRoute.name] || routeDates[selectedRoute.name][0];
                  handleJoinToggle(selectedRoute.name, activeDate);
                }}
                className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  joinedRoutes[`${selectedRoute.name}-${selectedDates[selectedRoute.name] || routeDates[selectedRoute.name][0]}`]
                    ? "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                    : "bg-orange-500 text-white hover:bg-orange-600 shadow-md"
                }`}
              >
                {joinedRoutes[`${selectedRoute.name}-${selectedDates[selectedRoute.name] || routeDates[selectedRoute.name][0]}`] 
                  ? "✓ Leave Ride" 
                  : "Join Selected Ride"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
