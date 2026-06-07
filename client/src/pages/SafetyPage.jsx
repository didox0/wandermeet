import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";import { useState } from "react";
import { API_URL } from "../config";

export default function SafetyPage() {
  const navigate = useNavigate();
  const [broadcasting, setBroadcasting] = useState(false);
  const [helpNeeded, setHelpNeeded] = useState(true);
  const [popupMessage, setPopupMessage] = useState('');

  const handleBroadcastLocation = async () => {
    setBroadcasting(true);
    try {
      if (!navigator.geolocation) {
        setPopupMessage("Geolocation is not supported by your browser");
        setBroadcasting(false);
        return;
      }

      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

        try {
          const response = await fetch(`${API_URL}/api/auth/send-location-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": localStorage.getItem("token") || ""
            },
            body: JSON.stringify({
              latitude,
              longitude,
              locationUrl
            })
          });

          const data = await response.json();

          if (response.ok) {
            setPopupMessage(`✅ Location sent to email`);
          } else {
            setPopupMessage(data.msg || "Failed to send location");
          }
        } catch (err) {
          console.error("Error:", err);
          setPopupMessage("Error sending location. Check your settings.");
        } finally {
          setBroadcasting(false);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setPopupMessage("Location access denied by browser. Please allow location access in your URL bar.");
        } else if (error.code === error.TIMEOUT) {
          setPopupMessage("Location request timed out. Please check your PC location settings.");
        } else {
          setPopupMessage("Could not get your location. Please enable location services.");
        }
        setBroadcasting(false);
      }, geoOptions);
    } catch (err) {
      console.error("Error:", err);
      setBroadcasting(false);
    }
  };

  const quickAssistance = [
    { icon: "🔧", label: "Road Mechanic" },
    { icon: "⚕️", label: "Medical Assistance", phone: "108" },
    { icon: "⛽", label: "Out of Fuel" },
    { icon: "🚨", label: "Safety Concern", phone: "112" },
  ];

  return (
    <div className="font-sans bg-white text-gray-900 min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-6 md:px-10 py-12">
        {/* Page Header */}
        <div className="max-w-6xl mx-auto mb-12">
          <br />
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
            Safety Dashboard
          </h1>
          <p className="text-gray-500">Emergency tools and verified local assistance for solo travelers.</p>
        </div>

        {/* Safety Status Card */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="border-2 border-red-200 rounded-lg p-8 bg-red-50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Safety Status</h2>
              <button
                type="button"
                onClick={() => setHelpNeeded((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 transition-colors ${helpNeeded ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
              >
                <span className="text-sm font-medium">{helpNeeded ? "HELP NEEDED" : "ALL GOOD"}</span>
                <div className={`relative w-10 h-6 rounded-full ${helpNeeded ? "bg-red-300" : "bg-green-300"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${helpNeeded ? "left-1" : "right-1"}`}></div>
                </div>
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-6">Update your status for the local community</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Call Emergency Button */}
              <button
                onClick={() => window.location.href = 'tel:100'}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-colors group"
              >
                <div className="text-4xl group-hover:scale-110 transition-transform">☎️</div>
                <div>
                  <h3 className="font-bold text-lg">Call Emergency</h3>
                  <p className="text-sm text-red-100">Call 100 - Police</p>
                </div>
              </button>

              {/* Broadcast Live Button */}
              <button
                onClick={handleBroadcastLocation}
                disabled={broadcasting}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-colors group"
              >
                <div className="text-4xl group-hover:scale-110 transition-transform">📍</div>
                <div>
                  <h3 className="font-bold text-lg">{broadcasting ? "Sending..." : "Broadcast Live"}</h3>
                  <p className="text-sm text-blue-100">Send location to emails</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Assistance Templates */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="flex items-center gap-2 mb-6">
            <input type="checkbox" id="templates" className="w-4 h-4 cursor-pointer" />
            <label htmlFor="templates" className="text-lg font-semibold text-gray-900 cursor-pointer">
              Quick Assistance Templates
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickAssistance.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.phone) {
                    window.location.href = `tel:${item.phone}`;
                  }
                }}
                className="border border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{item.icon}</div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                {item.phone ? (
                  <p className="text-xs text-gray-500 mt-2">Call {item.phone}</p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </main>



      {/* Custom Alert Modal */}
      {popupMessage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              {popupMessage.includes('✅') ? (
                <div className="w-14 h-14 bg-green-50 border-4 border-green-100 text-green-500 rounded-full flex items-center justify-center mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              ) : (
                <div className="w-14 h-14 bg-red-50 border-4 border-red-100 text-red-500 rounded-full flex items-center justify-center mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
              )}
              
              <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
                {popupMessage.includes('✅') ? 'Location Shared' : 'Notice'}
              </h3>
              
              <p className="text-sm text-gray-600 mb-8 leading-relaxed px-2">
                {popupMessage.replace('✅ ', '')}
              </p>
              
              <button
                onClick={() => setPopupMessage('')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
