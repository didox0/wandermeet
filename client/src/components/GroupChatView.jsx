import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

const API = `${API_URL}/api/groups`;
const getToken = () => localStorage.getItem('token');
const headers = () => ({ 'Content-Type': 'application/json', 'x-auth-token': getToken() });

/* ── Custom Confirm Modal ────────────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:'16px' }} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:'24px', width:'100%', maxWidth:320, textAlign:'center', boxShadow:'0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <p style={{ margin:'0 0 20px', fontSize:15, fontWeight:600, color:'#1e293b', lineHeight:1.5 }}>
          {message}
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px 0', background:'#f1f5f9', color:'#334155', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'10px 0', background:'#ef4444', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ── SettingsPanel (host only) ───────────────────────────────────────── */
function SettingsPanel({ group, currentUser, onBack }) {
  const isHost = group.host?._id === currentUser?.id;
  const [edit, setEdit] = useState({
    name: group.name, destination: group.destination,
    startDate: group.startDate ? new Date(group.startDate).toISOString().substring(0,10) : '',
    endDate: group.endDate ? new Date(group.endDate).toISOString().substring(0,10) : '',
    description: group.description||'', privacy: group.privacy, maxMembers: group.maxMembers
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [kickTarget, setKickTarget] = useState(null);

  const save = async () => {
    setSaveStatus('saving'); setMsg('');
    try {
      // 1. Save group details
      const res = await fetch(`${API}/${group._id}`, { method:'PUT', headers:headers(), body:JSON.stringify(edit) });
      if (!res.ok) { const d=await res.json(); setMsg('❌ '+d.msg); setSaveStatus('idle'); return; }

      // 2. If new image, upload it — fires group-refresh AFTER upload so
      //    both Community Overview and TravelGroups card list get the new imageUrl
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        const imgRes = await fetch(`${API}/${group._id}/image`, {
          method: 'PATCH',
          headers: { 'x-auth-token': getToken() }, // no Content-Type for FormData
          body: fd,
        });
        if (!imgRes.ok) throw new Error('Image upload failed');
        setImageFile(null); // clear so re-saves don't re-upload
      }

      // Notify all listeners (Community overview + TravelGroups list + open modal)
      window.dispatchEvent(new Event('group-refresh'));

      // Green "Saved" button for 2 s, then reset
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setMsg('❌ Error saving changes');
      setSaveStatus('idle');
    }
  };

  const executeKick = async () => {
    if (!kickTarget) return;
    const res = await fetch(`${API}/${group._id}/members/${kickTarget}`, { method:'DELETE', headers:headers() });
    if (res.ok) window.dispatchEvent(new Event('group-refresh'));
    setKickTarget(null);
  };

  const deleteGroup = async () => {
    const res = await fetch(`${API}/${group._id}`, { method:'DELETE', headers:headers() });
    if (res.ok) { window.dispatchEvent(new Event('group-refresh')); onBack(); }
  };

  const inp = { width:'100%', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'9px 13px', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:10 };
  const lbl = { display:'block', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 };

  return (
    <div>
      {/* Members list */}
      <div style={{ background:'#f8fafc', borderRadius:14, padding:16, marginBottom:16 }}>
        <h4 style={{ margin:'0 0 12px', fontSize:14, fontWeight:700, color:'#0f172a' }}>👥 Members ({group.members?.length}/{group.maxMembers})</h4>
        {group.members?.map(m => (
          <div key={m._id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <img src={m.avatarUrl||`https://ui-avatars.com/api/?name=${encodeURIComponent(m.username||'U')}&size=32`} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover' }} />
            <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{m.firstName||m.username}
              {m._id===group.host?._id && <span style={{ marginLeft:6, fontSize:10, background:'#eff6ff', color:'#2563eb', padding:'1px 7px', borderRadius:10, fontWeight:700 }}>HOST</span>}
            </span>
            {isHost && m._id!==group.host?._id && (
              <button onClick={()=>setKickTarget(m._id)} style={{ background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>Kick</button>
            )}
          </div>
        ))}
      </div>

      {kickTarget && <ConfirmModal message="Remove this member from the group?" onConfirm={executeKick} onCancel={() => setKickTarget(null)} />}

      {/* Edit form – host only */}
      {isHost && (
        <div style={{ background:'#f8fafc', borderRadius:14, padding:16, marginBottom:16 }}>
          <h4 style={{ margin:'0 0 12px', fontSize:14, fontWeight:700, color:'#0f172a' }}>✏️ Edit Group</h4>

          <label style={lbl}>Cover Image</label>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
            <div style={{ width:60, height:60, borderRadius:8, background:'#e2e8f0', overflow:'hidden' }}>
              {(imagePreview || group.imageUrl) ? (
                <img src={imagePreview || group.imageUrl} alt="Cover" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🏕️</div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files[0];
              if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
            }} style={{ fontSize:12 }} />
          </div>

          <label style={lbl}>Group Name</label>
          <input style={inp} value={edit.name} onChange={e=>setEdit(p=>({...p,name:e.target.value}))} />
          <label style={lbl}>Destination</label>
          <input style={inp} value={edit.destination} onChange={e=>setEdit(p=>({...p,destination:e.target.value}))} />
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}><label style={lbl}>Start Date</label><input type="date" style={inp} value={edit.startDate} onChange={e=>setEdit(p=>({...p,startDate:e.target.value}))} /></div>
            <div style={{ flex:1 }}><label style={lbl}>End Date</label><input type="date" style={inp} value={edit.endDate} onChange={e=>setEdit(p=>({...p,endDate:e.target.value}))} /></div>
          </div>
          <label style={lbl}>Description</label>
          <textarea style={{...inp, resize:'none', height:72}} value={edit.description} onChange={e=>setEdit(p=>({...p,description:e.target.value}))} />
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}>
              <label style={lbl}>Privacy</label>
              <div style={{ display:'flex', gap:6 }}>
                {['public','private'].map(v=>(
                  <button key={v} onClick={()=>setEdit(p=>({...p,privacy:v}))} style={{ flex:1, padding:'7px 0', borderRadius:10, border:edit.privacy===v?'2px solid #2563eb':'1.5px solid #e2e8f0', background:edit.privacy===v?'#eff6ff':'#fff', color:edit.privacy===v?'#2563eb':'#64748b', fontSize:12, fontWeight:700, cursor:'pointer' }}>{v==='public'?'🌐 Public':'🔒 Private'}</button>
                ))}
              </div>
            </div>
            <div style={{ width:100 }}>
              <label style={lbl}>Max Members</label>
              <input type="number" min={2} max={50} style={inp} value={edit.maxMembers} onChange={e=>setEdit(p=>({...p,maxMembers:e.target.value===''?'':parseInt(e.target.value)}))} />
            </div>
          </div>
          {msg && <p style={{ fontSize:12, fontWeight:600, color:msg.startsWith('✅')?'#16a34a':'#ef4444', margin:'0 0 10px' }}>{msg}</p>}
          <button
            onClick={save}
            disabled={saveStatus !== 'idle'}
            style={{
              width: '100%',
              padding: '10px 0',
              background:
                saveStatus === 'saved'
                  ? 'linear-gradient(135deg,#16a34a,#15803d)'
                  : saveStatus === 'saving'
                  ? '#94a3b8'
                  : 'linear-gradient(135deg,#2563eb,#7c3aed)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: saveStatus !== 'idle' ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'saved' && '✓ Saved!'}
            {saveStatus === 'idle' && 'Save Changes'}
          </button>
        </div>
      )}

      {/* Delete group – host only */}
      {isHost && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          {!confirmDelete
            ? <button onClick={()=>setConfirmDelete(true)} style={{ background:'#fff', color:'#ef4444', border:'1px solid #fecaca', borderRadius:10, padding:'8px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>Delete Group</button>
            : <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center' }}>Are you sure?</span>
                <button onClick={deleteGroup} style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>Yes, Delete</button>
                <button onClick={()=>setConfirmDelete(false)} style={{ background:'#f1f5f9', color:'#334155', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              </div>
          }
        </div>
      )}
    </div>
  );
}

function TripHeader({ group, onBack, currentUser }) {
  const isHost = group.host?._id === currentUser?.id;
  const isMember = group.members?.some(m => m._id === currentUser?.id);
  const isPending = group.pendingRequests?.some(r => r._id === currentUser?.id);
  const isFull = group.members?.length >= group.maxMembers;
  
  const s = new Date(group.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(group.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleJoin = async () => {
    await fetch(`${API}/${group._id}/join`, { method: 'POST', headers: headers() });
    window.dispatchEvent(new Event('group-refresh'));
  };
  const handleLeave = async () => {
    await fetch(`${API}/${group._id}/leave`, { method: 'POST', headers: headers() });
    window.dispatchEvent(new Event('group-refresh'));
  };

  const GRADIENTS = [
    'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)',
    'linear-gradient(135deg, #172554 0%, #1d4ed8 50%, #60a5fa 100%)',
    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #818cf8 100%)',
    'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #6366f1 100%)',
    'linear-gradient(135deg, #082f49 0%, #0284c7 50%, #38bdf8 100%)',
  ];
  const bg = group.imageUrl ? `url(${group.imageUrl})` : GRADIENTS[(group._id || '').charCodeAt((group._id || '').length - 1) % GRADIENTS.length];

  return (
    <div style={{ 
      position: 'relative',
      borderRadius: '24px', 
      overflow: 'hidden',
      marginBottom: '24px', 
      color: '#fff', 
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      background: bg,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      {/* Dark gradient overlay for text readability */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.85) 100%)',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {group.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '6px 12px', borderRadius: '999px' }}>
                {group.privacy === 'public' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                )}
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {group.privacy}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
                <svg width="16" height="16" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {group.destination}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
                <svg width="16" height="16" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {s} → {e}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
                <svg width="16" height="16" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                {group.members?.length} / {group.maxMembers}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#cbd5e1' }}>Hosted by</span> 
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px 4px 4px', borderRadius: '20px', backdropFilter: 'blur(8px)' }}>
                  <img src={group.host?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.host?.username || 'H')}&size=24&background=random`} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #fff' }} />
                  <strong style={{ color: '#fff', fontWeight: '700', fontSize: '13px' }}>{group.host?.firstName || group.host?.username}</strong>
                </div>
              </span>
            </div>

            {group.description && (
              <p style={{ margin: '20px 0 0', fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', maxWidth: '95%', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {group.description}
              </p>
            )}
          </div>

          <button 
            onClick={onBack} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.25)'; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.transform='translateY(0)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Close
          </button>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          {!isMember && !isPending && !isFull && (
            <button onClick={handleJoin} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(59,130,246,0.4)', transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(59,130,246,0.5)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(59,130,246,0.4)'}}>
              {group.privacy === 'public' ? '👋 Join Group' : '✉️ Request to Join'}
            </button>
          )}
          {isPending && <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700' }}>⏳ Request Pending</span>}
          {isFull && !isMember && <span style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700' }}>🚫 Group Full</span>}
          {isMember && !isHost && <button onClick={handleLeave} style={{ background:'rgba(239,68,68,0.2)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'12px', padding:'12px 28px', fontWeight:'700', fontSize:'15px', cursor:'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.3)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,0.2)'}}>Exit Group</button>}
        </div>
      </div>
    </div>
  );
}

function PendingRequests({ group, currentUser }) {
  const isHost = group.host?._id === currentUser?.id;
  if (!isHost || !group.pendingRequests?.length) return null;
  const handle = async (userId, action) => {
    await fetch(`${API}/${group._id}/request/${userId}/${action}`, { method: 'POST', headers: headers() });
    window.dispatchEvent(new Event('group-refresh'));
  };
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#92400e' }}>Pending Requests ({group.pendingRequests.length})</h4>
      {group.pendingRequests.map(u => (
        <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <img src={u.avatarUrl || 'https://i.pravatar.cc/32'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{u.firstName || u.username}</span>
          <button onClick={() => handle(u._id, 'approve')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Accept</button>
          <button onClick={() => handle(u._id, 'reject')} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
        </div>
      ))}
    </div>
  );
}

function ChatTab({ group, currentUser }) {
  const [text, setText] = useState('');
  const isMember = group.members?.some(m => m._id === currentUser?.id);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [group.messages]);
  
  const send = async () => {
    if (!text.trim()) return;
    await fetch(`${API}/${group._id}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify({ text }) });
    setText('');
    window.dispatchEvent(new Event('group-refresh'));
  };

  if (!isMember) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 400, justifyContent: 'center', alignItems: 'center', background: '#f8fafc', borderRadius: 12 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b', fontWeight: 700 }}>Chat is locked</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Join the group to see the conversation and send messages.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#f8fafc', borderRadius: 12 }}>
        {(!group.messages || group.messages.length === 0) && <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 }}>No messages yet. Start the conversation! 💬</p>}
        {group.messages?.map(m => {
          if (m.isSystem) {
            return (
              <div key={m._id} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 16 }}>
                  {m.sender?.firstName || m.sender?.username} {m.text}
                </span>
              </div>
            );
          }
          const isOwn = m.sender?._id === currentUser?.id;
          return (
            <div key={m._id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 8, maxWidth: '75%' }}>
                <img src={m.sender?.avatarUrl || 'https://i.pravatar.cc/32'} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', marginBottom: 2, textAlign: isOwn ? 'right' : 'left' }}>{m.sender?.firstName || m.sender?.username}</p>
                  <div style={{ background: isOwn ? '#2563eb' : '#fff', color: isOwn ? '#fff' : '#1e293b', padding: '8px 14px', borderRadius: 14, fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>{m.text}</div>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1', textAlign: isOwn ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', fontSize: 14, outline: 'none' }} />
        <button onClick={send} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  );
}

function PollSection({ group, currentUser }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const isMember = group.members?.some(m => m._id === currentUser?.id);
  const createPoll = async () => {
    const filtered = opts.filter(o => o.trim());
    if (!q.trim() || filtered.length < 2) return;
    await fetch(`${API}/${group._id}/polls`, { method: 'POST', headers: headers(), body: JSON.stringify({ question: q, options: filtered }) });
    setQ(''); setOpts(['', '']);
    window.dispatchEvent(new Event('group-refresh'));
  };
  const vote = async (pollId, idx) => {
    await fetch(`${API}/${group._id}/polls/${pollId}/vote`, { method: 'POST', headers: headers(), body: JSON.stringify({ optionIndex: idx }) });
    window.dispatchEvent(new Event('group-refresh'));
  };
  const deletePoll = async (pollId) => {
    await fetch(`${API}/${group._id}/polls/${pollId}`, { method: 'DELETE', headers: headers() });
    window.dispatchEvent(new Event('group-refresh'));
  };
  return (
    <div>
      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>📊 Live Polls</h4>
      {group.polls?.map(poll => {
        const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
        const canDelete = currentUser?.id === group.host?._id || currentUser?.id === poll.createdBy?._id;
        return (
          <div key={poll._id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #e2e8f0', position: 'relative' }}>
            {canDelete && <button onClick={() => deletePoll(poll._id)} style={{ position:'absolute', top:12, right:12, background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:20, lineHeight:1 }}>×</button>}
            <p style={{ fontWeight: 600, margin: '0 0 10px', fontSize: 14, paddingRight: 24 }}>{poll.question}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px' }}>by {poll.createdBy?.firstName || poll.createdBy?.username} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
            {poll.options.map((opt, idx) => {
              const pct = totalVotes > 0 ? Math.round((opt.votes?.length || 0) / totalVotes * 100) : 0;
              const hasVoted = opt.votes?.some(v => (v._id || v) === currentUser?.id);
              return (
                <div key={opt._id} onClick={() => isMember && vote(poll._id, idx)} style={{ position: 'relative', marginBottom: 6, borderRadius: 8, overflow: 'hidden', cursor: isMember ? 'pointer' : 'default', border: hasVoted ? '2px solid #2563eb' : '1px solid #e2e8f0' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: hasVoted ? 'rgba(37,99,235,0.12)' : 'rgba(148,163,184,0.08)', transition: 'width 0.4s ease' }} />
                  <div style={{ position: 'relative', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: hasVoted ? 600 : 400 }}>{opt.text}</span>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {isMember && (
        <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 16, marginTop: 8 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Poll question..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
          {opts.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={o} onChange={e => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }} placeholder={`Option ${i + 1}`} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
              {opts.length > 2 && <button onClick={() => setOpts(opts.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {opts.length < 4 && <button onClick={() => setOpts([...opts, ''])} style={{ background: 'none', border: '1px dashed #94a3b8', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>+ Add Option</button>}
            <button onClick={createPoll} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>Create Poll</button>
          </div>
        </div>
      )}
      {(!group.polls || group.polls.length === 0) && !isMember && <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No polls yet</p>}
    </div>
  );
}

function ExpenseSection({ group, currentUser }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [selMembers, setSelMembers] = useState([]);
  const [err, setErr] = useState('');
  const isMember = group.members?.some(m => m._id === currentUser?.id);
  const toggleMember = (id) => setSelMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const addExpense = async () => {
    setErr('');
    if (!desc.trim() || !amount || selMembers.length === 0) return;
    
    if (!isNaN(desc.trim())) {
      setErr('Description cannot be purely a number');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErr('Amount must be a valid positive number');
      return;
    }
    
    await fetch(`${API}/${group._id}/expenses`, { method: 'POST', headers: headers(), body: JSON.stringify({ description: desc, totalAmount: parsedAmount, participants: selMembers }) });
    setDesc(''); setAmount(''); setSelMembers([]);
    window.dispatchEvent(new Event('group-refresh'));
  };
  const deleteExpense = async (expId) => {
    await fetch(`${API}/${group._id}/expenses/${expId}`, { method: 'DELETE', headers: headers() });
    window.dispatchEvent(new Event('group-refresh'));
  };
  return (
    <div>
      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>💰 Expense Splitter</h4>
      {group.expenses?.map(exp => {
        const perPerson = exp.participants?.length ? (exp.totalAmount / exp.participants.length).toFixed(2) : exp.totalAmount;
        const canDelete = currentUser?.id === group.host?._id || currentUser?.id === exp.createdBy?._id;
        return (
          <div key={exp._id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid #e2e8f0', position: 'relative' }}>
            {canDelete && <button onClick={() => deleteExpense(exp._id)} style={{ position:'absolute', top:12, right:12, background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:20, lineHeight:1 }}>×</button>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, paddingRight: 24 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{exp.description}</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#2563eb' }}>₹{exp.totalAmount}</span>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#64748b' }}>Added by {exp.createdBy?.firstName || exp.createdBy?.username}</p>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534' }}>
              Split: <strong>₹{perPerson}</strong> per person × {exp.participants?.length} people
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {exp.participants?.map(p => (
                <span key={p._id} style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{p.firstName || p.username}</span>
              ))}
            </div>
          </div>
        );
      })}
      {isMember && (
        <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 16, marginTop: 8 }}>
          <input value={desc} onChange={e => { setDesc(e.target.value); setErr(''); }} placeholder="Expense description..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
          <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setErr(''); }} placeholder="Amount (₹)" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>Split between:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {group.members?.map(m => (
              <button key={m._id} onClick={() => toggleMember(m._id)} style={{ background: selMembers.includes(m._id) ? '#2563eb' : '#fff', color: selMembers.includes(m._id) ? '#fff' : '#334155', border: '1px solid #e2e8f0', borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>{m.firstName || m.username}</button>
            ))}
          </div>
          {selMembers.length > 0 && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <p style={{ fontSize: 12, color: '#2563eb', margin: '0 0 8px' }}>₹{(parseFloat(amount) / selMembers.length).toFixed(2)} per person</p>
          )}
          {err && <p style={{ color: '#ef4444', fontSize: 12, margin: '0 0 8px', fontWeight: 600 }}>❌ {err}</p>}
          <button onClick={addExpense} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add Expense</button>
        </div>
      )}
      {(!group.expenses || group.expenses.length === 0) && !isMember && <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No expenses yet</p>}
    </div>
  );
}

export default function GroupChatView({ group, onBack, currentUser }) {
  const [tab, setTab] = useState('chat');
  const [canvasTab, setCanvasTab] = useState('polls');
  const isHost = group.host?._id === currentUser?.id;
  const isMember = group.members?.some(m => m._id === currentUser?.id);

  const tabStyle = (active) => ({ padding: '10px 20px', border: 'none', borderBottom: active ? '3px solid #2563eb' : '3px solid transparent', background: 'none', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#2563eb' : '#64748b', cursor: 'pointer', transition: 'all 0.2s', whiteSpace:'nowrap' });
  const subTabStyle = (active) => ({ padding: '6px 16px', border: 'none', borderRadius: 20, background: active ? '#2563eb' : '#f1f5f9', color: active ? '#fff' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' });

  return (
    <div style={{ padding: '24px' }}>
      <TripHeader group={group} onBack={onBack} currentUser={currentUser} />
      <PendingRequests group={group} currentUser={currentUser} />
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 16, overflowX:'auto' }}>
        <button onClick={() => setTab('chat')} style={tabStyle(tab === 'chat')}>💬 Chat</button>
        <button onClick={() => setTab('canvas')} style={tabStyle(tab === 'canvas')}>🎨 Trip Canvas</button>
        <button onClick={() => setTab('settings')} style={tabStyle(tab === 'settings')}>⚙️ Settings{isHost ? ' (Host)' : ''}</button>
      </div>
      {tab === 'chat' && <ChatTab group={group} currentUser={currentUser} />}
      {tab === 'canvas' && (
        <div>
          {!isMember && <p style={{ textAlign:'center', color:'#94a3b8', padding:40, fontSize:13 }}>Join the group to access the Trip Canvas.</p>}
          {isMember && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setCanvasTab('polls')} style={subTabStyle(canvasTab === 'polls')}>📊 Polls</button>
                <button onClick={() => setCanvasTab('expenses')} style={subTabStyle(canvasTab === 'expenses')}>💰 Expenses</button>
              </div>
              {canvasTab === 'polls' && <PollSection group={group} currentUser={currentUser} />}
              {canvasTab === 'expenses' && <ExpenseSection group={group} currentUser={currentUser} />}
            </>
          )}
        </div>
      )}
      {tab === 'settings' && <SettingsPanel group={group} currentUser={currentUser} onBack={onBack} />}
    </div>
  );
}
