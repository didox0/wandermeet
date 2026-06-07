import { useNavigate } from "react-router-dom";

export default function SafetySection() {
  const navigate = useNavigate();

  return (
    <section className="bg-gray-50 py-16 px-6 md:px-10">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
        {/* Icon */}
        <div className="shrink-0">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
            Travel Safe with Local Help
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md">
            Our global safety network connects you to verified local volunteers and emergency
            responders in one tap. Peace of mind for every solo mile.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="px-5 py-2.5 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            View Safety Guide
          </button>
          <button
            onClick={() => navigate("/safety")}
            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>⚠</span> Open SOS Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}