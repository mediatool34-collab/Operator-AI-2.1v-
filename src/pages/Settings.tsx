import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { logOut } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebase';

export function Settings() {
  const { user } = useAuth();
  const [metaConnected, setMetaConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [snapchatConnected, setSnapchatConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.platform && event.data?.token) {
        if (user) {
          try {
            localStorage.setItem(`${event.data.platform}_token`, event.data.token);
            if (event.data.platform === 'meta') setMetaConnected(true);
            if (event.data.platform === 'google') setGoogleConnected(true);
            if (event.data.platform === 'tiktok') setTiktokConnected(true);
            if (event.data.platform === 'snapchat') setSnapchatConnected(true);
          } catch (error: any) {
            console.error(`Error saving ${event.data.platform} token:`, error);
          }
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        alert('Authentication Error: ' + (event.data.error || 'Unknown error occurred'));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchTokens = async () => {
        try {
          if (localStorage.getItem('meta_token')) setMetaConnected(true);
          if (localStorage.getItem('google_token')) setGoogleConnected(true);
          if (localStorage.getItem('tiktok_token')) setTiktokConnected(true);
          if (localStorage.getItem('snapchat_token')) setSnapchatConnected(true);
        } catch (err: any) {
          console.error('Error fetching tokens:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchTokens();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDisconnect = async (platform: string) => {
    if (!user) return;
    try {
      localStorage.removeItem(`${platform}_token`);
      if (platform === 'meta') setMetaConnected(false);
      if (platform === 'google') setGoogleConnected(false);
      if (platform === 'tiktok') setTiktokConnected(false);
      if (platform === 'snapchat') setSnapchatConnected(false);
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
    }
  };

  const handleConnect = async (platform: string) => {
    try {
      let url = '';
      if (platform === 'meta') {
        const clientId = import.meta.env.VITE_META_CLIENT_ID || '1984316142437697';
        const redirectUri = `${window.location.origin}/api/auth/callback/meta`;
        const state = user?.uid || 'guest';
        url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management`;
      } else {
        const response = await fetch(`/api/auth/connect/${platform}?uid=${user?.uid}&json=true`);
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`Connect Error [${response.status}]:`, text);
          try {
            const json = JSON.parse(text);
            throw new Error(json.error || text);
          } catch (e) {
            throw new Error(`Failed to connect ${platform} (Status: ${response.status})`);
          }
        }

        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error(`Invalid Content-Type [${contentType}]:`, text);
          throw new Error(`Server returned non-JSON response for ${platform}. Check console for details.`);
        }

        const data = await response.json();
        url = data.url;
      }

      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (error: any) {
      console.error(`Error connecting ${platform}:`, error);
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Linkage (Multi-Account Scaling)</h1>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Account Profile</h2>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-white/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xl font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium text-white text-lg">{user?.displayName || 'User'}</div>
              <div className="text-gray-400">{user?.email}</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Connected Platforms</h2>
          
          <div className="space-y-4">
            {/* Meta Ads */}
            <div className="flex items-center justify-between p-4 bg-[#111827]/50 border border-white/5 rounded-xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">f</div>
                <div>
                  <div className="font-medium text-white">Meta Ads</div>
                  <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {metaConnected ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Linked</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 text-gray-500" /> Not linked</>
                    )}
                  </div>
                </div>
              </div>
              {metaConnected ? (
                <button onClick={() => handleDisconnect('meta')} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => handleConnect('meta')} className="px-4 py-2 text-sm font-medium bg-[#1877F2] text-white hover:bg-[#1877F2]/90 rounded-lg shadow-[0_0_10px_rgba(24,119,242,0.3)] transition-all duration-200">
                  Connect
                </button>
              )}
            </div>

            {/* Google Ads */}
            <div className="flex items-center justify-between p-4 bg-[#111827]/50 border border-white/5 rounded-xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-bold text-xl text-gray-900 overflow-hidden">
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.191 2.727 1.136 6.709l4.13 3.056Z" />
                    <path fill="#FBBC05" d="M1.136 6.71c-.345 1.054-.536 2.181-.536 3.354 0 1.173.191 2.3.545 3.345l4.137-3.219-4.146-3.48Z" />
                    <path fill="#4285F4" d="M12 24c3.155 0 5.8-1.045 7.791-2.836l-4.227-3.473c-1.027.691-2.355 1.118-3.564 1.118-2.736 0-5.045-1.845-5.873-4.327l-4.136 3.219C4.191 21.273 8.273 24 12 24Z" />
                    <path fill="#34A853" d="M18.127 15.491 12 12V4.909c3.118 0 5.645 2.527 5.645 5.645 0 1.836-.882 3.464-2.236 4.473L19.791 21.164c1.991-1.791 3.209-4.391 3.209-7.164 0-5.636-4.136-10.4-9.527-11.364l5.654 12.855Z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Google Ads</div>
                  <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {googleConnected ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Linked</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 text-gray-500" /> Not linked</>
                    )}
                  </div>
                </div>
              </div>
              {googleConnected ? (
                <button onClick={() => handleDisconnect('google')} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => handleConnect('google')} className="px-4 py-2 text-sm font-medium bg-white text-gray-900 border border-transparent hover:bg-gray-100 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all duration-200 flex items-center gap-2">
                  Connect
                </button>
              )}
            </div>

            {/* TikTok Ads */}
            <div className="flex items-center justify-between p-4 bg-[#111827]/50 border border-white/5 rounded-xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black border border-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.81-.6-4.03-1.37-.25.5-.47 1.01-.67 1.51v7.65c.01 1.53-.41 3.06-1.34 4.31-1.34 1.79-3.72 2.87-5.96 2.61-2.96-.28-5.46-2.58-6.14-5.46-.78-3.32.96-6.84 4.09-8.11.39-.16.79-.28 1.2-.37v4.06c-.19.04-.38.1-.56.18-1.15.53-1.89 1.79-1.78 3.06.1 1.26.96 2.39 2.13 2.87 1.27.53 2.84.41 3.96-.34.82-.55 1.3-1.5 1.29-2.5V4.31l.01-4.29Z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">TikTok Ads</div>
                  <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {tiktokConnected ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Linked</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 text-gray-500" /> Not linked</>
                    )}
                  </div>
                </div>
              </div>
              {tiktokConnected ? (
                <button onClick={() => handleDisconnect('tiktok')} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => handleConnect('tiktok')} className="px-4 py-2 text-sm font-medium bg-white text-gray-900 border border-transparent hover:bg-gray-100 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all duration-200">
                  Connect
                </button>
              )}
            </div>

            {/* Snapchat Ads */}
            <div className="flex items-center justify-between p-4 bg-[#111827]/50 border border-white/5 rounded-xl shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFFC00] rounded-lg flex items-center justify-center text-black font-bold text-xl shadow-md">
                   <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                     <path d="M12 2.5a.75.75 0 0 1 .75.75c0 .34-.23.62-.53.71l-.1.01c-3.13.29-5.63 2.79-5.92 5.92-.01.07-.02.13-.02.21a.75.75 0 0 1-1.5 0c0-.13.01-.26.03-.39.4-3.83 3.42-6.85 7.25-7.25.13-.02.26-.03.39-.03a.75.75 0 0 1 .75.75ZM12 21.5c-3.13-.29-5.63-2.79-5.92-5.92-.01-.07-.02-.13-.02-.21a.75.75 0 0 0-1.5 0c0 .13.01.26.03.39.4 3.83 3.42 6.85 7.25 7.25.13.02.26.03.39.03a.75.75 0 0 0 0-1.5c-.08 0-.14-.01-.21-.02ZM21.5 12c-.29 3.13-2.79 5.63-5.92 5.92-.07.01-.13.02-.21.02a.75.75 0 0 0 0 1.5c.13 0 .26-.01.39-.03a7.513 7.513 0 0 0 7.25-7.25c.02-.13.03-.26.03-.39a.75.75 0 0 0-1.5 0c0 .08-.01.14-.02.21ZM21.5 12c-.29-3.13-2.79-5.63-5.92-5.92-.07-.01-.13-.02-.21-.02a.75.75 0 0 1 0-1.5c.13 0 .26.01.39.03a7.513 7.513 0 0 1 7.25 7.25c.02.13.03.26.03.39a.75.75 0 0 1-1.5 0c0-.08-.01-.14-.02-.21Z" />
                     <path d="M12 16.5c-2.48 0-4.5-2.02-4.5-4.5s2.02-4.5 4.5-4.5 4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5Zm0-7.5c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3Z" />
                   </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Snapchat Ads</div>
                  <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {snapchatConnected ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Linked</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 text-gray-500" /> Not linked</>
                    )}
                  </div>
                </div>
              </div>
              {snapchatConnected ? (
                <button onClick={() => handleDisconnect('snapchat')} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => handleConnect('snapchat')} className="px-4 py-2 text-sm font-medium bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90 rounded-lg shadow-[0_0_10px_rgba(255,252,0,0.3)] transition-all duration-200 flex items-center gap-2">
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#0B0F19]/50">
          <button 
            onClick={logOut}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 font-medium px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors -ml-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
