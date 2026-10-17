import Link from 'next/link';
import { Shield, Trophy, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800/80 bg-[#0b0c10] mt-16 py-10 text-xs text-gray-500">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* TOP BRANDING & NAVIGATION LINKS */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-800/60 pb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#d4af37] to-[#aa7c11] flex items-center justify-center text-black font-black text-xs shadow-md shadow-[#d4af37]/20">
              I
            </div>
            <span className="font-black text-sm text-white uppercase tracking-wider">
              INVICTUS <span className="text-[#d4af37]">eFootball</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <Link href="/" className="hover:text-[#d4af37] transition">Dashboard</Link>
            <Link href="/rankings" className="hover:text-[#d4af37] transition">Rankings</Link>
            <Link href="/matches" className="hover:text-[#d4af37] transition">Matches</Link>
            <Link href="/players" className="hover:text-[#d4af37] transition">Players</Link>
            <Link href="/teams" className="hover:text-[#d4af37] transition">Teams</Link>
            <Link href="/competitions" className="hover:text-[#d4af37] transition">Competitions</Link>
            <Link href="/analysis" className="hover:text-[#d4af37] transition">Analysis</Link>
            <Link href="/trophies" className="hover:text-[#d4af37] transition">Hall of Fame</Link>
          </div>
        </div>

        {/* DEVELOPER CREDIT & DISCLAIMER */}
        <div className="text-center space-y-2">
          <p className="font-bold uppercase tracking-widest text-gray-400">
            INVICTUS eFootball League • Victory is Inevitable
          </p>
          <p className="text-[11px] text-gray-500 font-medium">
            THIS WEBPAGE WAS DEVELOPED & BUILT BY{' '}
            <a 
              href="https://www.instagram.com/_siva._ram_?rpxt=MXh1OWMyZ3FyaXowcA==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#d4af37] hover:text-white transition-colors duration-300 font-black uppercase"
            >
              SIVARAM
            </a>{' '}
            FOR INVICTUS
          </p>
          <p className="text-[10px] text-gray-600">
            © {currentYear} INVICTUS League. All Rights Reserved. Not affiliated with Konami Digital Entertainment.
          </p>
        </div>

      </div>
    </footer>
  );
}