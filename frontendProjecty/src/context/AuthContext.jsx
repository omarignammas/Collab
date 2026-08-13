import { useEffect, useState } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    if (!authService.getToken()) return undefined;

    let active = true;
    userService.getCurrentUser()
      .then((freshUser) => {
        if (!active) return;
        const merged = authService.updateStoredUser(freshUser);
        setUser(merged);
      })
      .catch((error) => {
        if (error.response?.status !== 401) {
          console.warn('Could not refresh the current user session:', error);
        }
      });

    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response);
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response.token) {
      setUser(response);
    }
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (partialUser) => {
    const merged = authService.updateStoredUser(partialUser);
    setUser(merged);
    return merged;
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
