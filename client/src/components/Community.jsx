import { useState, useEffect } from "react";
import ShareButton from '../components/ShareButton';
import TravelGroups from '../components/TravelGroups';
import { useNavigate } from "react-router-dom";
import FeedSection from './FeedSection';
import { API_URL } from '../config';

// PostCard logic removed. Now using FeedSection directly.

/* ─── Main Component ─────────────────────────────────────── */
export default function Community({ dashboardMode }) {
  const navigate = useNavigate();
  // useEffect for manual API fetch removed since FeedSection handles its own data

  const [overviewGroups, setOverviewGroups] = useState([]);

  // Fetch travel groups for the Active Groups section
  const fetchOverviewGroups = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/groups?_t=${Date.now()}`, {
      headers: { 'x-auth-token': token },
      cache: 'no-store'
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setOverviewGroups(data.slice(0, 6));
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchOverviewGroups();
    window.addEventListener('group-refresh', fetchOverviewGroups);
    return () => window.removeEventListener('group-refresh', fetchOverviewGroups);
  }, []);

  // addComment removed


  const [activeTab, setActiveTab] = useState("feed");
  const [selectedOverviewGroupId, setSelectedOverviewGroupId] = useState(null);

  const handleOpenGroup = (groupId) => {
    setSelectedOverviewGroupId(groupId);
    setActiveTab('groups');
  };

  if (dashboardMode) {
    return (
      <section className="bg-gray-50 py-10 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 text-base mb-1">Community Activity</h3>
            {/* FeedSection handles rendering and fetching automatically */}
            <div className="mt-4 -ml-4 -mr-4 md:m-0">
              <FeedSection overrideTab="global" hideSidebar={true} hideComposer={true} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh' }}>
      {/* ── Hero Banner ── */}
      <div style={{
        position: 'relative',
        height: '600px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Video Element */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0
          }}
        >
          <source src="/bg-video-community.mp4" type="video/mp4" />
        </video>
        {/* Overlay: subtle fade top & bottom, mostly clear in middle */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.55) 100%)'
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 20px', maxWidth: 680 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '4px 16px', marginBottom: 20 }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>✈️ Explore Together · Travel Communities</span>
          </div>

          <h2 style={{ fontFamily: 'Sora, sans-serif', color: '#fff', fontSize: 'clamp(28px,5vw,46px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 14 }}>
            Wanderer <span style={{ color: '#60A5FA', fontStyle: 'italic' }}>Communities</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Connect with fellow explorers, join travel groups, and share stories from the road.
          </p>

          {/* Tab pills */}
          <div style={{ display: 'inline-flex', gap: 8, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: 5, border: '1px solid rgba(255,255,255,0.2)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => setActiveTab('feed')}
              style={{
                fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'feed' ? '#fff' : 'transparent',
                color: activeTab === 'feed' ? '#1e3a5f' : 'rgba(255,255,255,0.9)'
              }}
            >🌍 Overview</button>
            <button
              onClick={() => setActiveTab('myFeed')}
              style={{
                fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'myFeed' ? '#fff' : 'transparent',
                color: activeTab === 'myFeed' ? '#1e3a5f' : 'rgba(255,255,255,0.9)'
              }}
            >📰 My Feed</button>
            <button
              onClick={() => setActiveTab('groups')}
              style={{
                fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'groups' ? '#fff' : 'transparent',
                color: activeTab === 'groups' ? '#1e3a5f' : 'rgba(255,255,255,0.9)'
              }}
            >🏕️ Travel Groups</button>
          </div>
        </div>
      </div>





      {/* Tab Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {activeTab === 'feed' ? (
          <div className="max-w-6xl mx-auto space-y-12">


            {/* ── ACTIVE GROUPS — centered grid (Bikes-style cards) ── */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                  🏕️ Active Groups
                </h3>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  See All →
                </button>
              </div>

              {overviewGroups.length === 0 ? (
                /* Empty state CTA */
                <div className="rounded-2xl p-8 text-white text-center" style={{ background: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)" }}>
                  <div className="text-4xl mb-3">🏕️</div>
                  <h4 className="font-bold text-lg mb-2">No Groups Yet</h4>
                  <p className="text-sm text-blue-100 mb-5 max-w-sm mx-auto leading-relaxed">
                    Create or join a travel group to plan adventures with like-minded explorers.
                  </p>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="bg-white text-blue-600 font-semibold text-sm rounded-xl px-6 py-2.5 hover:bg-blue-50 transition-colors"
                  >
                    Browse Travel Groups
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                  {overviewGroups.map((g) => {
                    const memberCount = g.members?.length || 1;
                    const fillPct = Math.round((memberCount / (g.maxMembers || 20)) * 100);
                    const spotsLeft = (g.maxMembers || 20) - memberCount;
                    const GRADIENTS = [
                      'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)',
                      'linear-gradient(135deg, #172554 0%, #1d4ed8 50%, #60a5fa 100%)',
                      'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #818cf8 100%)',
                      'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #6366f1 100%)',
                      'linear-gradient(135deg, #082f49 0%, #0284c7 50%, #38bdf8 100%)',
                    ];
                    const bg = GRADIENTS[(g._id || '').charCodeAt((g._id || '').length - 1) % GRADIENTS.length];

                    return (
                      <div
                        key={g._id}
                        onClick={() => handleOpenGroup(g._id)}
                        className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
                        style={{ transform: 'translateY(0)', transition: 'all 0.3s ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        {/* Cover image or gradient */}
                        <div className="relative h-48 overflow-hidden" style={{ background: bg }}>
                          {g.imageUrl && (
                            <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                          )}
                          {!g.imageUrl && (
                            <span className="absolute -right-3 -bottom-3 text-6xl opacity-10 select-none">🏕️</span>
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.55) 100%)' }} />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '4px 10px', borderRadius: '999px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                              {g.privacy === 'public' ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                              )}
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {g.privacy === 'public' ? 'Public' : 'Private'}
                              </span>
                            </div>
                            {spotsLeft <= 3 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '4px 10px', borderRadius: '999px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={spotsLeft === 0 ? "#94a3b8" : "#93c5fd"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Title overlay */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <h4 className="font-bold text-white text-sm leading-tight line-clamp-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                              {g.name}
                            </h4>
                          </div>
                        </div>

                        {/* Card body */}
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#fff' }}>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#475569', fontWeight: '500', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                              {g.destination || 'Anywhere'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ display: 'flex' }}>
                                {(g.members || []).slice(0, 4).map((m, i) => (
                                  <img key={m._id} src={m.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'U')}&size=28&background=random`} alt=""
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover', marginLeft: i > 0 ? '-10px' : '0', zIndex: 4 - i, position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                ))}
                              </div>
                              <span style={{ fontSize: '13px', color: '#334155', fontWeight: '700' }}>
                                {memberCount}<span style={{ color: '#94a3b8', fontWeight: '500' }}>/{g.maxMembers || 20}</span>
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '999px', width: `${fillPct}%`, background: fillPct >= 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.4s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                            </div>

                            <button
                              style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.35)'; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.25)'; }}
                            >
                              Open Group
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── COMMUNITY FEED — full-width centered ── */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                  🌍 Community Feed
                </h3>
                <button
                  onClick={() => setActiveTab('myFeed')}
                  className="text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  Open Feed →
                </button>
              </div>

              {/* Replaced local manual rendering with FeedSection global mode */}
              <div className="mt-2 -mx-4 md:mx-0">
                <FeedSection overrideTab="global" hideSidebar={true} />
              </div>
            </div>

          </div>
        ) : activeTab === 'myFeed' ? (
          <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 20 }}>
            <FeedSection />
          </div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <TravelGroups
              initialGroupId={selectedOverviewGroupId}
              onClearInitial={() => setSelectedOverviewGroupId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}