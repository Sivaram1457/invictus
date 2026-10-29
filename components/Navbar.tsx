'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { 
  Trophy, 
  Swords, 
  Users, 
  Shield, 
  Crown, 
  Search, 
  Lock, 
  BarChart2, 
  Menu, 
  X,
  Flame
} from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: null },
    { href: '/rankings', label: 'Rankings', icon: Trophy },
    { href: '/matches', label: 'Matches', icon: Swords },
    { href: '/players', label: 'Players', icon: Users },
    { href: '/teams', label: 'Teams', icon: Shield },
    { href: '/competitions', label: 'Competitions', icon: Flame },
    { href: '/analysis', label: 'Analysis', icon: BarChart2 },
    { href: '/trophies', label: 'Hall of Fame', icon: Crown },
    { href: '/search', label: 'Search', icon: Search },
  ];

  return (
    <nav className="bg-[#12141c]/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* BRAND LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-black border border-[#d4af37]/50 shadow-md shadow-[#d4af37]/20 group-hover:scale-105 transition transform">
            <Image
              src="/logo.jpeg"
              alt="Invictus logo"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-black text-lg text-white uppercase tracking-wider">
            INVICTUS <span className="text-[#d4af37]">eFootball</span>
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden xl:flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-gray-300">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition flex items-center gap-1.5 py-1 border-b-2 ${
                  isActive
                    ? 'text-[#d4af37] border-[#d4af37]'
                    : 'border-transparent text-gray-300 hover:text-[#d4af37]'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-[#d4af37]" />}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ADMIN PORTAL LINK */}
        <div className="hidden xl:flex items-center">
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-xl bg-[#181a24] hover:bg-[#202330] border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-sm hover:border-[#d4af37]/60"
          >
            <Lock className="w-3.5 h-3.5" /> Admin Portal
          </Link>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="xl:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {isOpen ? <X className="w-6 h-6 text-[#d4af37]" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE DROPDOWN */}
      {isOpen && (
        <div className="xl:hidden bg-[#12141c] border-b border-gray-800 px-4 py-4 space-y-2 text-xs font-bold uppercase tracking-wider text-gray-300 animate-fade-in">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg transition ${
                  isActive
                    ? 'bg-[#181a24] text-[#d4af37] border border-[#d4af37]/30'
                    : 'hover:text-[#d4af37] hover:bg-[#181a24]/50'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 text-[#d4af37]" />}
                {link.label}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-gray-800/80">
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-[#d4af37] bg-[#181a24] border border-[#d4af37]/30"
            >
              <Lock className="w-4 h-4" /> Admin Portal
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}