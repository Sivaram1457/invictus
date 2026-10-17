'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Trophy, Award, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { filterMatchesBySeason } from '@/lib/season';

interface Player {
  id: string;
  name: string;
  avatar_url?: string;
  profile_photo?: string;
  trophies?: string[];
}

interface Match {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number;
  away_score: number;
  competition_type: string;
  season_id?: string;
}

interface MVPStats {
  id?: string;
  name: string;
  avatar?: string;
  points: number;
  wins: number;
  goals: number;
  trophies: string[];
}

export default function BallonDorPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const getParticipantNames = (value: string) => value
    .split(/\s*\/\s*/)
    .map((name) => name.replace(/\s*\([^)]*\)/g, '').trim())
    .filter(Boolean);

  // Live Fetch & Realtime Sync Subscription
  useEffect(() => {
    fetchLiveData();

    if (!supabase) return;

    // Realtime channel subscription for instant viewer updates when admin submits a match or awards a trophy
    const channel = supabase
      .channel('public-ballondor-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchLiveData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchLiveData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveData = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data: playerData } = await supabase.from('players').select('*');
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('status', 'Active').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: matchData } = await supabase.from('matches').select('*').eq('season_id', activeSeason?.id || '');

    if (playerData) setPlayers(playerData);
    if (matchData) setMatches(filterMatchesBySeason(matchData, activeSeason?.id || null));
    setLoading(false);
  };

  // Compute Live Ballon d'Or Standings
  const calculateBallonDorRace = (): MVPStats[] => {
    const statsMap: Record<string, MVPStats> = {};

    // Initialize all registered players
    players.forEach((p) => {
      statsMap[p.name.trim().toLowerCase()] = {
        id: p.id,
        name: p.name,
        avatar: p.avatar_url || p.profile_photo,
        points: 0,
        wins: 0,
        goals: 0,
        trophies: p.trophies || [],
      };
    });

    // Process scores across all live competition matches (including 2v2 Duo splits)
    matches.forEach((m) => {
      const homeNames = getParticipantNames(m.home_player_id);
      const awayNames = getParticipantNames(m.away_player_id);

      homeNames.forEach((hName) => {
        const key = hName.trim().toLowerCase();
        if (!statsMap[key]) {
          statsMap[key] = { name: hName, points: 0, wins: 0, goals: 0, trophies: [] };
        }
        statsMap[key].goals += m.home_score;
        if (m.home_score > m.away_score) {
          statsMap[key].points += 3;
          statsMap[key].wins += 1;
        } else if (m.home_score === m.away_score) {
          statsMap[key].points += 1;
        }
      });

      awayNames.forEach((aName) => {
        const key = aName.trim().toLowerCase();
        if (!statsMap[key]) {
          statsMap[key] = { name: aName, points: 0, wins: 0, goals: 0, trophies: [] };
        }
        statsMap[key].goals += m.away_score;
        if (m.away_score > m.home_score) {
          statsMap[key].points += 3;
          statsMap[key].wins += 1;
        } else if (m.home_score === m.away_score) {
          statsMap[key].points += 1;
        }
      });
    });

    return Object.values(statsMap).sort(
      (a, b) => b.points - a.points || b.wins - a.wins || b.goals - a.goals
    );
  };

  const rankings = calculateBallonDorRace();

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-amber-500/30 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              <h1 className="text-3xl font-black text-amber-400 tracking-wider uppercase">
                BALLON D'OR RACE 2026
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Live Season MVP Power Rankings & Official Trophy Cabinets
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Sync Active
            </span>
            <button
              onClick={fetchLiveData}
              className="p-2 bg-[#12141c] hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 transition"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* TOP 3 PODIUM DISPLAY */}
        {rankings.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 2nd Place */}
            <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-3 md:mt-6 shadow-xl">
              <span className="text-2xl">🥈</span>
              <span className="text-xs font-bold text-gray-400 uppercase">2nd Place Candidate</span>
              <h3 className="text-lg font-black text-white uppercase">{rankings[1].name}</h3>
              <div className="text-xs text-amber-400 font-extrabold">{rankings[1].points} PTS • {rankings[1].goals} Goals</div>
            </div>

            {/* 1st Place / Leader */}
            <div className="bg-gradient-to-b from-amber-500/20 to-[#12141c] border-2 border-amber-500 p-6 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-2xl relative">
              <div className="absolute -top-3 px-3 py-0.5 bg-amber-500 text-black font-black text-[10px] rounded-full uppercase">
                Current Favorite
              </div>
              <Sparkles className="w-8 h-8 text-amber-400 mt-2" />
              <h3 className="text-xl font-black text-amber-300 uppercase">{rankings[0].name}</h3>
              <div className="text-sm text-amber-400 font-extrabold">{rankings[0].points} PTS • {rankings[0].goals} Goals</div>
              {rankings[0].trophies.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                  {rankings[0].trophies.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3rd Place */}
            <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-3 md:mt-6 shadow-xl">
              <span className="text-2xl">🥉</span>
              <span className="text-xs font-bold text-gray-400 uppercase">3rd Place Candidate</span>
              <h3 className="text-lg font-black text-white uppercase">{rankings[2].name}</h3>
              <div className="text-xs text-amber-400 font-extrabold">{rankings[2].points} PTS • {rankings[2].goals} Goals</div>
            </div>
          </div>
        )}

        {/* FULL LIVE RANKINGS TABLE & PLAYER TROPHY DIRECTORY */}
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-3">
            <Trophy className="w-4 h-4 text-amber-400" /> Season MVP Power Rankings & Player Trophy Cabinets
          </h2>

          <div className="space-y-3">
            {rankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                No players or match data available for current Ballon d'Or evaluation.
              </div>
            ) : (
              rankings.map((player, idx) => (
                <div
                  key={player.name}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#181a24] border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-base font-black w-6 text-center ${
                        idx === 0
                          ? 'text-amber-400'
                          : idx === 1
                          ? 'text-gray-300'
                          : idx === 2
                          ? 'text-amber-700'
                          : 'text-gray-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-10 h-10 rounded-xl object-cover border border-amber-500/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#12141c] border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-1">
                      <h4 className="font-bold text-white uppercase text-sm flex items-center gap-2">
                        {player.name}
                        {idx === 0 && <span className="text-xs">👑</span>}
                      </h4>

                      {/* PLAYER TROPHY CABINET DISPLAY */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {player.trophies && player.trophies.length > 0 ? (
                          player.trophies.map((trophy, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[9px] font-black uppercase shadow-sm flex items-center gap-1"
                            >
                              <Award className="w-2.5 h-2.5 text-amber-400" />
                              {trophy}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-600 italic">No official trophies awarded yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STATS BREAKDOWN */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-gray-800 pt-2 md:pt-0">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Wins</p>
                      <p className="text-sm font-black text-emerald-400">{player.wins}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Goals</p>
                      <p className="text-sm font-black text-blue-400">{player.goals}</p>
                    </div>

                    <div className="text-center bg-[#12141c] px-3 py-1.5 rounded-lg border border-amber-500/30">
                      <p className="text-[10px] text-amber-400 uppercase font-extrabold">Points</p>
                      <p className="text-base font-black text-amber-400">{player.points}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}