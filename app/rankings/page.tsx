'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpDown, 
  Sparkles,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { filterMatchesBySeason, SeasonOption, UNASSIGNED_SEASON_ID } from '@/lib/season';

// TYPES
interface Player {
  id: string;
  name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

interface Match {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number;
  away_score: number;
  competition_type?: string;
  season_id?: string;
  created_at?: string;
}

interface Standing {
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const cleanParticipant = (value: string) => value.replace(/\s*\([^)]*\)/g, '').trim();

const getParticipants = (value: string) => value
  .split(/\s*\/\s*/)
  .map(cleanParticipant)
  .filter(Boolean);

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState('LEAGUE');
  const [selectedUclGroup, setSelectedUclGroup] = useState<'Group A' | 'Group B'>('Group A');
  const [loading, setLoading] = useState<boolean>(true);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  useEffect(() => {
    async function fetchRankings() {
      if (supabase) {
        const [{ data, error }, { data: matchData }, { data: seasonData }] = await Promise.all([
          supabase.from('players').select('*').order('name'),
          supabase.from('matches').select('*').order('created_at', { ascending: false }),
          supabase.from('seasons').select('id, name, status').order('created_at', { ascending: false }),
        ]);

        if (!error && data) {
          setPlayers(data);
        }
        if (matchData) setMatches(matchData);
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

    fetchRankings();
  }, []);

  const standings = (() => {
    const stats: Record<string, Standing> = {};
    const weeklyCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const competitionMatches = filterMatchesBySeason(matches, selectedSeasonId).filter((match) => {
      const matchesCompetition = (match.competition_type || 'LEAGUE').toUpperCase() === selectedCompetition;
      const isUclGroupMatch = selectedCompetition !== 'UCL'
        || match.home_player_id.includes(`(${selectedUclGroup})`);
      const isCurrentWeeklyMatch = selectedCompetition !== 'WEEKLY'
        || Boolean(match.created_at && new Date(match.created_at).getTime() >= weeklyCutoff);
      return matchesCompetition && isUclGroupMatch && isCurrentWeeklyMatch;
    });

    const ensure = (name: string) => {
      if (!stats[name]) {
        stats[name] = { name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
      }
      return stats[name];
    };

    competitionMatches.forEach((match) => {
      if (match.home_score === 0 && match.away_score === 0) return;
      const homeParticipants = getParticipants(match.home_player_id);
      const awayParticipants = getParticipants(match.away_player_id);
      homeParticipants.forEach((name) => {
        const standing = ensure(name);
        standing.played += 1;
        standing.goalsFor += match.home_score;
        standing.goalsAgainst += match.away_score;
      });
      awayParticipants.forEach((name) => {
        const standing = ensure(name);
        standing.played += 1;
        standing.goalsFor += match.away_score;
        standing.goalsAgainst += match.home_score;
      });

      if (match.home_score > match.away_score) {
        homeParticipants.forEach((name) => { ensure(name).wins += 1; ensure(name).points += 3; });
        awayParticipants.forEach((name) => { ensure(name).losses += 1; });
      } else if (match.away_score > match.home_score) {
        awayParticipants.forEach((name) => { ensure(name).wins += 1; ensure(name).points += 3; });
        homeParticipants.forEach((name) => { ensure(name).losses += 1; });
      } else {
        [...homeParticipants, ...awayParticipants].forEach((name) => { ensure(name).draws += 1; ensure(name).points += 1; });
      }
    });

    return Object.values(stats).map((standing) => ({
      ...standing,
      goalDifference: standing.goalsFor - standing.goalsAgainst,
    })).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  })();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5" /> Official League Table
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">
            LEAGUE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">STANDINGS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time points table. Tiebreakers: Points ➔ Goal Difference ➔ Goals Scored.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)} className="bg-[#12141c] border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-[#d4af37]">
            {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.status === 'Active' ? ' — Current Season' : ' — Archived'}</option>)}
          </select>

          <select
            value={selectedCompetition}
            onChange={(event) => setSelectedCompetition(event.target.value)}
            className="bg-[#12141c] border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-[#d4af37]"
          >
            <option value="LEAGUE">League</option>
            <option value="UCL">UCL</option>
            <option value="WEEKLY">Weekly Tournament</option>
            <option value="DUO">Duo Tournament</option>
            <option value="CHAMPIONSHIP">Championship</option>
          </select>

          {selectedCompetition === 'UCL' && (
            <div className="flex items-center gap-1 bg-[#12141c] border border-gray-800 rounded-xl p-1">
              {(['Group A', 'Group B'] as const).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedUclGroup(group)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedUclGroup === group
                      ? 'bg-[#d4af37] text-black'
                      : 'text-gray-400 hover:text-white hover:bg-[#181a24]'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TIEBREAKER RULE BADGE */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12141c] border border-gray-800 rounded-xl text-xs text-gray-400">
          <Info className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
          <span>Win = <strong>3 PTS</strong> | Draw = <strong>1 PT</strong> | Loss = <strong>0 PTS</strong></span>
        </div>
      </div>

      {/* STANDINGS TABLE */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-500">Loading standings...</div>
      ) : standings.length === 0 ? (
        <div className="py-20 text-center space-y-2 bg-[#12141c] border border-gray-800 rounded-2xl">
          <p className="text-sm font-bold text-gray-300">No standings recorded yet.</p>
          <p className="text-xs text-gray-500">Add players and submit match results in the Admin Panel to update rankings.</p>
        </div>
      ) : (
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#181a24] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-800">
                  <th className="py-4 pl-4 text-center w-12">Pos</th>
                  <th className="py-4 px-4">Player</th>
                  <th className="py-4 text-center">MP</th>
                  <th className="py-4 text-center">W</th>
                  <th className="py-4 text-center">D</th>
                  <th className="py-4 text-center">L</th>
                  <th className="py-4 text-center">GF</th>
                  <th className="py-4 text-center">GA</th>
                  <th className="py-4 text-center">GD</th>
                  <th className="py-4 pr-6 text-right font-black text-[#d4af37]">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium text-gray-300">
                {standings.map((standing, idx) => {
                  const mp = standing.played;
                  const wins = standing.wins;
                  const draws = standing.draws;
                  const losses = standing.losses;
                  const gf = standing.goalsFor;
                  const ga = standing.goalsAgainst;
                  const gd = standing.goalDifference;
                  const pts = standing.points;

                  return (
                    <tr
                      key={standing.name || idx}
                      className={`hover:bg-[#181a24] transition ${
                        idx === 0 ? 'bg-[#d4af37]/5' : ''
                      }`}
                    >
                      {/* POSITION / CROWN */}
                      <td className="py-4 pl-4 text-center font-black">
                        {idx === 0 ? (
                          <span className="text-base" title="1st Place (Champion)">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-base" title="2nd Place">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-base" title="3rd Place">🥉</span>
                        ) : (
                          <span className="text-gray-500">{idx + 1}</span>
                        )}
                      </td>

                      {/* PLAYER NAME */}
                      <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                        <span>{standing.name}</span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-[9px] font-black uppercase tracking-wider">
                            Leader
                          </span>
                        )}
                      </td>

                      {/* MATCH STATS */}
                      <td className="py-4 text-center font-bold">{mp}</td>
                      <td className="py-4 text-center text-emerald-400 font-bold">{wins}</td>
                      <td className="py-4 text-center text-amber-400 font-bold">{draws}</td>
                      <td className="py-4 text-center text-rose-400 font-bold">{losses}</td>
                      <td className="py-4 text-center text-emerald-400">{gf}</td>
                      <td className="py-4 text-center text-rose-400">{ga}</td>

                      {/* GOAL DIFFERENCE */}
                      <td className={`py-4 text-center font-bold ${
                        gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-gray-400'
                      }`}>
                        {gd > 0 ? `+${gd}` : gd}
                      </td>

                      {/* POINTS */}
                      <td className="py-4 pr-6 text-right font-black text-base text-[#d4af37]">
                        {pts}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}