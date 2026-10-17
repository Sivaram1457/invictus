'use client';

import { useEffect, useState } from 'react';
import { Trophy, Flame, Shield, Users, Medal, Crown, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { filterMatchesBySeason } from '@/lib/season';

interface Player {
  id: string;
  name: string;
  team_id?: string;
  goals_for: number;
  goals_against: number;
  points: number;
  wins: number;
  matches_played: number;
  avatar_url?: string;
  profile_photo?: string;
  trophies?: string[];
}

interface Team {
  id: string;
  name: string;
  short_code: string;
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
  trophies?: string[];
}

export default function TrophiesPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedComp, setSelectedComp] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const getParticipantNames = (value: string) => value
    .split(/\s*\/\s*/)
    .map((name) => name.replace(/\s*\([^)]*\)/g, '').trim())
    .filter(Boolean);

  // FETCH ALL REALTIME DATA
  const fetchTrophyData = async () => {
    if (!supabase) return;

    const { data: playerData } = await supabase.from('players').select('*');
    const { data: teamData } = await supabase.from('teams').select('*');
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('status', 'Active').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data: matchData } = await supabase.from('matches').select('*').eq('season_id', activeSeason?.id || '');

    if (playerData) setPlayers(playerData);
    if (teamData) setTeams(teamData);
    if (matchData) setMatches(filterMatchesBySeason(matchData, activeSeason?.id || null));
    setLoading(false);
  };

  useEffect(() => {
    fetchTrophyData();

    if (!supabase) return;

    // REALTIME DATABASE SUBSCRIPTION
    const channel = supabase
      .channel('trophies-competition-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchTrophyData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTrophyData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchTrophyData())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // FILTER MATCHES BY COMPETITION TYPE
  const filteredMatches = selectedComp === 'ALL' 
    ? matches 
    : matches.filter((m) => (m.competition_type || 'LEAGUE').toUpperCase() === selectedComp);

  // COMPUTE COMPETITION-SPECIFIC STATS DYNAMICALLY
  const computeCompStats = () => {
    const playerStatsMap: Record<string, { name: string; goalsFor: number; goalsAgainst: number; points: number; matchesPlayed: number; avatarUrl?: string }> = {};

    players.forEach((p) => {
      playerStatsMap[p.name] = {
        name: p.name,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        matchesPlayed: 0,
        avatarUrl: p.avatar_url || p.profile_photo,
      };
    });

    filteredMatches.forEach((m) => {
      getParticipantNames(m.home_player_id).forEach((name) => {
        if (!playerStatsMap[name]) return;
        playerStatsMap[name].goalsFor += m.home_score;
        playerStatsMap[name].goalsAgainst += m.away_score;
        playerStatsMap[name].matchesPlayed += 1;
        if (m.home_score > m.away_score) playerStatsMap[name].points += 3;
        else if (m.home_score === m.away_score) playerStatsMap[name].points += 1;
      });

      getParticipantNames(m.away_player_id).forEach((name) => {
        if (!playerStatsMap[name]) return;
        playerStatsMap[name].goalsFor += m.away_score;
        playerStatsMap[name].goalsAgainst += m.home_score;
        playerStatsMap[name].matchesPlayed += 1;
        if (m.away_score > m.home_score) playerStatsMap[name].points += 3;
        else if (m.home_score === m.away_score) playerStatsMap[name].points += 1;
      });
    });

    const calculatedPlayers = Object.values(playerStatsMap);

    // 1. INDIVIDUAL AWARDS PER COMPETITION
    const topScorer = [...calculatedPlayers].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const topDefender = [...calculatedPlayers].filter((p) => p.matchesPlayed > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
    const tournamentMvp = [...calculatedPlayers].sort((a, b) => b.points - a.points)[0];

    // 2. TEAM TROPHY PER COMPETITION
    const teamStats = teams.map((team) => {
      const teamRosterNames = players.filter((p) => p.team_id === team.id).map((p) => p.name);
      const totalPoints = calculatedPlayers.filter((p) => teamRosterNames.includes(p.name)).reduce((sum, p) => sum + p.points, 0);
      const totalGoals = calculatedPlayers.filter((p) => teamRosterNames.includes(p.name)).reduce((sum, p) => sum + p.goalsFor, 0);

      return {
        ...team,
        totalPoints,
        totalGoals,
        playerCount: teamRosterNames.length,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalGoals - a.totalGoals)[0];

    return { topScorer, topDefender, tournamentMvp, winningTeam: teamStats };
  };

  const { topScorer, topDefender, tournamentMvp, winningTeam } = computeCompStats();

  // COMPUTE BALLON D'OR RACE (GLOBAL SEASON MVP)
  const calculateBallonDorRace = (): MVPStats[] => {
    const statsMap: Record<string, MVPStats> = {};

    players.forEach((p) => {
      statsMap[p.name.trim().toLowerCase()] = {
        id: p.id,
        name: p.name,
        avatar: p.avatar_url || p.profile_photo,
        points: 0,
        wins: 0,
        goals: 0,
      };
    });

    matches.forEach((m) => {
      const homeNames = getParticipantNames(m.home_player_id);
      const awayNames = getParticipantNames(m.away_player_id);

      homeNames.forEach((hName) => {
        const key = hName.trim().toLowerCase();
        if (!statsMap[key]) statsMap[key] = { name: hName, points: 0, wins: 0, goals: 0 };
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
        if (!statsMap[key]) statsMap[key] = { name: aName, points: 0, wins: 0, goals: 0 };
        statsMap[key].goals += m.away_score;
        if (m.away_score > m.home_score) {
          statsMap[key].points += 3;
          statsMap[key].wins += 1;
        } else if (m.home_score === m.away_score) {
          statsMap[key].points += 1;
        }
      });
    });

    return Object.values(statsMap).sort((a, b) => b.points - a.points || b.wins - a.wins || b.goals - a.goals);
  };

  const ballonDorRankings = calculateBallonDorRace();
  const uclAchievements = players.flatMap((player) => (player.trophies || [])
    .filter((trophy) => trophy.includes('UCL Champion') || trophy.includes('UCL Runner-up'))
    .map((trophy) => ({ player, trophy })));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5" /> Official Competition Trophy Cabinet
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            HALL OF <span className="text-[#d4af37]">FAME</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Separated trophy cabinets, individual honors, and live Ballon d'Or tracking.
          </p>
        </div>

        {/* REALTIME SYNC BADGE */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#12141c] border border-gray-800 rounded-xl text-xs font-bold">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className={isLive ? 'text-emerald-400' : 'text-amber-400'}>
            {isLive ? 'LIVE AUTO-SYNC' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* NEW: LIVE BALLON D'OR RACE SECTION */}
      <div className="bg-[#12141c] border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4 mb-4">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">
            Live Ballon d'Or Race
          </h2>
          <span className="ml-2 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] rounded font-bold uppercase">
            Global Season MVP
          </span>
        </div>
        
        {loading ? (
          <div className="h-24 flex items-center justify-center text-amber-500/50 text-xs font-bold uppercase animate-pulse">Loading Leaderboard...</div>
        ) : ballonDorRankings.length === 0 ? (
           <p className="text-xs text-gray-500 py-4 text-center">No match data available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ballonDorRankings.slice(0, 3).map((player, idx) => (
              <div key={player.name} className={`flex items-center gap-4 p-4 rounded-xl border ${
                idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-[#181a24] border-amber-500/50' : 'bg-[#181a24] border-gray-800'
              }`}>
                <span className={`text-xl font-black ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : 'text-amber-700'}`}>
                  #{idx + 1}
                </span>
                
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/30" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#12141c] border-2 border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                <div>
                  <h4 className="font-bold text-white uppercase text-sm flex items-center gap-2">
                    {player.name}
                    {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  </h4>
                  <div className="text-[10px] font-bold text-gray-400 flex gap-2 mt-0.5">
                    <span className="text-amber-400">{player.points} PTS</span>
                    <span className="text-emerald-400">{player.wins} W</span>
                    <span className="text-blue-400">{player.goals} G</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPETITION CATEGORY FILTER TABS */}
      <div className="flex flex-wrap gap-2 bg-[#12141c] p-2 rounded-2xl border border-gray-800 mt-8">
        {[
          { id: 'ALL', label: 'All Competitions' },
          { id: 'LEAGUE', label: 'Invictus Premier League' },
          { id: 'UCL', label: 'UEFA Champions League (UCL)' },
          { id: 'WEEKLY', label: 'Weekly Tournament Blitz' },
          { id: 'DUO', label: 'Duo Cup (2v2)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedComp(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition uppercase ${
              selectedComp === tab.id
                ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 font-black'
                : 'text-gray-400 hover:text-white hover:bg-[#181a24]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[#12141c] border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <Crown className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">Saved UCL Champions & Finalists</h2>
        </div>
        {uclAchievements.length === 0 ? (
          <p className="text-xs text-gray-500">No completed UCL final has been awarded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uclAchievements.map(({ player, trophy }) => (
              <div key={`${player.id}-${trophy}`} className="bg-[#181a24] border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                <span className="font-bold text-white uppercase text-xs">{player.name}</span>
                <span className="text-[10px] font-black text-amber-300 uppercase text-right">{trophy}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. COMPETITION TEAM CHAMPION TROPHY */}
          <div className="bg-[#12141c] border border-[#d4af37]/60 hover:border-[#d4af37] rounded-2xl p-6 space-y-4 shadow-xl transition relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] rounded-full">
                {selectedComp} Team Champion
              </span>
              <Crown className="w-6 h-6 text-[#d4af37]" />
            </div>

            <div className="text-center space-y-3 py-2">
              <div className="w-20 h-20 rounded-2xl bg-[#181a24] border-2 border-[#d4af37] mx-auto flex items-center justify-center overflow-hidden shadow-lg">
                <span className="font-black text-2xl text-[#d4af37]">
                  {winningTeam?.short_code || 'TM'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">{winningTeam?.name || 'No Champion'}</h3>
                <p className="text-xs text-[#d4af37] font-extrabold mt-0.5">
                  {winningTeam?.totalPoints || 0} Tournament Points
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 text-center">
              <span className="text-[11px] text-gray-500 font-bold uppercase">
                {selectedComp === 'ALL' ? 'Overall Team Winner' : `${selectedComp} Team Trophy Holder`}
              </span>
            </div>
          </div>

          {/* 2. TOURNAMENT MVP / INDIVIDUAL CHAMPION */}
          <div className="bg-[#12141c] border border-blue-500/40 hover:border-blue-500 rounded-2xl p-6 space-y-4 shadow-xl transition relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-full">
                {selectedComp} MVP
              </span>
              <Trophy className="w-6 h-6 text-blue-400" />
            </div>

            <div className="text-center space-y-3 py-2">
              <div className="w-20 h-20 rounded-2xl bg-[#181a24] border-2 border-blue-400 mx-auto flex items-center justify-center overflow-hidden shadow-lg">
                {tournamentMvp?.avatarUrl ? (
                  <img src={tournamentMvp.avatarUrl} alt={tournamentMvp.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-2xl text-blue-400">
                    {tournamentMvp?.name ? tournamentMvp.name.substring(0, 2).toUpperCase() : 'NA'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">{tournamentMvp?.name || 'Unassigned'}</h3>
                <p className="text-xs text-blue-400 font-bold mt-0.5">{tournamentMvp?.points || 0} Points Scored</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 text-center">
              <span className="text-[11px] text-gray-500 font-bold uppercase">
                Individual Title Holder
              </span>
            </div>
          </div>

          {/* 3. COMPETITION GOLDEN BOOT */}
          <div className="bg-[#12141c] border border-amber-500/40 hover:border-amber-500 rounded-2xl p-6 space-y-4 shadow-xl transition relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-full">
                Golden Boot
              </span>
              <Flame className="w-6 h-6 text-amber-400" />
            </div>

            <div className="text-center space-y-3 py-2">
              <div className="w-20 h-20 rounded-2xl bg-[#181a24] border-2 border-amber-400 mx-auto flex items-center justify-center overflow-hidden shadow-lg">
                {topScorer?.avatarUrl ? (
                  <img src={topScorer.avatarUrl} alt={topScorer.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-2xl text-amber-400">
                    {topScorer?.name ? topScorer.name.substring(0, 2).toUpperCase() : 'NA'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">{topScorer?.name || 'Unassigned'}</h3>
                <p className="text-xs text-amber-400 font-extrabold mt-0.5">{topScorer?.goalsFor || 0} Goals Scored</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 text-center">
              <span className="text-[11px] text-gray-500 font-bold uppercase">
                Top Goalscorer Award
              </span>
            </div>
          </div>

          {/* 4. COMPETITION GOLDEN GLOVE */}
          <div className="bg-[#12141c] border border-emerald-500/40 hover:border-emerald-500 rounded-2xl p-6 space-y-4 shadow-xl transition relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full">
                Golden Glove
              </span>
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="text-center space-y-3 py-2">
              <div className="w-20 h-20 rounded-2xl bg-[#181a24] border-2 border-emerald-400 mx-auto flex items-center justify-center overflow-hidden shadow-lg">
                {topDefender?.avatarUrl ? (
                  <img src={topDefender.avatarUrl} alt={topDefender.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-2xl text-emerald-400">
                    {topDefender?.name ? topDefender.name.substring(0, 2).toUpperCase() : 'NA'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase">{topDefender?.name || 'Unassigned'}</h3>
                <p className="text-xs text-emerald-400 font-extrabold mt-0.5">
                  {topDefender?.goalsAgainst || 0} Goals Conceded
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 text-center">
              <span className="text-[11px] text-gray-500 font-bold uppercase">
                Best Defense Award
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}