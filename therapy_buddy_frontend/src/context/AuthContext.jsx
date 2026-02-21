import { createContext, useContext, useState } from "react";
import { authAPI } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      // Reject any leftover demo tokens
      if (!token || token === "demo-token") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
  });

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { access_token, user } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);