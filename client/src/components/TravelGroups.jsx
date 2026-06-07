import { useState, useEffect, useCallback, useRef } from 'react';
import GroupChatView from './GroupChatView';
import { API_URL } from '../config';

const API = `${API_URL}/api/groups`;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'x-auth-token': getToken() });

const GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)',
  'linear-gradient(135deg, #172554 0%, #1d4ed8 50%, #60a5fa 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #818cf8 100%)',
  'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #6366f1 100%)',
  'linear-gradient(135deg, #082f49 0%, #0284c7 50%, #38bdf8 100%)',
];
const gradientFor = (id = '') => GRADIENTS[id.charCodeAt(id.length - 1) % GRADIENTS.length];

/* ────────────────────────── CreateGroupModal ───────────────────────────── */
function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', destination: '', startDate: '', endDate: '',
    description: '', privacy: 'public', maxMembers: 20,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pickImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setError('');
    if (!form.name.trim()) { setError('Group name is required'); return; }
    if (!form.destination.trim()) { setError('Destination is required'); return; }
    if (!form.startDate) { setError('Start date is required'); return; }
    if (!form.endDate) { setError('End date is required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { setError('End date must be after start date'); return; }

    setLoading(true);
    try {
      // Step 1: Create group with JSON
      const res = await fetch(`${API}/create`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.msg || 'Failed to create group'); setLoading(false); return; }

      // Step 2: Upload image if one was selected
      if (imageFile && data._id) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await fetch(`${API}/${data._id}/image`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: fd,
        });
      }

      onCreated();
      window.dispatchEvent(new Event('group-refresh'));
      onClose();
    } catch (e) { setError('Network error. Is the server running?'); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>🌍 Create Travel Group</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Plan your next adventure together</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 20, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {/* Cover Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cover Image</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', height: 140, borderRadius: 16, border: '2px dashed #cbd5e1',
                background: imagePreview ? 'transparent' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 22 }}>📷</span>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 4 }}>Change Image</span>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 28, marginBottom: 8 }}>🖼️</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Click to upload cover image</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>JPG, PNG, WebP · Max 5 MB</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
          </div>

          {/* Form Fields */}
          {[
            { label: 'Group Name *', key: 'name', placeholder: 'e.g. Goa Beach Squad' },
            { label: 'Destination *', key: 'destination', placeholder: 'e.g. Goa, India' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
              <input
                value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {[{ l: 'Start Date *', k: 'startDate' }, { l: 'End Date *', k: 'endDate' }].map(({ l, k }) => (
              <div key={k} style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</label>
                <input type="date" value={form[k]} onChange={e => set(k, e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What's the trip about?" rows={3}
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Privacy</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['public', 'private'].map(p => (
                  <button key={p} onClick={() => set('privacy', p)}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 12, border: form.privacy === p ? '2px solid #2563eb' : '1.5px solid #e2e8f0', background: form.privacy === p ? '#eff6ff' : '#fff', color: form.privacy === p ? '#2563eb' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                  >{p === 'public' ? '🌐 Public' : '🔒 Private'}</button>
                ))}
              </div>
            </div>
            <div style={{ width: 110 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Members</label>
              <input type="number" min={2} max={50} value={form.maxMembers} onChange={e => set('maxMembers', e.target.value === '' ? '' : parseInt(e.target.value))}
                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, fontWeight: 600, background: '#fef2f2', padding: '8px 12px', borderRadius: 10 }}>{error}</p>}

          <button onClick={submit} disabled={loading}
            style={{ width: '100%', padding: '13px 0', background: loading ? '#cbd5e1' : 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' }}
          >{loading ? '✨ Creating...' : '🚀 Create Group'}</button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── GroupCard ───────────────────────────────────── */
function GroupCard({ group, onClick }) {
  const s = new Date(group.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(group.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const memberCount = group.members?.length || 1;
  const fillPct = Math.round((memberCount / (group.maxMembers || 20)) * 100);
  const spotsLeft = (group.maxMembers || 20) - memberCount;
  const bg = gradientFor(group._id);

  return (
    <div
      onClick={onClick}
      style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
    >
      {/* Cover */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: bg }}>
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 70, opacity: 0.15, userSelect: 'none' }}>🏕️</span>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.55) 100%)' }} />

        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '4px 10px', borderRadius: '999px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            {group.privacy === 'public' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            )}
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group.privacy === 'public' ? 'Public' : 'Private'}
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

        {/* Title */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{group.name}</h4>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Info Row: Destination & Dates */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#475569', fontWeight: '500', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            {group.destination || 'Anywhere'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {s} – {e}
          </span>
        </div>

        {/* Member avatars + count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex' }}>
              {group.members?.slice(0, 4).map((m, i) => (
                <img key={m._id} src={m.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'U')}&size=28&background=random`} alt=""
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover', marginLeft: i > 0 ? '-10px' : '0', zIndex: 4 - i, position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              ))}
            </div>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '700' }}>
              {memberCount}<span style={{ color: '#94a3b8', fontWeight: '500' }}>/{group.maxMembers || 20}</span>
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>by <span style={{ color: '#475569', fontWeight: '600' }}>{group.host?.firstName || group.host?.username || 'Host'}</span></span>
        </div>

        {/* Progress bar and Button in a single grouped section */}
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
}

/* ────────────────────────── Main Component ──────────────────────────────── */
export default function TravelGroups({ initialGroupId, onClearInitial }) {
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API}?_t=${Date.now()}`, {
        headers: authHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setGroups(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const fetchSingleGroup = useCallback(async (id) => {
    try {
      const res = await fetch(`${API}/${id}?_t=${Date.now()}`, {
        headers: authHeaders(),
        cache: 'no-store'
      });
      if (res.ok) setSelectedGroup(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const handleJoin = async (groupId) => {
    const res = await fetch(`${API}/${groupId}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() }
    });
    if (res.ok) fetchGroups();
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch(`${API_URL}/api/auth/user-profile`, { headers: { 'x-auth-token': token } })
        .then(r => r.json())
        .then(d => { if (d?._id) setCurrentUser({ id: d._id, username: d.username, firstName: d.firstName, avatarUrl: d.avatarUrl }); })
        .catch(() => { });
    }
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (initialGroupId && !selectedGroup) {
      fetchSingleGroup(initialGroupId);
    }
  }, [initialGroupId, selectedGroup, fetchSingleGroup]);

  useEffect(() => {
    const handler = () => { fetchGroups(); if (selectedGroup) fetchSingleGroup(selectedGroup._id); };
    window.addEventListener('group-refresh', handler);
    return () => window.removeEventListener('group-refresh', handler);
  }, [selectedGroup, fetchGroups, fetchSingleGroup]);

  useEffect(() => {
    if (selectedGroup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedGroup]);

  const myGroups = groups.filter(g =>
    g.members?.some(m => (m._id || m) === currentUser?.id) ||
    (g.host?._id || g.host) === currentUser?.id
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Travel Groups</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Plan epic trips with fellow explorers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', border: 'none', borderRadius: 14, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
        >
          <span style={{ fontSize: 16 }}>+</span> Create Group
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✈️</div>
          <p style={{ margin: 0 }}>Loading groups...</p>
        </div>
      )}

      {!loading && myGroups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', borderRadius: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏕️</div>
          <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#334155' }}>You haven't joined any groups yet</h4>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Create a new group or discover groups to join!</p>
          <button onClick={() => setShowCreate(true)} style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Create Group</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {myGroups.map(g => (
          <GroupCard key={g._id} group={g} onClick={() => fetchSingleGroup(g._id)} />
        ))}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={fetchGroups} />}

      {/* Full-Screen Group Chat Modal */}
      {selectedGroup && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => { setSelectedGroup(null); if (onClearInitial) onClearInitial(); fetchGroups(); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 1100, height: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
          >
            <GroupChatView group={selectedGroup} onBack={() => { setSelectedGroup(null); if (onClearInitial) onClearInitial(); fetchGroups(); }} currentUser={currentUser} />
          </div>
        </div>
      )}
    </div>
  );
}
