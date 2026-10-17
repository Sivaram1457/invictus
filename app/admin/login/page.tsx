'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Key, ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Read admin passcode from environment variable or fallback for development
    const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'invictus2026';

    if (password.trim() === ADMIN_SECRET) {
      // Set admin session state in LocalStorage
      localStorage.setItem('invictus_admin', 'true');
      router.push('/admin');
    } else {
      setError('Invalid Admin Credentials. Access Denied.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 bg-[#12141c] border border-[#d4af37]/30 rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.1)] space-y-6">
        
        {/* LOGO & BRANDING */}
        <div className="text-center space-y-2">
          <div className="relative w-20 h-20 mx-auto mb-2">
            <Image
              src="/logo.jpeg"
              alt="INVICTUS Logo"
              fill
              className="object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-[#d4af37] uppercase">
            INVICTUS ADMIN
          </h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Restricted Portal • Management Only
          </p>
        </div>

        {/* ERROR ALERT */}
        {error && (
          <div 
            role="alert"
            className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-xs font-medium animate-pulse"
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* FORM INPUT */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Passcode
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin passcode"
                className="w-full pl-10 pr-4 py-2.5 bg-[#181a24] border border-gray-800 rounded-lg focus:outline-none focus:border-[#d4af37] text-white text-sm transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] hover:from-[#b59228] hover:to-[#8c650d] text-black font-extrabold rounded-lg transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Access Control Panel'}
          </button>
        </form>

        <div className="text-center border-t border-gray-800/80 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">
            Victory is Inevitable • INVICTUS League
          </p>
        </div>
      </div>
    </div>
  );
}