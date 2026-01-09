
import React, { useState, useEffect } from 'react';
import { AuthState, User, Role } from './types';
import { STORAGE_KEYS, ADMIN_USERNAME, ADMIN_PASSWORD } from './constants';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
  }, [auth]);

  const handleLogin = (user: User) => {
    setAuth({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
  };

  if (!auth.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">V</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none">VPP</h1>
                <p className="text-xs text-slate-500">Celebration Manager</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{auth.user?.username}</p>
                <p className="text-xs text-slate-500 capitalize">{auth.user?.role.toLowerCase()}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {auth.user?.role === 'ADMIN' ? (
          <AdminDashboard />
        ) : (
          <StaffDashboard currentUser={auth.user!} />
        )}
      </main>
    </div>
  );
};

export default App;
