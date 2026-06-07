import { useState } from "react";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";

const columns = [
  {
    title: "Explore",
    links: [
      { name: "Discover", path: "/discover", description: "Find the best routes, hidden gems, and biking experiences shared by our community across India." },
      { name: "People Discovery", path: "#", description: "Connect with like-minded bikers and travelers nearby. Find your perfect riding partner based on your preferences and location." }
    ],
  },
  {
    title: "Connect",
    links: [
      { name: "Community Feed", path: "/community", description: "Stay updated with the latest posts, photos, and stories from fellow riders in our active community forum." },
      { name: "Travel Group", path: "#", description: "Join existing travel groups or create your own to organize epic group rides and plan multi-day adventures." },
      { name: "Biker Routes", path: "/bikers", description: "Explore detailed route maps, elevation profiles, and waypoints created specifically by and for the biking community." }
    ],
  },
  {
    title: "Account & Safety",
    links: [
      { name: "Profile", path: "/profile", description: "Manage your personal information, view your ride history, connect with friends, and showcase your achievements." },
      { name: "Settings", path: "/settings", description: "Customize your Wander Meet experience, configure notification preferences, and manage your account privacy." },
      { name: "Safety Center", path: "/safety", description: "Access important safety guidelines, emergency contacts, and our verified helper network for peace of mind on the road." }
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", path: "#", description: "Wander Meet is a geo-social app where solo travelers within India connect with verified travel partners based on proximity and shared interests." }
    ]
  }
];

export default function Footer() {
  const [modalContent, setModalContent] = useState(null);

  const handleLinkClick = (e, link) => {
    e.preventDefault();
    setModalContent(link);
  };

  return (
    <footer className="bg-white border-t border-gray-100 pt-12 pb-6 px-6 md:px-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 mb-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <img src={logo} alt="Wander Meet" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-blue-600" style={{ fontFamily: "Sora, sans-serif" }}>
              Wander Meet
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Connecting solo travelers and biking enthusiasts across India. Find your next
            adventure partner today.
          </p>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <div key={col.title}>
            <h4
              className="font-semibold text-gray-900 text-sm mb-4"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              {col.title}
            </h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.name}>
                  <button onClick={(e) => handleLinkClick(e, link)} className="text-xs text-gray-500 hover:text-gray-800 transition-colors text-left w-full">
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100 pt-5 text-center">
        <p className="text-xs text-gray-400">© 2026 Wander Meet. Built for the open road.</p>
      </div>

      {/* Info Modal */}
      {modalContent && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setModalContent(null)}>
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalContent(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1.5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               </div>
               <h3 className="text-xl font-bold text-slate-800">{modalContent.name}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              {modalContent.description}
            </p>
            {modalContent.path !== "#" ? (
              <div className="flex gap-3">
                 <Link to={modalContent.path} onClick={() => setModalContent(null)} className="flex-1 block text-center bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
                   Visit Page
                 </Link>
                 <button onClick={() => setModalContent(null)} className="flex-1 block text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                   Close
                 </button>
              </div>
            ) : (
              <button onClick={() => setModalContent(null)} className="w-full text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}