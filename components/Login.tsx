
import React, { useState } from 'react';
import { User } from '../types';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../constants';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      // Check Admin
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        onLogin({ id: 'admin-0', username: ADMIN_USERNAME, role: 'ADMIN' });
        return;
      }

      // Check Staff in Firestore
      const q = query(
        collection(db, 'staff'), 
        where('username', '==', username), 
        where('password', '==', password)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const staffDoc = querySnapshot.docs[0];
        onLogin({ id: staffDoc.id, ...staffDoc.data() } as User);
      } else {
        setError('Invalid credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check your Firebase config.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 text-white font-black text-3xl shadow-lg">V</div>
          <h1 className="text-2xl font-bold">VPP Cloud</h1>
          <p className="text-slate-500 text-sm">Real-time Celebration Hub</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input disabled={isLoggingIn} value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
          <input disabled={isLoggingIn} value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
          <button disabled={isLoggingIn} type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
            {isLoggingIn ? 'Connecting...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
