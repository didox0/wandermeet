import React, { useState } from 'react';

export default function ShareButton({ post }) {
  const [toast, setToast] = useState('');

  const postUrl = `https://wandermeet.com/post/${post.id}`;
  const postText = (post.content || '').slice(0, 250);

  const fallbackCopy = async (url) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setToast('Link copied successfully');
      setTimeout(() => setToast(''), 2200);
    } catch (err) {
      setToast('Failed to copy link');
      setTimeout(() => setToast(''), 2200);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    // Prefer native share when available
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.author?.name ? `${post.author.name} • Wandermeet` : 'Wandermeet',
          text: postText,
          url: postUrl,
        });
        return;
      } catch (err) {
        // user cancelled or share failed — fall back to copy
        if (err && err.name === 'AbortError') return;
      }
    }

    // Fallback: copy link to clipboard and show toast
    await fallbackCopy(postUrl);
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center gap-2 hover:text-green-500 group transition-colors"
        aria-label="Share post"
        title="Share"
      >
        <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v.01M12 12v.01M20 12v.01M8 12a4 4 0 108 0 4 4 0 00-8 0z"></path></svg>
        </div>
      </button>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50">
          <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow">{toast}</div>
        </div>
      )}
    </div>
  );
}
