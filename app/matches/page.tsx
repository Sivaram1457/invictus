'use client';

import { useState, useEffect } from 'react';
import { 
  Swords, 
  Calendar, 
  Filter, 
  Trophy, 
  Search, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { filterMatchesBySeason, SeasonOption, UNASSIGNED_SEASON_ID } from '@/lib/season';

// TYPES
interface Match {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number;
  away_score: number;
  competition_type?: string;
  season_id?: string;
  created_at: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComp, setSelectedComp] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  useEffect(() => {
    async function fetchMatches() {
      if (supabase) {
        const [{ data, error }, { data: seasonData }] = await Promise.all([
          supabase.from('matches').select('*').order('created_at', { ascending: false }),
          supabase.from('seasons').select('id, name, status').order('created_at', { ascending: false }),
        ]);

        if (!error && data) {
          setMatches(data);
        }
        if (seasonData) {
          setSeasons([
            ...seasonData,
            { id: UNASSIGNED_SEASON_ID, name: 'Legacy Match Records', status: 'Archived' },
          ]);
          setSelectedSeasonId(seasonData.find((season) => season.status === 'Active')?.id || seasonData[0]?.id || '');
        }
      }
      setLoading(false);
    }

    fetchMatches();
  }, []);

  // FILTER MATCHES BY COMPETITION AND PLAYER SEARCH
  const seasonMatches = filterMatchesBySeason(matches, selectedSeasonId);
  const filteredMatches = seasonMatches.filter((match) => {
    const matchComp = (match.competition_type || 'LEAGUE').toUpperCase();
    const matchesFilter = selectedComp === 'all' || matchComp === selectedComp.toUpperCase();

    const home = (match.home_player_id || '').toLowerCase();
    const away = (match.away_player_id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = home.includes(query) || away.includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <Swords className="w-3.5 h-3.5" /> Match Fixtures & Official Results
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">
            MATCH <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">LOGS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Historical head-to-head match outcomes, goal tallies, and competition filters.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12141c] border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
          />
        </div>
        <select value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)} className="bg-[#12141c] border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-[#d4af37]">
          {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.status === 'Active' ? ' — Current Season' : ' — Archived'}</option>)}
        </select>
      </div>

      {/* COMPETITION CATEGORY TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-800/80 pb-4">
        {[
          { id: 'all', label: 'All Matches' },
          { id: 'league', label: 'League Matches' },
          { id: 'ucl', label: 'UCL' },
          { id: 'weekly', label: 'Weekly Cup' },
          { id: 'duo', label: '2v2 Duo' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedComp(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              selectedComp === tab.id
                ? 'bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20'
                : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MATCH RESULTS DISPLAY */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-500">Loading match logs...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="py-20 text-center space-y-2 bg-[#12141c] border border-gray-800 rounded-2xl">
          <p className="text-sm font-bold text-gray-300">No match records found.</p>
          <p className="text-xs text-gray-500">Log new matches via the Admin Panel to populate this list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((match) => {
            const isHomeWinner = match.home_score > match.away_score;
            const isAwayWinner = match.away_score > match.home_score;
            const isDraw = match.home_score === match.away_score;

            const dateStr = match.created_at 
              ? new Date(match.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recent Match';

            return (
              <div
                key={match.id}
                className="p-5 bg-[#12141c] border border-gray-800 hover:border-[#d4af37]/40 rounded-2xl space-y-4 transition group"
              >
                {/* CARD HEADER */}
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181a24] text-[10px] font-black uppercase text-[#d4af37] border border-[#d4af37]/20">
                    <Trophy className="w-3 h-3" /> {match.competition_type || 'League'}
                  </span>
                  
                  <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" /> {dateStr}
                  </span>
                </div>

                {/* MATCH SCORE ROW */}
                <div className="flex items-center justify-between gap-2 py-2">
                  
                  {/* HOME PLAYER */}
                  <div className="flex-1 text-left space-y-1">
                    <p className={`text-sm font-black uppercase truncate ${isHomeWinner ? 'text-[#d4af37]' : 'text-white'}`}>
                      {match.home_player_id}
                    </p>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Home</span>
                  </div>

                  {/* SCORE BADGE */}
                  <div className="px-4 py-2 bg-[#181a24] border border-[#d4af37]/40 rounded-xl text-center shadow-inner">
                    <span className="text-xl font-black text-[#d4af37] tracking-widest">
                      {match.home_score} - {match.away_score}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase block mt-0.5">
                      {isDraw ? 'DRAW' : 'FT'}
                    </span>
                  </div>

                  {/* AWAY PLAYER */}
                  <div className="flex-1 text-right space-y-1">
                    <p className={`text-sm font-black uppercase truncate ${isAwayWinner ? 'text-[#d4af37]' : 'text-white'}`}>
                      {match.away_player_id}
                    </p>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Away</span>
                  </div>

                </div>

                {/* WINNER STATUS FOOTER */}
                <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">
                    Outcome:
                  </span>
                  <span className="font-bold text-gray-200">
                    {isDraw ? (
                      <span className="text-amber-400">Match Ended in a Draw</span>
                    ) : isHomeWinner ? (
                      <span className="text-emerald-400">{match.home_player_id} Won (+3 PTS)</span>
                    ) : (
                      <span className="text-emerald-400">{match.away_player_id} Won (+3 PTS)</span>
                    )}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}