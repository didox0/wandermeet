import React, { useState, useEffect } from 'react';
import ShareButton from './ShareButton';
import { API_URL } from '../config';

export default function FeedSection({ overrideTab, hideSidebar, hideComposer }) {
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState(overrideTab || 'feed'); // 'feed', 'saved', 'myPosts', 'global'
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [postToDelete, setPostToDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    username: localStorage.getItem('username') || 'traveler',
    firstName: '',
    lastName: '',
    avatarUrl: localStorage.getItem('userAvatar') || '',
    id: null
  });

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/api/auth/user-profile`, {
      headers: { 'x-auth-token': token }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.username) {
          setCurrentUser(prev => ({
            username: data.username,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            avatarUrl: data.avatarUrl || prev.avatarUrl,
            id: data._id
          }));
        }
      })
      .catch(console.error);
  }, []);

  const fetchPosts = async () => {
    const token = getToken();
    if (!token) return;
    try {
      let url = `${API_URL}/api/posts/feed`;
      if (activeTab === 'saved') url = `${API_URL}/api/posts/saved`;
      if (activeTab === 'myPosts') {
        if (!currentUser.id) return;
        url = `${API_URL}/api/posts/user/${currentUser.id}`;
      }
      if (activeTab === 'global') {
        url = `${API_URL}/api/posts/all`;
      }
      
      const res = await fetch(url, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      
      // /feed returns { posts }, other endpoints return array of posts directly
      let postsArray = [];
      if (data.posts) {
        postsArray = data.posts;
      } else if (Array.isArray(data)) {
        postsArray = data;
      }

      // Deduplicate redundant posts (same author and content)
      const seen = new Set();
      const uniquePosts = postsArray.filter(post => {
        if (!post || !post.author) return false;
        const authorId = typeof post.author === 'object' ? (post.author._id || post.author.username) : post.author;
        const key = `${post.content?.trim()}_${authorId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setPosts(uniquePosts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'myPosts' && !currentUser.id) return;
    fetchPosts();
  }, [activeTab, currentUser.id]);

  const displayName = currentUser.firstName || currentUser.lastName
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
    : currentUser.username;
  const authorAvatar = currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username || 'User')}&background=random`;
  const handlePost = async () => {
    if (!newPostContent.trim() && !newPostImage) return;

    const token = getToken();
    const formData = new FormData();
    formData.append('content', newPostContent);
    if (newPostImage) formData.append('image', newPostImage);

    try {
      const res = await fetch(`${API_URL}/api/posts/create`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData
      });
      if (res.ok) {
        setNewPostContent('');
        setNewPostImage(null);
        if (activeTab === 'feed' || activeTab === 'myPosts') {
          fetchPosts(); // Refresh feed
        } else {
          setActiveTab('feed'); // Switch to feed to see new post
        }
      } else {
        const errorText = await res.text();
        console.error('Failed to post, server returned:', res.status, errorText);
        alert('Failed to post: ' + errorText);
      }
    } catch (err) {
      console.error('Failed to post', err);
      alert('Failed to post: ' + err.message);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewPostImage(e.target.files[0]);
    }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      // Optimistically remove from UI instantly for a snappy experience
      setPosts(prevPosts => prevPosts.filter(p => p._id !== postToDelete));
      const deletedId = postToDelete;
      setPostToDelete(null);

      const res = await fetch(`${API_URL}/api/posts/${deletedId}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': getToken() }
      });
      
      if (!res.ok) {
        // If it failed on the backend, revert the optimistic update by fetching the truth
        fetchPosts();
        const errorText = await res.text();
        alert("Failed to delete post: " + errorText);
      }
    } catch (err) {
      console.error("Delete post error", err);
      fetchPosts(); // Revert on network error
    }
  };

  const toggleLike = async (id) => {
    try {
      await fetch(`${API_URL}/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'x-auth-token': getToken() }
      });
      fetchPosts(); // Refresh to get updated likes
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSave = async (id) => {
    try {
      await fetch(`${API_URL}/api/posts/${id}/save`, {
        method: 'POST',
        headers: { 'x-auth-token': getToken() }
      });
      fetchPosts(); // Refresh to update save state
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = (id) => setOpenComments(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCommentInput = (postId, value) => setCommentInputs(prev => ({ ...prev, [postId]: value }));

  const addComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    try {
      await fetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 
          'x-auth-token': getToken(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setOpenComments(prev => ({ ...prev, [postId]: true }));
      fetchPosts(); // Refresh to show comment
    } catch (err) {
      console.error(err);
    }
  };

  const renderComposer = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-8">
      <div className="flex gap-4 flex-col sm:flex-row">
        <img src={authorAvatar} alt={displayName || 'You'} className="w-10 h-10 rounded-full object-cover hidden sm:block" />
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-2 sm:hidden">My Thoughts</h3>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your travel moments..."
            className="w-full bg-transparent border border-gray-200 rounded-xl p-3 text-gray-800 resize-none min-h-[120px] focus:outline-none focus:border-blue-500 transition-colors"
          />
          
          {newPostImage && (
            <div className="relative mt-3 inline-block">
              <img src={URL.createObjectURL(newPostImage)} alt="Preview" className="h-32 rounded-lg object-cover" />
              <button onClick={() => setNewPostImage(null)} className="absolute -top-2 -right-2 bg-white text-gray-600 hover:text-red-500 p-1 rounded-full shadow-sm border border-gray-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <label className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full cursor-pointer transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span className="text-sm font-medium">Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            <button 
              onClick={handlePost}
              disabled={!newPostContent.trim() && !newPostImage}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-1.5 px-6 rounded-full text-sm transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Check if we are in the "Overview -> Community Feed" mode
  const isOverviewFeed = hideSidebar && activeTab === 'global';

  return (
    <div className={`max-w-[1100px] mx-auto px-4 lg:px-8 flex flex-col ${isOverviewFeed ? 'md:flex-row' : 'lg:flex-row'} justify-center gap-8`}>

      {/* Standard Left Sidebar */}
      {!hideSidebar && (
        <div className="hidden lg:flex w-64 flex-col gap-6 sticky top-24 self-start shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex flex-col items-center text-center">
              <img src={authorAvatar} alt={displayName} className="w-20 h-20 rounded-full object-cover mb-3 border-4 border-blue-50" />
              <h2 className="font-bold text-gray-900 text-lg">{displayName || 'Traveler'}</h2>
              <p className="text-gray-500 text-sm">@{currentUser.username}</p>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4 flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab('feed')}
                className={`flex items-center gap-3 font-semibold px-4 py-3 rounded-xl transition-colors ${activeTab === 'feed' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                My Feed
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-3 font-semibold px-4 py-3 rounded-xl transition-colors ${activeTab === 'saved' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                Saved Posts
              </button>
              <button 
                onClick={() => setActiveTab('myPosts')}
                className={`flex items-center gap-3 font-semibold px-4 py-3 rounded-xl transition-colors ${activeTab === 'myPosts' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                My Posts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview Feed Left Sidebar for Composer */}
      {isOverviewFeed && !hideComposer && (
        <div className="w-full md:w-[350px] shrink-0 sticky top-24 self-start">
          <div className="mb-4 hidden md:block">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <span className="text-blue-500">✏️</span> My Thoughts
            </h3>
            <p className="text-sm text-gray-500 mt-1">Share your latest travel stories or updates.</p>
          </div>
          {renderComposer()}
        </div>
      )}

      {/* Main Feed Column */}
      <div className="flex-1 max-w-2xl w-full">
        {/* Composer (Standard Mode) */}
        {!isOverviewFeed && !hideComposer && (activeTab === 'feed' || activeTab === 'global') && renderComposer()}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-xl mb-2">Delete Post?</h3>
            <p className="text-gray-500 mb-6">This action cannot be undone. Are you sure you want to permanently delete this story?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPostToDelete(null)}
                className="flex-1 px-4 py-2 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePost}
                className="flex-1 px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Feed List */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {activeTab === 'saved' ? 'No posts saved' : 'No posts yet'}
              </h3>
              <p className="text-gray-500 text-sm">
                {activeTab === 'saved' 
                  ? 'Posts you save will appear here.' 
                  : (activeTab === 'myPosts' 
                      ? 'You haven\'t posted anything yet.' 
                      : 'Share your first travel story above to get the feed started!')}
              </p>
            </div>
          )}
          {posts.map(post => {
            if (!post || !post.author) return null; // Safeguard against deleted authors
            const authorName = post.author.firstName || post.author.lastName 
              ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() 
              : post.author.username || 'Traveler';
            const isLiked = Array.isArray(post.likes) && post.likes.some(like => like._id === currentUser.id || like === currentUser.id);
            const isSaved = Array.isArray(post.savedBy) && post.savedBy.some(id => id === currentUser.id);
            
            return (
            <div key={post._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:bg-gray-50/50 transition-colors cursor-pointer">
              <div className="flex gap-4">                <img src={post.author.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`} alt={authorName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{authorName}</h3>
                      <span className="text-gray-500 text-sm truncate">@{post.author.username || 'traveler'}</span>
                      <span className="text-gray-400 text-sm">·</span>
                      <span className="text-gray-500 text-sm whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    {/* Delete Post Button */}
                    {currentUser.id && (post.author._id === currentUser.id || post.author.username === currentUser.username) && (
                      <button onClick={(e) => { e.stopPropagation(); setPostToDelete(post._id); }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors" title="Delete post">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    )}
                  </div>

                  <p className="text-gray-800 whitespace-pre-wrap mb-3 leading-relaxed">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-gray-200">
                      <img src={post.imageUrl} alt="Post media" className="w-full h-auto object-cover max-h-96" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-gray-500 mt-2 max-w-md">
                    {/* Reply */}
                    <button onClick={(e) => { e.stopPropagation(); toggleComments(post._id); }} className="flex items-center gap-2 hover:text-blue-500 group transition-colors">
                      <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                      </div>
                      <span className="text-sm">{post.comments.length}</span>
                    </button>

                    {/* Share */}
                    <ShareButton post={post} />

                    {/* Like */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(post._id); }}
                      className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-pink-50' : 'group-hover:bg-pink-50'}`}>
                        <svg className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                      </div>
                      <span className="text-sm">{post.likes.length}</span>
                    </button>

                    {/* Save */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(post._id); }}
                      className={`flex items-center gap-2 group transition-colors ${isSaved ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-yellow-50' : 'group-hover:bg-yellow-50'}`}>
                        <svg className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                      </div>
                    </button>
                  </div>
                  
                  {/* Comments section */}
                  {openComments[post._id] && (
                    <div className="mt-4" onClick={e => e.stopPropagation()}>
                      <div className="space-y-3">
                        {post.comments.map(c => (
                          <div key={c._id} className="flex gap-3 items-start">                            <img src={c.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user.username || 'U')}&background=random`} alt={c.user.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            <div className="bg-gray-100 rounded-xl p-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{c.user.username}</span>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-gray-800 mt-1">{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-start gap-3">
                        <img src={authorAvatar} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex-1">
                          <textarea
                            value={commentInputs[post._id] || ''}
                            onChange={(e) => handleCommentInput(post._id, e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full bg-transparent border border-gray-200 rounded-xl p-2 text-sm resize-none min-h-[44px]"
                          />
                          <div className="flex justify-end mt-2">
                            <button onClick={() => addComment(post._id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded-full text-sm">Reply</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
