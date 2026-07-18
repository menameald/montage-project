import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import TraineeDashboard from './components/TraineeDashboard';
import CoachDashboard from './components/CoachDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for saved login state on load
  useEffect(() => {
    const savedUser = localStorage.getItem('vision_team_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // Sync user details with database (e.g. check if promoted/demoted)
      if (parsed && !parsed.isCoach) {
        refreshUserProfile(parsed.id);
      }
    }
    setLoading(false);
  }, []);

  // Set interval to sync trainee profile state in background (every 7 seconds)
  useEffect(() => {
    if (user && !user.isCoach) {
      const syncInterval = setInterval(() => {
        refreshUserProfile(user.id);
      }, 7000);
      return () => clearInterval(syncInterval);
    }
  }, [user]);

  const refreshUserProfile = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const freshData = await res.json();
        setUser(freshData);
        localStorage.setItem('vision_team_user', JSON.stringify(freshData));
      }
    } catch (err) {
      console.error("Failed to sync user profile state:", err);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('vision_team_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vision_team_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center font-cairo">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-400">جاري تحميل منصة فريق الرؤية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-cairo selection:bg-emerald-500 selection:text-stone-950">
      {!user ? (
        <Auth onLoginSuccess={handleLoginSuccess} />
      ) : user.isCoach ? (
        <CoachDashboard onLogout={handleLogout} />
      ) : (
        <TraineeDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
