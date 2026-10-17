'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, TrendingUp, UserCheck } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UNASSIGNED_SEASON_ID } from '@/lib/season';

interface Player {
  id: string;
  name: string;
  efootball_id?: string;
  team_id?: string;
  avatar_url?: string;
  profile_photo?: string;
  squad_photo?: string;
  points?: number;
  trophies?: string[];
}
interface Team { id: string; name: string; }
interface Season { id: string; name: string; status: string; }
interface Match { id: string; home_player_id: string; away_player_id: string; home_score: number; away_score: number; competition_type?: string; season_id?: string; created_at?: string; }

const participantNames = (value: string) => value.split(/\s*\/\s*/).map((name) => name.replace(/\s*\([^)]*\)/g, '').trim()).filter(Boolean);
const includesPlayer = (value: string, playerName: string) => participantNames(value).some((name) => name.toLowerCase() === playerName.trim().toLowerCase());
const trophySeason = (value: string) => value.match(/Season:\s*([^|]+)/i)?.[1]?.trim() || 'Unassigned Season';

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase || !playerId) return;
      const [{ data: playerData }, { data: seasonData }, { data: matchData }, { data: teamData }] = await Promise.all([
        supabase.from('players').select('*').eq('id', playerId).maybeSingle(),
        supabase.from('seasons').select('id, name, status').order('created_at', { ascending: false }),
        supabase.from('matches').select('*').order('created_at', { ascending: false }),
        supabase.from('teams').select('id, name'),
      ]);
      setPlayer(playerData);
        setSeasons([
          ...(seasonData || []),
          { id: UNASSIGNED_SEASON_ID, name: 'Legacy Match Records', status: 'Archived' },
        ]);
      setMatches(matchData || []);
      setTeam((teamData || []).find((entry) => entry.id === playerData?.team_id) || null);
      setSeasonId(seasonData?.find((season) => season.status === 'Active')?.id || seasonData?.[0]?.id || UNASSIGNED_SEASON_ID);
      setLoading(false);
    };
    loadProfile();
  }, [playerId]);

  const seasonMatches = useMemo(() => player ? matches.filter((match) => {
    const belongsToSeason = seasonId === UNASSIGNED_SEASON_ID ? !match.season_id : match.season_id === seasonId;
    return belongsToSeason && (includesPlayer(match.home_player_id, player.name) || includesPlayer(match.away_player_id, player.name));
  }) : [], [matches, player, seasonId]);
  const stats = useMemo(() => seasonMatches.reduce((result, match) => {
    const isHome = includesPlayer(match.home_player_id, player?.name || '');
    const scored = isHome ? match.home_score : match.away_score;
    const conceded = isHome ? match.away_score : match.home_score;
    result.played += 1;
    result.goalsFor += scored;
    result.goalsAgainst += conceded;
    if (scored > conceded) result.wins += 1;
    else if (scored < conceded) result.losses += 1;
    else result.draws += 1;
    return result;
  }, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }), [seasonMatches, player]);
  const trend = seasonMatches.map((match, index) => ({ match: index + 1, goals: includesPlayer(match.home_player_id, player?.name || '') ? match.home_score : match.away_score }));
  const trophies = (player?.trophies || []).reduce<Record<string, string[]>>((groups, trophy) => { const season = trophySeason(trophy); groups[season] = groups[season] || []; groups[season].push(trophy); return groups; }, {});
  const regression = trend.length > 1 ? trend.reduce((sum, point) => sum + point.goals, 0) / trend.length : null;

  if (loading) return <div className="py-20 text-center text-xs text-gray-500">Loading player profile...</div>;
  if (!player) return <div className="py-20 text-center text-sm text-gray-400">Player profile not found.</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <Link href="/players" className="inline-flex items-center gap-2 text-xs font-bold text-[#d4af37] hover:text-white transition"><ArrowLeft className="w-4 h-4" /> Back to Player Directory</Link>
      <section className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5 border-b border-gray-800 pb-5">
          {player.profile_photo || player.avatar_url ? <img src={player.profile_photo || player.avatar_url} alt={player.name} className="w-24 h-24 rounded-2xl object-cover border border-[#d4af37]/40" /> : <div className="w-24 h-24 rounded-2xl bg-[#181a24] border border-[#d4af37]/40 flex items-center justify-center text-2xl font-black text-[#d4af37]">{player.name.slice(0, 2).toUpperCase()}</div>}
          <div><h1 className="text-2xl font-black text-white uppercase">{player.name}</h1><p className="text-sm text-[#d4af37] font-bold">{team?.name || 'Free Agent'}</p><p className="text-xs text-gray-500 mt-1">eFootball ID: {player.efootball_id || 'N/A'}</p></div>
          {player.squad_photo && <img src={player.squad_photo} alt={`${player.name} squad`} className="w-full md:w-56 h-24 rounded-xl object-cover border border-gray-800 md:ml-auto" />}
        </div>
        <div className="flex flex-wrap items-center gap-3"><label className="text-xs font-bold text-gray-400 uppercase">Current season</label><select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="bg-[#181a24] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white">{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">{[['Played', stats.played], ['Wins', stats.wins], ['Draws', stats.draws], ['Losses', stats.losses], ['Goals', stats.goalsFor], ['Win Rate', `${stats.played ? Math.round(stats.wins / stats.played * 100) : 0}%`]].map(([label, value]) => <div key={String(label)} className="bg-[#181a24] border border-gray-800 rounded-xl p-3 text-center"><span className="block text-[10px] text-gray-500 uppercase">{label}</span><strong className="text-lg text-white">{value}</strong></div>)}</div>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#12141c] border border-gray-800 rounded-2xl p-6"><h2 className="text-sm font-black text-white uppercase flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-[#d4af37]" /> Performance trend</h2>{trend.length > 1 ? <ResponsiveContainer width="100%" height={240}><LineChart data={trend}><XAxis dataKey="match" stroke="#6b7280" /><YAxis stroke="#6b7280" /><Tooltip /><Line type="monotone" dataKey="goals" stroke="#d4af37" strokeWidth={2} /></LineChart></ResponsiveContainer> : <p className="text-xs text-gray-500 py-16 text-center">Insufficient match data for a reliable trend.</p>}{regression !== null && <p className="text-[11px] text-gray-500 mt-3">Observed goals per match are shown above. Mean fitted baseline: {regression.toFixed(2)} goals per match.</p>}</section>
        <section className="bg-[#12141c] border border-gray-800 rounded-2xl p-6"><h2 className="text-sm font-black text-white uppercase mb-4">Trophy Cabinet</h2>{Object.keys(trophies).length ? Object.entries(trophies).map(([season, entries]) => <div key={season} className="mb-4"><h3 className="text-xs font-black text-[#d4af37] uppercase mb-2">{season}</h3>{entries.map((trophy) => <div key={trophy} className="text-xs text-gray-300 py-1 flex items-center gap-2"><Award className="w-3 h-3 text-[#d4af37]" />{trophy}</div>)}</div>) : <p className="text-xs text-gray-500">No trophies yet.</p>}</section>
      </div>
      <section className="bg-[#12141c] border border-gray-800 rounded-2xl p-6"><h2 className="text-sm font-black text-white uppercase flex items-center gap-2 mb-4"><UserCheck className="w-4 h-4 text-[#d4af37]" /> Match History</h2>{seasonMatches.length ? <div className="space-y-2">{seasonMatches.map((match) => <div key={match.id} className="flex flex-col sm:flex-row sm:justify-between gap-2 bg-[#181a24] border border-gray-800 rounded-lg p-3 text-xs"><span>{match.home_player_id} vs {match.away_player_id}</span><span className="text-gray-500">{match.competition_type || 'LEAGUE'} · {match.created_at ? new Date(match.created_at).toLocaleDateString() : ''}</span><strong className="text-[#d4af37]">{match.home_score} - {match.away_score}</strong></div>)}</div> : <p className="text-xs text-gray-500">No matches recorded for this season.</p>}</section>
    </div>
  );
}
