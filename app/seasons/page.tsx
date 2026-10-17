'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, 
  Trophy, 
  Calendar, 
  History, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Flame 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// TYPES
interface Season {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Upcoming';
  startDate: string;
  endDate: string;
  championName?: string;
  runnerUpName?: string;
  totalMatches: number;
  totalGoals: number;
  description: string;
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    const loadSeasons = async () => {
      if (!supabase) return;
      const [{ data: seasonData }, { data: matchData }, { data: playerData }] = await Promise.all([
        supabase.from('seasons').select('*').order('created_at', { ascending: false }),
        supabase.from('matches').select('season_id, home_score, away_score'),
        supabase.from('players').select('name, trophies'),
      ]);

      const records = (seasonData || []).map((season) => {
        const seasonMatches = (matchData || []).filter((match) => match.season_id === season.id);
        const trophies = (playerData || []).flatMap((player) => player.trophies || []);
        const champion = trophies.find((trophy) => trophy.includes(`Season: ${season.name}`) && trophy.includes('Champion'));
        const runnerUp = trophies.find((trophy) => trophy.includes(`Season: ${season.name}`) && trophy.includes('Runner-up'));
        return {
          id: season.id,
          name: season.name,
          status: season.status,
          startDate: season.created_at ? new Date(season.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
          endDate: season.status === 'Completed' && season.updated_at ? new Date(season.updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Current',
          championName: champion?.split('|')[2]?.replace(' Final:', '').trim(),
          runnerUpName: runnerUp?.split('|')[2]?.replace(' Final:', '').trim(),
          totalMatches: seasonMatches.length,
          totalGoals: seasonMatches.reduce((total, match) => total + (match.home_score || 0) + (match.away_score || 0), 0),
          description: 'Official INVICTUS season archive with season-specific fixtures, results, standings, and awards.',
        };
      });
      setSeasons(records);
    };
    loadSeasons();
  }, []);

  const filteredSeasons = selectedStatus === 'all'
    ? seasons
    : seasons.filter((s) => s.status.toLowerCase() === selectedStatus.toLowerCase());

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <History className="w-3.5 h-3.5" /> League History & Hall of Champions
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">
            SEASONS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">ARCHIVE</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse active season milestones, past title winners, and historical league records.
          </p>
        </div>

        {/* STATUS FILTER TABS */}
        <div className="flex items-center gap-2 bg-[#12141c] p-1.5 rounded-xl border border-gray-800">
          {['all', 'active', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                selectedStatus === status
                  ? 'bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#181a24]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* SEASONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSeasons.map((season) => (
          <div
            key={season.id}
            className="bg-[#12141c] border border-gray-800 hover:border-[#d4af37]/50 rounded-2xl p-6 space-y-5 transition duration-300 relative overflow-hidden group flex flex-col justify-between"
          >
            {/* TOP ACCENT LINE */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-0 group-hover:opacity-100 transition" />

            <div className="space-y-4">
              {/* CARD HEADER */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border mb-2 ${
                      season.status === 'Active'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    ● {season.status}
                  </span>
                  <h2 className="text-xl font-black text-white uppercase tracking-wide group-hover:text-[#d4af37] transition">
                    {season.name}
                  </h2>
                </div>

                <div className="p-3 rounded-xl bg-[#181a24] border border-gray-800 text-[#d4af37]">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {season.description}
              </p>

              {/* CHAMPIONS / RUNNER UP DISPLAY */}
              {season.status === 'Completed' ? (
                <div className="p-3 bg-[#181a24] rounded-xl border border-[#d4af37]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                      🥇 Champion:
                    </span>
                    <strong className="text-[#d4af37] font-black">{season.championName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-gray-800/80 pt-1.5">
                    <span className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                      🥈 Runner-Up:
                    </span>
                    <strong className="text-gray-300 font-bold">{season.runnerUpName}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#181a24] rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" /> Season in Progress
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">{season.startDate} - {season.endDate}</span>
                </div>
              )}

              {/* STATS MATRIX */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-[#181a24] rounded-xl border border-gray-800/80 space-y-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Matches</span>
                  <span className="text-sm font-black text-white">{season.totalMatches} Logged</span>
                </div>

                <div className="p-2.5 bg-[#181a24] rounded-xl border border-gray-800/80 space-y-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Goals</span>
                  <span className="text-sm font-black text-[#d4af37]">{season.totalGoals} Scored</span>
                </div>
              </div>
            </div>

            {/* CARD FOOTER BUTTON */}
            <div className="pt-4 border-t border-gray-800/80 mt-4 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-bold uppercase">
                {season.startDate} - {season.endDate}
              </span>

              <Link
                href="/rankings"
                className="inline-flex items-center gap-1 text-xs font-black text-[#d4af37] hover:text-[#f3e5ab] transition uppercase tracking-wider"
              >
                View Standings <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}