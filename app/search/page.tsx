'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search as SearchIcon, 
  Users, 
  Shield, 
  Swords, 
  Trophy, 
  ChevronRight, 
  X 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// TYPES
interface SearchPlayer {
  id: string;
  name: string;
  points: number;
  matches_played: number;
}

interface SearchMatch {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number;
  away_score: number;
  competition_type?: string;
  created_at: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'players' | 'matches'>('all');
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!query.trim()) {
      setPlayers([]);
      setMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      if (supabase) {
        // Search Players
        const { data: playerData } = await supabase
          .from('players')
          .select('id, name, points, matches_played')
          .ilike('name', `%${query}%`)
          .limit(10);

        // Search Matches
        const { data: matchData } = await supabase
          .from('matches')
          .select('*')
          .or(`home_player_id.ilike.%${query}%,away_player_id.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (playerData) setPlayers(playerData);
        if (matchData) setMatches(matchData);
      }

      setLoading(false);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults = players.length + matches.length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* HEADER & SEARCH BAR */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider">
          <SearchIcon className="w-3.5 h-3.5" /> Global League Search
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">
          SEARCH <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">INVICTUS</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          Find players, head-to-head match records, and competitive statistics across all tournaments.
        </p>

        {/* LARGE SEARCH INPUT */}
        <div className="relative max-w-2xl mx-auto pt-2">
          <SearchIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type player name or team..."
            className="w-full bg-[#12141c] border-2 border-[#d4af37]/40 focus:border-[#d4af37] rounded-2xl pl-12 pr-12 py-3.5 text-sm font-medium text-white placeholder-gray-500 focus:outline-none shadow-lg shadow-[#d4af37]/5 transition"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* FILTER TABS */}
      {query.trim() && (
        <div className="flex items-center justify-center gap-2 border-b border-gray-800 pb-4">
          {[
            { id: 'all', label: `All Results (${totalResults})` },
            { id: 'players', label: `Players (${players.length})` },
            { id: 'matches', label: `Matches (${matches.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                activeTab === tab.id
                  ? 'bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20'
                  : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-500">Searching records...</div>
      ) : !query.trim() ? (
        <div className="py-16 text-center space-y-3 bg-[#12141c] border border-gray-800 rounded-2xl">
          <SearchIcon className="w-8 h-8 text-[#d4af37]/40 mx-auto" />
          <p className="text-xs font-bold text-gray-400">Enter a query above to start searching.</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="py-16 text-center space-y-2 bg-[#12141c] border border-gray-800 rounded-2xl">
          <p className="text-sm font-bold text-gray-300">No matching records found for "{query}".</p>
          <p className="text-xs text-gray-500">Try searching for a different player name.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* PLAYERS SECTION */}
          {(activeTab === 'all' || activeTab === 'players') && players.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" /> Players ({players.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((player) => (
                  <Link
                    key={player.id}
                    href="/players"
                    className="p-4 bg-[#12141c] border border-gray-800 hover:border-[#d4af37]/50 rounded-xl flex items-center justify-between group transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#181a24] border border-[#d4af37]/30 flex items-center justify-center font-black text-[#d4af37] text-xs">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-[#d4af37] transition">
                          {player.name}
                        </p>
                        <p className="text-[10px] text-gray-500">{player.matches_played || 0} Matches Played</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-[#d4af37]">{player.points || 0} PTS</span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* MATCHES SECTION */}
          {(activeTab === 'all' || activeTab === 'matches') && matches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4" /> Matches ({matches.length})
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="p-4 bg-[#12141c] border border-gray-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-gray-200 uppercase truncate max-w-[120px]">
                      {match.home_player_id}
                    </span>

                    <div className="px-3 py-1 bg-[#181a24] border border-[#d4af37]/30 rounded-lg font-black text-[#d4af37] text-sm">
                      {match.home_score} - {match.away_score}
                    </div>

                    <span className="font-bold text-gray-200 uppercase truncate max-w-[120px] text-right">
                      {match.away_player_id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}