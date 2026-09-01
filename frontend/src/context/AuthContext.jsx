import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vidhyapraman_user') || localStorage.getItem('skillforge_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(
    localStorage.getItem('vidhyapraman_auth_token') || localStorage.getItem('skillforge_auth_token') || null
  );
  const [isLoading, setIsLoading] = useState(() => {
    // If token exists, keep loading state brief or background-refresh
    const storedToken =
      localStorage.getItem('vidhyapraman_auth_token') || localStorage.getItem('skillforge_auth_token');
    return !!storedToken && !localStorage.getItem('vidhyapraman_user');
  });
  const [activities, setActivities] = useState([]);

  // Initialize and verify authentication on app load
  useEffect(() => {
    async function loadUser() {
      const storedToken =
        localStorage.getItem('vidhyapraman_auth_token') || localStorage.getItem('skillforge_auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.auth.getProfile();
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem('vidhyapraman_user', JSON.stringify(res.user));
          setToken(storedToken);
          // Load recent activities
          try {
            const acts = await api.auth.getActivities();
            if (Array.isArray(acts)) setActivities(acts);
          } catch (e) {
            console.warn('Could not load user activities:', e);
          }
        } else if (res && res.error) {
          // If server explicitly returned an error
          if (res.error.includes('401') || res.error.includes('expired') || res.error.includes('unauthorized')) {
            logout();
          }
        }
      } catch (err) {
        console.warn('Session check warning:', err);
        // Only log out on explicit 401 Unauthorized / Token Expired
        if (err.message && (err.message.includes('401') || err.message.includes('expired') || err.message.includes('token_not_valid'))) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleAuthSuccess = (res) => {
    const accessToken = res.token || res.tokens?.access_token;
    if (accessToken && res.user) {
      localStorage.setItem('vidhyapraman_auth_token', accessToken);
      localStorage.setItem('vidhyapraman_active_username', res.user.username);
      localStorage.setItem('vidhyapraman_user', JSON.stringify(res.user));
      setToken(accessToken);
      setUser(res.user);

      // Refresh activities
      api.auth.getActivities(res.user.username)
        .then((acts) => {
          if (Array.isArray(acts)) setActivities(acts);
        })
        .catch(() => {});

      return { success: true, user: res.user };
    }
    throw new Error(res.error || 'Authentication failed: No session token received');
  };

  const loginWithGoogle = async (credentialOrToken) => {
    setIsLoading(true);
    try {
      const res = await api.auth.google(credentialOrToken);
      return handleAuthSuccess(res);
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGitHub = async (codeOrToken, redirectUri = null) => {
    setIsLoading(true);
    try {
      const res = await api.auth.github(codeOrToken, redirectUri);
      return handleAuthSuccess(res);
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const linkGitHub = async (codeOrToken, redirectUri = null) => {
    setIsLoading(true);
    try {
      const res = await api.auth.linkGitHub(codeOrToken, redirectUri);
      if (res && res.user) {
        setUser(res.user);
        return { success: true, user: res.user, reposSynced: res.repos_synced };
      }
      throw new Error(res.error || 'Failed to link GitHub account');
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const res = await api.auth.signin(credentials);
      return handleAuthSuccess(res);
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (formData) => {
    setIsLoading(true);
    try {
      const res = await api.auth.signup(formData);
      return handleAuthSuccess(res);
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('vidhyapraman_auth_token');
    localStorage.removeItem('vidhyapraman_active_username');
    localStorage.removeItem('vidhyapraman_user');
    localStorage.removeItem('skillforge_auth_token');
    localStorage.removeItem('skillforge_active_username');
    localStorage.removeItem('skillforge_user');
    setToken(null);
    setUser(null);
    setActivities([]);
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.auth.updateProfile(profileData);
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('vidhyapraman_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      throw new Error(res.error || 'Update failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logActivity = async (activityData) => {
    try {
      const newAct = await api.auth.logActivity({
        ...activityData,
        username: user?.username,
      });
      setActivities((prev) => [newAct, ...prev.slice(0, 24)]);
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await api.auth.getProfile();
      if (res && res.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.warn('Could not refresh profile:', e);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    activities,
    loginWithGoogle,
    loginWithGitHub,
    linkGitHub,
    login,
    signup,
    logout,
    updateProfile,
    logActivity,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
