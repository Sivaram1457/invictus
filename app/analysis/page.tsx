'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Swords, 
  ShieldCheck, 
  PieChart as PieIcon, 
  Activity, 
  Trophy, 
  Target,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { supabase } from '@/lib/supabase';

// TYPES
interface PlayerStat {
  name: string;
  points: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;
  team_id?: string;
}

interface TeamStat {
  id: string;
  name: string;
  short_code: string;
  totalPoints: number;
  totalMatches: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGoalsFor: number;
  totalGoalsAgainst: number;
  playerCount: number;
  winRate: number;
}

const COLORS = ['#d4af37', '#aa7c11', '#181a24', '#3b82f6', '#10b981', '#ef4444'];

export default function AnalysisPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<TeamStat[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'players' | 'teams'>('players');

  useEffect(() => {
    async function fetchAnalytics() {
      if (supabase) {
        // Fetch Players
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .order('points', { ascending: false });

        // Fetch Teams
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*');

        if (!playerError && playerData) {
          const formattedPlayers: PlayerStat[] = playerData.map((p) => {
            const matches = p.matches_played || 0;
            const wins = p.wins || 0;
            const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

            return {
              name: p.name,
              points: p.points || 0,
              matches,
              wins,
              draws: p.draws || 0,
              losses: p.losses || 0,
              goalsFor: p.goals_for || 0,
              goalsAgainst: p.goals_against || 0,
              winRate,
              team_id: p.team_id
            };
          });
          setPlayers(formattedPlayers);

          // Aggregate Team Stats
          if (!teamError && teamData) {
            const aggregatedTeams: TeamStat[] = teamData.map((team) => {
              const teamMembers = formattedPlayers.filter(p => p.team_id === team.id);
              
              const totalMatches = teamMembers.reduce((sum, p) => sum + p.matches, 0);
              const totalWins = teamMembers.reduce((sum, p) => sum + p.wins, 0);
              
              return {
                id: team.id,
                name: team.name,
                short_code: team.short_code,
                playerCount: teamMembers.length,
                totalPoints: teamMembers.reduce((sum, p) => sum + p.points, 0),
                totalMatches,
                totalWins,
                totalDraws: teamMembers.reduce((sum, p) => sum + p.draws, 0),
                totalLosses: teamMembers.reduce((sum, p) => sum + p.losses, 0),
                totalGoalsFor: teamMembers.reduce((sum, p) => sum + p.goalsFor, 0),
                totalGoalsAgainst: teamMembers.reduce((sum, p) => sum + p.goalsAgainst, 0),
                winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0
              };
            }).sort((a, b) => b.totalPoints - a.totalPoints); // Sort teams by total points
            
            setTeams(aggregatedTeams);
          }
        }
      }
      setLoading(false);
    }

    fetchAnalytics();
  }, []);

  // AGGREGATE CALCULATIONS (Overall League)
  const totalMatches = players.reduce((sum, p) => sum + p.matches, 0) / 2;
  const totalGoals = players.reduce((sum, p) => sum + p.goalsFor, 0);
  const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '0.0';

  const filteredPlayerData = selectedPlayer === 'all' 
    ? players 
    : players.filter(p => p.name === selectedPlayer);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart2 className="w-3.5 h-3.5" /> Performance & Analytics Hub
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">
            LEAGUE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">ANALYSIS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time eFootball match statistics, goal efficiencies, and tactical win-rate breakdowns for players and teams.
          </p>
        </div>

        {/* VIEW MODE TOGGLE & PLAYER FILTER DROPDOWN */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
           <div className="flex bg-[#12141c] p-1 border border-gray-800 rounded-xl">
            <button
              onClick={() => setViewMode('players')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition ${
                viewMode === 'players' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Player Stats
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition ${
                viewMode === 'teams' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Team Stats
            </button>
          </div>

          {viewMode === 'players' && (
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="bg-[#12141c] border border-[#d4af37]/40 text-white font-bold text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Players (League View)</option>
              {players.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-[#12141c] border border-gray-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Played</span>
            <Activity className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-2xl font-black text-white">{Math.floor(totalMatches)}</p>
          <p className="text-[11px] text-gray-500">Official Matches Logged</p>
        </div>

        <div className="p-5 bg-[#12141c] border border-gray-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Goals Scored</span>
            <Target className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-2xl font-black text-white">{totalGoals}</p>
          <p className="text-[11px] text-gray-500">Across All Competitions</p>
        </div>

        <div className="p-5 bg-[#12141c] border border-gray-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Goal Ratio</span>
            <TrendingUp className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-2xl font-black text-[#d4af37]">{avgGoalsPerMatch}</p>
          <p className="text-[11px] text-gray-500">Avg Goals / Match</p>
        </div>

        <div className="p-5 bg-[#12141c] border border-gray-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Top Scorer</span>
            <Trophy className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-lg font-black text-white truncate">
            {players.length > 0 ? [...players].sort((a,b) => b.goalsFor - a.goalsFor)[0]?.name : 'N/A'}
          </p>
          <p className="text-[11px] text-gray-500">Most Lethal Attack</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-gray-500">Loading league analytical data...</div>
      ) : players.length === 0 ? (
        <div className="py-20 text-center text-gray-400 font-medium">
          No statistical data recorded yet. Submit match logs in the Admin Panel to visualize analytics.
        </div>
      ) : viewMode === 'players' ? (
        
        /* ------------------------------------------------------------- */
        /* PLAYER VIEW MODE                                              */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          
          {/* CHART 1: GOALS FOR VS GOALS AGAINST */}
          <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#d4af37]" /> Offensive vs Defensive Output
              </h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase">GF vs GA</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredPlayerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#181a24" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12141c', borderColor: '#d4af37', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="goalsFor" name="Goals For" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="goalsAgainst" name="Goals Against" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 2: WIN RATE (%) BREAKDOWN */}
          <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#d4af37]" /> Player Win Efficiency Rate (%)
              </h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Wins / Matches Ratio</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredPlayerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#181a24" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12141c', borderColor: '#d4af37', borderRadius: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="winRate" 
                    name="Win Rate %" 
                    stroke="#d4af37" 
                    strokeWidth={3} 
                    dot={{ fill: '#d4af37', r: 5 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PLAYER DATA TABLE SUMMARY */}
          <div className="lg:col-span-2 bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-3">
              <PieIcon className="w-4 h-4 text-[#d4af37]" /> Detailed Player Performance Matrix
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase">
                    <th className="pb-3 pl-2">Player</th>
                    <th className="pb-3 text-center">Played</th>
                    <th className="pb-3 text-center">W / D / L</th>
                    <th className="pb-3 text-center">GF</th>
                    <th className="pb-3 text-center">GA</th>
                    <th className="pb-3 text-center">GD</th>
                    <th className="pb-3 text-center">Win %</th>
                    <th className="pb-3 text-right pr-2">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-medium text-gray-300">
                  {filteredPlayerData.map((p) => {
                    const gd = p.goalsFor - p.goalsAgainst;
                    return (
                      <tr key={p.name} className="hover:bg-[#181a24] transition">
                        <td className="py-3 pl-2 font-bold text-white">{p.name}</td>
                        <td className="py-3 text-center">{p.matches}</td>
                        <td className="py-3 text-center">
                          <span className="text-emerald-400">{p.wins}</span> / <span className="text-amber-400">{p.draws}</span> / <span className="text-rose-400">{p.losses}</span>
                        </td>
                        <td className="py-3 text-center text-emerald-400 font-bold">{p.goalsFor}</td>
                        <td className="py-3 text-center text-rose-400">{p.goalsAgainst}</td>
                        <td className={`py-3 text-center font-bold ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                          {gd > 0 ? `+${gd}` : gd}
                        </td>
                        <td className="py-3 text-center font-bold text-[#d4af37]">{p.winRate}%</td>
                        <td className="py-3 text-right pr-2 font-black text-white text-sm">{p.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (

        /* ------------------------------------------------------------- */
        /* TEAM VIEW MODE                                                */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          
          {/* CHART 1: TEAM POINTS DISTRIBUTION (BAR) */}
          <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d4af37]" /> Team Points Standings
              </h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Total Aggregated Points</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#181a24" />
                  <XAxis dataKey="short_code" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12141c', borderColor: '#d4af37', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    cursor={{fill: '#181a24'}}
                  />
                  <Bar dataKey="totalPoints" name="Total Points" fill="#d4af37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

           {/* CHART 2: TEAM GOALS OUTPUT (LINE) */}
           <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-[#d4af37]" /> Team Goal Production
              </h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Combined GF vs GA</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={teams} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#181a24" />
                  <XAxis dataKey="short_code" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12141c', borderColor: '#d4af37', borderRadius: '12px' }}
                  />
                  <Line type="monotone" dataKey="totalGoalsFor" name="Goals For" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                  <Line type="monotone" dataKey="totalGoalsAgainst" name="Goals Against" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TEAM DATA TABLE SUMMARY */}
          <div className="lg:col-span-2 bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-[#d4af37]" /> Franchise Performance Matrix
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase">
                    <th className="pb-3 pl-2">Franchise Team</th>
                    <th className="pb-3 text-center">Roster Size</th>
                    <th className="pb-3 text-center">Matches</th>
                    <th className="pb-3 text-center">W / D / L</th>
                    <th className="pb-3 text-center">GF</th>
                    <th className="pb-3 text-center">GA</th>
                    <th className="pb-3 text-center">GD</th>
                    <th className="pb-3 text-center">Win %</th>
                    <th className="pb-3 text-right pr-2">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-medium text-gray-300">
                  {teams.map((t) => {
                    const gd = t.totalGoalsFor - t.totalGoalsAgainst;
                    return (
                      <tr key={t.id} className="hover:bg-[#181a24] transition">
                        <td className="py-3 pl-2">
                          <span className="font-bold text-white uppercase block">{t.name}</span>
                          <span className="text-[10px] text-[#d4af37] font-black">{t.short_code}</span>
                        </td>
                        <td className="py-3 text-center">{t.playerCount} Players</td>
                        <td className="py-3 text-center">{t.totalMatches}</td>
                        <td className="py-3 text-center">
                          <span className="text-emerald-400">{t.totalWins}</span> / <span className="text-amber-400">{t.totalDraws}</span> / <span className="text-rose-400">{t.totalLosses}</span>
                        </td>
                        <td className="py-3 text-center text-emerald-400 font-bold">{t.totalGoalsFor}</td>
                        <td className="py-3 text-center text-rose-400">{t.totalGoalsAgainst}</td>
                        <td className={`py-3 text-center font-bold ${gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                          {gd > 0 ? `+${gd}` : gd}
                        </td>
                        <td className="py-3 text-center font-bold text-[#d4af37]">{t.winRate}%</td>
                        <td className="py-3 text-right pr-2 font-black text-white text-sm">{t.totalPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}