'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Trophy, 
  Swords, 
  Users, 
  Shield, 
  Award, 
  ArrowRight, 
  TrendingUp, 
  Flame,
  ChevronRight,
  Sparkles,
  Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { filterMatchesBySeason } from '@/lib/season';

// TYPES
interface Player {
  id: string;
  name: string;
  team_id?: string;
  points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  trophies?: string[];
}

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number;
  away_score: number;
  created_at: string;
  season_id?: string;
}

export default function Home() {
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      if (supabase) {
        // Fetch top 5 ranked players
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .order('points', { ascending: false })
          .limit(5);

        const [{ data: activeSeason }, { data: teamData }] = await Promise.all([
          supabase.from('seasons').select('id').eq('status', 'Active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('teams').select('id, name'),
        ]);
        const { data: matches } = await supabase
          .from('matches')
          .select('*')
          .eq('season_id', activeSeason?.id || '')
          .order('created_at', { ascending: false })
          .limit(4);

        if (players) setTopPlayers(players);
        if (teamData) setTeams(teamData);
        if (matches) setRecentMatches(filterMatchesBySeason(matches, activeSeason?.id || null));
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12">
      
      {/* 1. HERO SECTION WITH LOGO BRANDING */}
      <section className="relative rounded-3xl bg-gradient-to-r from-[#12141c] via-[#181a24] to-[#0b0c10] border border-[#d4af37]/30 p-8 md:p-12 overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.08)]">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            {/* BRAND LOGO / SHIELD EMBLEM */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa7c11] flex items-center justify-center shadow-lg shadow-[#d4af37]/20 border border-[#f3e5ab]/40">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-widest">
              <Flame className="w-4 h-4 text-[#d4af37]" /> Official eFootball Competitive Hub
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight uppercase">
            VICTORY IS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">INEVITABLE</span>
          </h1>

          <p className="text-sm md:text-base text-gray-300 font-medium leading-relaxed">
            Welcome to <strong className="text-white">INVICTUS</strong> — the home of top-tier eFootball competition. Track official rankings, live Ballon d'Or MVP races, tournament fixtures, and player trophy cabinets in real time.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/rankings"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] hover:from-[#b59228] hover:to-[#8c650d] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-[#d4af37]/20"
            >
              <Trophy className="w-4 h-4" /> View Leaderboard <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              href="/hall-of-fame"
              className="px-6 py-3.5 rounded-xl bg-[#181a24] hover:bg-[#202330] border border-[#d4af37]/40 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-sm"
            >
              <Crown className="w-4 h-4 text-[#d4af37]" /> Hall of Fame & Ballon d'Or
            </Link>
          </div>
        </div>
      </section>

      {/* 2. STATS & CATEGORIES HIGHLIGHT GRID */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/competitions" className="p-5 bg-[#12141c] border border-gray-800/80 rounded-2xl space-y-2 hover:border-[#d4af37]/40 transition block group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tournament Leagues</span>
            <Trophy className="w-5 h-5 text-[#d4af37] group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-black text-white">League & UCL</p>
          <p className="text-[11px] text-gray-500 font-medium">Standard Points & Tiebreakers</p>
        </Link>

        <Link href="/players" className="p-5 bg-[#12141c] border border-gray-800/80 rounded-2xl space-y-2 hover:border-[#d4af37]/40 transition block group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Roster</span>
            <Users className="w-5 h-5 text-[#d4af37] group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-black text-white">Elite Players</p>
          <p className="text-[11px] text-gray-500 font-medium">Verified eFootball Accounts</p>
        </Link>

        <Link href="/teams" className="p-5 bg-[#12141c] border border-gray-800/80 rounded-2xl space-y-2 hover:border-[#d4af37]/40 transition block group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Team Squads</span>
            <Shield className="w-5 h-5 text-[#d4af37] group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-black text-white">8 Players Max</p>
          <p className="text-[11px] text-gray-500 font-medium">Strict Squad Roster Cap</p>
        </Link>

        <Link href="/trophies" className="p-5 bg-[#12141c] border border-gray-800/80 rounded-2xl space-y-2 hover:border-[#d4af37]/40 transition block group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Hall of Fame</span>
            <Award className="w-5 h-5 text-[#d4af37] group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-black text-white">Ballon d'Or</p>
          <p className="text-[11px] text-gray-500 font-medium">Trophy Cabinets & Archives</p>
        </Link>
      </section>

      {/* 3. LEADERBOARD & RECENT MATCHES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEADERBOARD PREVIEW (2 Columns) */}
        <div className="lg:col-span-2 bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                Top Standings Overview
              </h2>
            </div>
            <Link
              href="/rankings"
              className="text-xs font-bold text-[#d4af37] hover:underline flex items-center gap-1"
            >
              Full Rankings <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading standings...</div>
          ) : topPlayers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-gray-400 font-semibold">No active player standings recorded yet.</p>
              <p className="text-xs text-gray-600">Register players and submit scores via the Admin Portal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {topPlayers.map((player) => {
                const playerTrophies = player.trophies || [];
                const teamName = teams.find((team) => team.id === player.team_id)?.name || 'Free Agent';

                return (
                  <Link
                    key={player.id}
                    href={`/players?player=${encodeURIComponent(player.id)}`}
                    className="bg-[#181a24] border border-gray-800/80 hover:border-[#d4af37]/50 rounded-xl p-4 space-y-3 transition block"
                  >
                    <div>
                      <h3 className="font-black text-white uppercase truncate">{player.name}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{teamName}</p>
                    </div>
                    <div className="border-t border-gray-800/80 pt-3">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Trophies Won</span>
                      {playerTrophies.length === 0 ? (
                        <p className="text-[10px] text-gray-600 italic mt-1">No trophies yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {playerTrophies.map((trophy) => (
                            <span key={trophy} title={trophy} className="inline-flex items-center gap-1 px-2 py-1 bg-[#12141c] border border-[#d4af37]/30 text-[#d4af37] rounded text-[9px] font-bold max-w-full">
                              <Award className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{trophy}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT MATCH RESULTS (1 Column) */}
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                Recent Results
              </h2>
            </div>
            <Link
              href="/matches"
              className="text-xs font-bold text-[#d4af37] hover:underline flex items-center gap-1"
            >
              All Matches <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading matches...</div>
          ) : recentMatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No recent match scores available.
            </div>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-3.5 bg-[#181a24] border border-gray-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-gray-200 truncate max-w-[90px]">
                    {match.home_player_id}
                  </span>
                  
                  <div className="px-3 py-1 bg-[#12141c] border border-[#d4af37]/30 rounded-lg font-black text-[#d4af37] tracking-widest text-sm">
                    {match.home_score} - {match.away_score}
                  </div>

                  <span className="font-bold text-gray-200 truncate max-w-[90px] text-right">
                    {match.away_player_id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}