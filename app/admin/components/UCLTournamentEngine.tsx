'use client';

import { useState } from 'react';
import { Sparkles, Shield, Swords, Crown, LayoutGrid, Trash2, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Match, Player, Season } from '../types';

interface TournamentProps {
  players: Player[];
  matches: Match[];
  activeSeason: Season | null;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error', msg: string) => void;
  competitionType?: 'UCL' | 'WEEKLY';
}

interface GroupStanding {
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

const stripStageTag = (value: string) => value.replace(/\s*\([^)]*\)/g, '').trim();

const getPairKey = (home: string, away: string) => [stripStageTag(home), stripStageTag(away)]
  .sort((a, b) => a.localeCompare(b))
  .join('::');

export const generateSingleRoundRobinFixtures = (
  groupPlayers: Player[],
  groupTag: string,
  competitionType: 'UCL' | 'WEEKLY' = 'UCL',
) => {
  const fixtures: Array<{
    home_player_id: string;
    away_player_id: string;
    home_score: number;
    away_score: number;
    competition_type: string;
  }> = [];

  for (let homeIndex = 0; homeIndex < groupPlayers.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < groupPlayers.length; awayIndex += 1) {
      fixtures.push({
        home_player_id: `${groupPlayers[homeIndex].name} (${groupTag})`,
        away_player_id: `${groupPlayers[awayIndex].name} (${groupTag})`,
        home_score: 0,
        away_score: 0,
        competition_type: competitionType,
      });
    }
  }

  return fixtures;
};

const getUniqueGroupFixtures = (groupMatches: Match[]) => {
  const fixturesByPair = new Map<string, Match>();

  groupMatches.forEach((match) => {
    const pairKey = getPairKey(match.home_player_id, match.away_player_id);
    const existing = fixturesByPair.get(pairKey);
    const matchIsPlayed = match.home_score !== 0 || match.away_score !== 0;
    const existingIsPlayed = existing ? existing.home_score !== 0 || existing.away_score !== 0 : false;

    if (!existing || (matchIsPlayed && !existingIsPlayed)) {
      fixturesByPair.set(pairKey, match);
    }
  });

  return Array.from(fixturesByPair.values());
};

const getGroupTags = (matches: Match[]) => Array.from(new Set(
  matches.flatMap((match) => {
    const homeGroup = match.home_player_id.match(/\((Group [A-Z]+)\)/)?.[1];
    const awayGroup = match.away_player_id.match(/\((Group [A-Z]+)\)/)?.[1];
    return [homeGroup, awayGroup].filter((group): group is string => Boolean(group));
  }),
)).sort();

const getStageMatches = (matches: Match[], stage: string) => matches.filter((match) =>
  match.home_player_id.includes(`(${stage})`) || match.away_player_id.includes(`(${stage})`),
);

const getNextKnockoutStage = (qualifiedCount: number) => {
  if (qualifiedCount === 2) return 'Final';
  if (qualifiedCount === 4) return 'Semi-Final';
  if (qualifiedCount === 8) return 'Quarter-Final';
  if (qualifiedCount === 16) return 'Round of 16';
  return null;
};

const getUclAwardKey = (seasonName: string) => `UCL | Season: ${seasonName}`;

export default function UCLTournamentEngine({
  players,
  matches,
  activeSeason,
  onRefresh,
  showToast,
  competitionType = 'UCL',
}: TournamentProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [participantCount, setParticipantCount] = useState<8 | 16 | 32>(8);

  const isWeekly = competitionType === 'WEEKLY';
  const competitionLabel = isWeekly ? 'Weekly' : 'UCL';
  const weeklyCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tournamentMatches = matches.filter((match) => {
    if (match.competition_type !== competitionType) return false;
    return !isWeekly || Boolean(match.created_at && new Date(match.created_at).getTime() >= weeklyCutoff);
  });
  const weeklyDeadline = isWeekly && tournamentMatches.length > 0
    ? new Date(Math.min(...tournamentMatches.map((match) => new Date(match.created_at).getTime())) + 7 * 24 * 60 * 60 * 1000)
    : null;
  const groupTags = getGroupTags(tournamentMatches);
  const groupMatches = groupTags.map((groupTag) => ({
    groupTag,
    matches: getUniqueGroupFixtures(tournamentMatches.filter((match) => match.home_player_id.includes(`(${groupTag})`))),
  }));
  const knockoutStages = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'];
  const activeKnockoutStage = [...knockoutStages].reverse().find((stage) => getStageMatches(tournamentMatches, stage).length > 0);
  const activeKnockoutMatches = activeKnockoutStage ? getStageMatches(tournamentMatches, activeKnockoutStage) : [];

  const awardUclFinal = async (finalMatch: Match, homeScore: number, awayScore: number) => {
    if (isWeekly) return;
    if (!supabase || homeScore === awayScore) {
      showToast('error', 'The UCL final must have a confirmed winner before trophies can be awarded.');
      return;
    }

    const { data: season } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('status', 'Active')
      .limit(1)
      .maybeSingle();
    const seasonName = season?.name || 'Current Season';
    const awardKey = getUclAwardKey(seasonName);
    const winnerName = stripStageTag(homeScore > awayScore ? finalMatch.home_player_id : finalMatch.away_player_id);
    const runnerUpName = stripStageTag(homeScore > awayScore ? finalMatch.away_player_id : finalMatch.home_player_id);
    const result = `${homeScore}-${awayScore}`;
    const date = new Date().toISOString().slice(0, 10);

    const championRecord = `${awardKey} | UCL Champion | Final: ${result} | Date: ${date}`;
    const runnerUpRecord = `${awardKey} | UCL Runner-up | Final: ${result} | Date: ${date}`;

    for (const player of players) {
      const existingTrophies = player.trophies || [];
      const withoutCurrentSeasonUcl = existingTrophies.filter((trophy) => !trophy.startsWith(awardKey));
      const isWinner = player.name.trim().toLowerCase() === winnerName.trim().toLowerCase();
      const isRunnerUp = player.name.trim().toLowerCase() === runnerUpName.trim().toLowerCase();
      const nextTrophies = isWinner
        ? [...withoutCurrentSeasonUcl, championRecord]
        : isRunnerUp
          ? [...withoutCurrentSeasonUcl, runnerUpRecord]
          : withoutCurrentSeasonUcl;

      if (nextTrophies.join('\n') !== existingTrophies.join('\n')) {
        const { error } = await supabase.from('players').update({ trophies: nextTrophies }).eq('id', player.id);
        if (error) {
          showToast('error', error.message);
          return;
        }
      }
    }

    showToast('success', `UCL Champion: ${winnerName}. Runner-up: ${runnerUpName}. Trophy records updated for ${seasonName}.`);
  };

  const togglePlayerSelection = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    } else {
      if (selectedPlayerIds.length >= participantCount) {
        showToast('error', `You can only select ${participantCount} players for this ${competitionLabel} format.`);
        return;
      }
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const handleGenerateTournament = async () => {
    if (selectedPlayerIds.length !== participantCount) {
      showToast('error', `You have selected ${selectedPlayerIds.length} players. Exactly ${participantCount} are required!`);
      return;
    }

    if (!confirm(`Generate the ${competitionLabel} group fixtures for the selected participants? Existing history will be preserved. Continue?`)) return;
    if (!supabase) return;
    if (!activeSeason) {
      showToast('error', `Create or activate a season before generating ${competitionLabel} fixtures.`);
      return;
    }

    if (tournamentMatches.length > 0) {
      showToast('error', `An active ${competitionLabel} tournament already exists. Complete or reset it before starting another one.`);
      return;
    }

    const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));
    const shuffled = [...selectedPlayers].sort(() => 0.5 - Math.random());
    const fixturesToInsert = Array.from({ length: participantCount / 4 }, (_, groupIndex) => {
      const groupPlayers = shuffled.slice(groupIndex * 4, groupIndex * 4 + 4);
      return generateSingleRoundRobinFixtures(groupPlayers, `Group ${String.fromCharCode(65 + groupIndex)}`, competitionType);
    }).flat().map((fixture) => ({ ...fixture, season_id: activeSeason.id }));

    const { error } = await supabase.from('matches').insert(fixturesToInsert);
    if (error) showToast('error', error.message);
    else {
      showToast('success', `${participantCount} players placed into ${participantCount / 4} ${competitionLabel} groups with single round-robin fixtures.`);
      setSelectedPlayerIds([]);
      onRefresh();
    }
  };

  const calculateGroupStandings = (groupTag: string, currentMatches: Match[]): GroupStanding[] => {
    const groupMatches = getUniqueGroupFixtures(currentMatches.filter(m => m.competition_type === competitionType && m.home_player_id.includes(`(${groupTag})`)));
    const stats: Record<string, GroupStanding> = {};

    groupMatches.forEach(m => {
      const homeName = stripStageTag(m.home_player_id);
      const awayName = stripStageTag(m.away_player_id);

      if (!stats[homeName]) stats[homeName] = { name: homeName, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
      if (!stats[awayName]) stats[awayName] = { name: awayName, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };

      if (m.home_score === 0 && m.away_score === 0) return;

      stats[homeName].played += 1;
      stats[awayName].played += 1;
      stats[homeName].goalsFor += m.home_score;
      stats[homeName].goalsAgainst += m.away_score;
      stats[awayName].goalsFor += m.away_score;
      stats[awayName].goalsAgainst += m.home_score;

      if (m.home_score > m.away_score) {
        stats[homeName].points += 3;
        stats[homeName].wins += 1;
        stats[awayName].losses += 1;
      } else if (m.home_score < m.away_score) {
        stats[awayName].points += 3;
        stats[awayName].wins += 1;
        stats[homeName].losses += 1;
      } else {
        stats[homeName].points += 1;
        stats[awayName].points += 1;
        stats[homeName].draws += 1;
        stats[awayName].draws += 1;
      }
    });

    return Object.values(stats).map((standing) => ({
      ...standing,
      goalDifference: standing.goalsFor - standing.goalsAgainst,
    })).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  };

  const checkAndAutoGenerateKnockouts = async (updatedMatches: Match[]) => {
    if (!supabase || !activeSeason) return;
    const currentUclList = updatedMatches.filter((match) =>
      match.competition_type === competitionType
      && match.season_id === activeSeason.id
      && (!isWeekly || Boolean(match.created_at && new Date(match.created_at).getTime() >= weeklyCutoff)),
    );
    const currentGroupTags = getGroupTags(currentUclList);
    const currentGroups = currentGroupTags.flatMap((groupTag) => getUniqueGroupFixtures(currentUclList.filter((match) => match.home_player_id.includes(`(${groupTag})`))));
    const currentStageIndex = knockoutStages.findIndex((stage) => getStageMatches(currentUclList, stage).length > 0);

    if (currentStageIndex === -1) {
      if (currentGroups.length === 0 || currentGroups.some((match) => match.home_score === 0 && match.away_score === 0)) return;

      const qualifiers = currentGroupTags.flatMap((groupTag) => {
        const standings = calculateGroupStandings(groupTag, currentUclList);
        return standings.length >= 2 ? [standings[0].name, standings[1].name] : [];
      });
      const nextStage = getNextKnockoutStage(qualifiers.length);
      if (!nextStage || qualifiers.length < 2) return;

      const knockoutFixtures = [];
      for (let index = 0; index < qualifiers.length; index += 4) {
        const firstGroupWinner = qualifiers[index];
        const nextGroupRunnerUp = qualifiers[index + 3];
        const nextGroupWinner = qualifiers[index + 2];
        const firstGroupRunnerUp = qualifiers[index + 1];
        if (!firstGroupWinner || !nextGroupRunnerUp || !nextGroupWinner || !firstGroupRunnerUp) continue;
        knockoutFixtures.push(
          { home_player_id: `${firstGroupWinner} (${nextStage})`, away_player_id: `${nextGroupRunnerUp} (${nextStage})`, home_score: 0, away_score: 0, competition_type: competitionType, season_id: activeSeason.id },
          { home_player_id: `${nextGroupWinner} (${nextStage})`, away_player_id: `${firstGroupRunnerUp} (${nextStage})`, home_score: 0, away_score: 0, competition_type: competitionType, season_id: activeSeason.id },
        );
      }
      if (knockoutFixtures.length > 0) await supabase.from('matches').insert(knockoutFixtures);
      showToast('success', `Group stage completed. ${nextStage} fixtures generated.`);
      return;
    }

    const currentStage = knockoutStages[currentStageIndex];
    const currentStageMatches = getStageMatches(currentUclList, currentStage);
    if (currentStageMatches.length === 0 || currentStageMatches.some((match) => match.home_score === 0 && match.away_score === 0)) return;

    const winners: string[] = [];
    for (const match of currentStageMatches) {
      if (match.home_score === match.away_score) {
        showToast('error', `${currentStage} contains a tied match. Resolve it before progressing.`);
        return;
      }
      winners.push(stripStageTag(match.home_score > match.away_score ? match.home_player_id : match.away_player_id));
    }

    const nextStage = getNextKnockoutStage(winners.length);
    if (!nextStage || getStageMatches(currentUclList, nextStage).length > 0) return;
    const nextFixtures = [];
    for (let index = 0; index < winners.length; index += 2) {
      if (!winners[index + 1]) continue;
      nextFixtures.push({
        home_player_id: `${winners[index]} (${nextStage})`,
        away_player_id: `${winners[index + 1]} (${nextStage})`,
        home_score: 0,
        away_score: 0,
        competition_type: competitionType,
        season_id: activeSeason.id,
      });
    }
    if (nextFixtures.length > 0) {
      const { error } = await supabase.from('matches').insert(nextFixtures);
      if (error) showToast('error', error.message);
      else showToast('success', `${currentStage} completed. ${nextStage} fixtures generated.`);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Delete this fixture?')) return;
    await supabase.from('matches').delete().eq('id', matchId);
    onRefresh();
  };

  const handleResetWeeklyTournament = async () => {
    if (!isWeekly || !supabase || tournamentMatches.length === 0) return;
    if (!confirm('Reset the current Weekly Tournament? This removes only this week’s fixtures and results. Older weekly history will be preserved. Continue?')) return;

    const { error } = await supabase
      .from('matches')
      .delete()
      .in('id', tournamentMatches.map((match) => match.id));
    if (error) {
      showToast('error', `Weekly Tournament reset failed: ${error.message}`);
      return;
    }

    showToast('success', 'Weekly Tournament reset. Start a new weekly round when ready.');
    onRefresh();
  };

  const renderStandings = (groupTag: string) => {
    const standings = calculateGroupStandings(groupTag, matches);

    return (
      <div className="overflow-x-auto border-t border-gray-800 pt-4 mt-4">
        <table className="w-full text-[10px] text-left">
          <thead className="text-gray-500 uppercase">
            <tr>
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Player</th>
              <th className="py-2 px-1 text-center">P</th>
              <th className="py-2 px-1 text-center">W</th>
              <th className="py-2 px-1 text-center">D</th>
              <th className="py-2 px-1 text-center">L</th>
              <th className="py-2 px-1 text-center">GF</th>
              <th className="py-2 px-1 text-center">GA</th>
              <th className="py-2 px-1 text-center">GD</th>
              <th className="py-2 pl-1 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.name} className="border-t border-gray-800/60 text-gray-300">
                <td className="py-2 pr-2 text-gray-500">{index + 1}</td>
                <td className="py-2 pr-2 font-bold text-white">{standing.name}</td>
                <td className="py-2 px-1 text-center">{standing.played}</td>
                <td className="py-2 px-1 text-center text-emerald-400">{standing.wins}</td>
                <td className="py-2 px-1 text-center text-amber-400">{standing.draws}</td>
                <td className="py-2 px-1 text-center text-rose-400">{standing.losses}</td>
                <td className="py-2 px-1 text-center">{standing.goalsFor}</td>
                <td className="py-2 px-1 text-center">{standing.goalsAgainst}</td>
                <td className="py-2 px-1 text-center">{standing.goalDifference}</td>
                <td className="py-2 pl-1 text-center font-black text-[#d4af37]">{standing.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMatchCard = (m: Match, index: number, prefix: string = "Fixture") => {
    const isPlayed = m.home_score > 0 || m.away_score > 0;
    const cleanHomeName = m.home_player_id.replace(/\s*\([^)]*\)/g, '');
    const cleanAwayName = m.away_player_id.replace(/\s*\([^)]*\)/g, '');

    return (
      <div key={m.id} className="bg-[#181a24] p-4 rounded-xl border border-gray-800 hover:border-amber-500/50 transition duration-300 flex flex-col gap-3 shadow-md relative overflow-hidden group">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
          <span className="text-gray-500">{prefix} {index + 1}</span>
          <span className={isPlayed ? "text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded" : "text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded"}>
            {isPlayed ? "Result Recorded" : "Pending Match"}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-white text-sm truncate w-1/3" title={cleanHomeName}>{cleanHomeName}</span>
          <div className="flex items-center gap-2 w-1/3 justify-center">
            <input type="number" defaultValue={m.home_score} id={`home-${m.id}`} min="0" className="w-12 h-10 text-center bg-[#12141c] text-lg font-black text-amber-400 border border-gray-700 rounded-lg outline-none focus:border-amber-500 transition" />
            <span className="text-gray-600 font-black">-</span>
            <input type="number" defaultValue={m.away_score} id={`away-${m.id}`} min="0" className="w-12 h-10 text-center bg-[#12141c] text-lg font-black text-amber-400 border border-gray-700 rounded-lg outline-none focus:border-amber-500 transition" />
          </div>
          <span className="font-bold text-white text-sm text-right truncate w-1/3" title={cleanAwayName}>{cleanAwayName}</span>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              const h = Number((document.getElementById(`home-${m.id}`) as HTMLInputElement).value);
              const a = Number((document.getElementById(`away-${m.id}`) as HTMLInputElement).value);
              await supabase.from('matches').update({ home_score: h, away_score: a }).eq('id', m.id);
              showToast('success', 'Score updated successfully!');
              
              const { data: updatedMatchData } = await supabase.from('matches').select('*').eq('season_id', activeSeason?.id).order('created_at', { ascending: false });
              if (updatedMatchData) {
                if (!isWeekly && m.home_player_id.includes('(Final)')) await awardUclFinal(m, h, a);
                await checkAndAutoGenerateKnockouts(updatedMatchData);
              }
              onRefresh();
            }}
            className="flex-1 py-2 bg-[#12141c] hover:bg-amber-500 hover:text-black text-gray-300 border border-gray-700 font-bold text-[11px] uppercase rounded transition"
          >
            Save Result
          </button>
          <button onClick={() => handleDeleteMatch(m.id)} className="px-3 bg-[#12141c] hover:bg-rose-500 hover:text-white text-gray-500 border border-gray-700 rounded transition flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#12141c] to-[#181a24] border border-amber-500/30 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-2xl">
        <div>
          <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400" /> {isWeekly ? 'Weekly Tournament Engine' : 'UCL World-Cup Engine'}
          </h2>
          <p className="text-sm text-gray-400 mt-2 font-medium max-w-xl">
            Select 8, 16, or 32 participating players. Groups of four play a single round-robin, then the correct knockout stages unlock in order.
            {isWeekly && ' This tournament is active for one week; an admin must confirm each reset.'}
          </p>
          {weeklyDeadline && (
            <p className="text-xs text-amber-400 mt-2">
              Current weekly round ends {weeklyDeadline.toLocaleString()}.
            </p>
          )}
        </div>
        {isWeekly && tournamentMatches.length > 0 && (
          <button type="button" onClick={handleResetWeeklyTournament} className="px-4 py-3 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-200 font-black text-xs uppercase rounded-xl transition">
            Reset Weekly Tournament
          </button>
        )}
      </div>

      {tournamentMatches.length === 0 ? (
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#d4af37]" /> Select {competitionLabel} Participants
              </h3>
              <p className="text-xs text-gray-500 mt-1">Participants are divided into groups of four.</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-lg ${selectedPlayerIds.length === participantCount ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {selectedPlayerIds.length} / {participantCount} Selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[8, 16, 32].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => { setParticipantCount(count as 8 | 16 | 32); setSelectedPlayerIds([]); }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition ${participantCount === count ? 'bg-[#d4af37] text-black' : 'bg-[#181a24] text-gray-400 border border-gray-800 hover:text-white'}`}
              >
                {count} Players / {count / 4} Groups
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {players.map(p => (
              <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedPlayerIds.includes(p.id) ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-[#181a24] border-gray-800 hover:border-gray-600'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedPlayerIds.includes(p.id)} 
                  onChange={() => togglePlayerSelection(p.id)} 
                  className="w-4 h-4 accent-[#d4af37]"
                />
                <span className={`text-sm font-bold ${selectedPlayerIds.includes(p.id) ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
              </label>
            ))}
          </div>

          <button 
            onClick={handleGenerateTournament}
            disabled={selectedPlayerIds.length !== participantCount}
            className="w-full py-4 mt-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-500 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
          >
            <LayoutGrid className="w-5 h-5" /> Generate {participantCount} Player {competitionLabel}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {groupMatches.map(({ groupTag, matches: fixtures }, groupIndex) => (
            <div key={groupTag} className="bg-[#12141c] border border-gray-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-lg font-black text-white uppercase flex items-center gap-2 border-b border-gray-800 pb-4 mb-4">
                <Shield className={`w-5 h-5 ${groupIndex % 2 === 0 ? 'text-emerald-400' : 'text-blue-400'}`} /> {groupTag}
              </h3>
              <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-2 pb-4">
                {fixtures.map((match, index) => renderMatchCard(match, index))}
              </div>
              {renderStandings(groupTag)}
            </div>
          ))}

          {activeKnockoutMatches.length > 0 && (
            <div className="lg:col-span-2 bg-gradient-to-r from-amber-900/40 to-[#12141c] border border-amber-500 rounded-2xl p-6 shadow-2xl space-y-6">
              <h3 className="text-xl font-black text-amber-400 uppercase flex items-center gap-2 border-b border-amber-500/30 pb-4">
                <Crown className="w-6 h-6 text-amber-400" /> {competitionLabel} {activeKnockoutStage}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeKnockoutMatches.map((match, index) => renderMatchCard(match, index, activeKnockoutStage || 'Knockout'))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}