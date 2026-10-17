'use client';

import { useState, FormEvent } from 'react';
import { Trophy, Award, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Competition, Match, Player } from '../types';

interface CompetitionManagerProps {
  competitions: Competition[];
  matches: Match[];
  players: Player[];
  onRefresh: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export default function CompetitionManager({
  competitions,
  matches,
  players,
  onRefresh,
  showToast,
}: CompetitionManagerProps) {
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [compInput, setCompInput] = useState({
    title: '',
    description: '',
    status: 'UPCOMING' as 'ACTIVE' | 'UPCOMING' | 'COMPLETED',
    formatType: 'LEAGUE FORMAT',
    capacity: '16 Players Max',
    prize: 'Golden Trophy & Badge',
    matchFormatDescription: 'Group Stage + Knockouts',
    rules: '',
  });

  const handleSaveCompetition = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (editingComp) {
      const { error } = await supabase
        .from('competitions')
        .update({
          title: compInput.title.trim(),
          description: compInput.description.trim(),
          status: compInput.status,
          format_type: compInput.formatType.trim(),
          capacity: compInput.capacity.trim(),
          prize: compInput.prize.trim(),
          match_format_description: compInput.matchFormatDescription.trim(),
          rules: compInput.rules.trim(),
        })
        .eq('id', editingComp.id);

      if (error) showToast('error', error.message);
      else {
        showToast('success', `Competition "${compInput.title}" updated successfully!`);
        setEditingComp(null);
      }
    } else {
      const { error } = await supabase.from('competitions').insert([
        {
          title: compInput.title.trim(),
          description: compInput.description.trim(),
          status: compInput.status,
          format_type: compInput.formatType.trim(),
          capacity: compInput.capacity.trim(),
          prize: compInput.prize.trim(),
          match_format_description: compInput.matchFormatDescription.trim(),
          rules: compInput.rules.trim(),
        },
      ]);

      if (error) showToast('error', error.message);
      else showToast('success', `Competition "${compInput.title}" published!`);
    }

    setCompInput({
      title: '', description: '', status: 'UPCOMING',
      formatType: 'LEAGUE FORMAT', capacity: '16 Players Max',
      prize: 'Golden Trophy & Badge', matchFormatDescription: 'Group Stage + Knockouts', rules: '',
    });
    onRefresh();
  };

  const handleDeleteComp = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this competition?')) return;
    const { error } = await supabase.from('competitions').delete().eq('id', id);
    if (error) showToast('error', error.message);
    else {
      showToast('success', 'Competition deleted successfully!');
      onRefresh();
    }
  };

  const handleConcludeAndAwardTrophy = async (compType: string, compTitle: string) => {
    if (!confirm(`Are you sure you want to conclude "${compTitle}"? This will compute the tournament winner and attach the trophy badge.`)) return;
    if (!supabase) return;

    const compMatches = matches.filter((m) => m.competition_type === compType);
    if (compMatches.length === 0) {
      showToast('error', `No recorded matches found for ${compTitle}.`);
      return;
    }

    const incompleteMatches = compMatches.filter((match) => match.home_score === 0 && match.away_score === 0);
    if (incompleteMatches.length > 0) {
      showToast('error', `Cannot conclude ${compTitle} while ${incompleteMatches.length} match result(s) are incomplete.`);
      return;
    }

    const stats: Record<string, { points: number; gd: number; name: string }> = {};

    compMatches.forEach((m) => {
      // Remove UCL specific tags just in case
      const homeName = m.home_player_id.replace(/\s*\(Group [AB]\)/g, '').replace(/\s*\([^)]*\)/g, '');
      const awayName = m.away_player_id.replace(/\s*\(Group [AB]\)/g, '').replace(/\s*\([^)]*\)/g, '');

      if (!stats[homeName]) stats[homeName] = { points: 0, gd: 0, name: homeName };
      if (!stats[awayName]) stats[awayName] = { points: 0, gd: 0, name: awayName };

      const diff = m.home_score - m.away_score;
      stats[homeName].gd += diff;
      stats[awayName].gd -= diff;

      if (m.home_score > m.away_score) {
        stats[homeName].points += 3;
      } else if (m.home_score < m.away_score) {
        stats[awayName].points += 3;
      } else {
        stats[homeName].points += 1;
        stats[awayName].points += 1;
      }
    });

    const ranked = Object.values(stats).sort((a, b) => b.points - a.points || b.gd - a.gd);
    const tiedForFirst = ranked.filter((entry) => entry.points === ranked[0]?.points && entry.gd === ranked[0]?.gd);
    if (tiedForFirst.length > 1) {
      showToast('error', `Cannot conclude ${compTitle} until the tied result is resolved.`);
      return;
    }
    const winnerNameStr = ranked[0]?.name;

    if (winnerNameStr) {
      // DUO FIX: Use regex to split cleanly in case there are missing spaces (e.g. "Siva/Adi" or "Siva / Adi")
      const winningPlayers = winnerNameStr.split(/\s*\/\s*/);
      const trophyTag = `🏆 ${compTitle} Champion`;

      for (const playerName of winningPlayers) {
        const playerObj = players.find((p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase());
        if (playerObj) {
          const currentTrophies = playerObj.trophies || [];
          if (!currentTrophies.includes(trophyTag)) {
            const updatedTrophies = [...currentTrophies, trophyTag];
            await supabase.from('players').update({ trophies: updatedTrophies }).eq('id', playerObj.id);
          }
        }
      }
      showToast('success', `🏅 Trophy "${trophyTag}" attached to ${winnerNameStr}! Match history preserved.`);
    }
    onRefresh();
  };

  const getBallonDorRankings = () => {
    const globalStats: Record<string, { points: number; goals: number; wins: number; name: string }> = {};

    matches.forEach((m) => {
      const homeNames = m.home_player_id.split(/\s*\/\s*/);
      const awayNames = m.away_player_id.split(/\s*\/\s*/);

      homeNames.forEach((name) => {
        const cleanName = name.replace(/\s*\(Group [AB]\)/g, '').replace(/\s*\([^)]*\)/g, '');
        if (!globalStats[cleanName]) globalStats[cleanName] = { points: 0, goals: 0, wins: 0, name: cleanName };
        globalStats[cleanName].goals += m.home_score;
        if (m.home_score > m.away_score) {
          globalStats[cleanName].points += 3;
          globalStats[cleanName].wins += 1;
        } else if (m.home_score === m.away_score) {
          globalStats[cleanName].points += 1;
        }
      });

      awayNames.forEach((name) => {
        const cleanName = name.replace(/\s*\(Group [AB]\)/g, '').replace(/\s*\([^)]*\)/g, '');
        if (!globalStats[cleanName]) globalStats[cleanName] = { points: 0, goals: 0, wins: 0, name: cleanName };
        globalStats[cleanName].goals += m.away_score;
        if (m.away_score > m.home_score) {
          globalStats[cleanName].points += 3;
          globalStats[cleanName].wins += 1;
        } else if (m.home_score === m.away_score) {
          globalStats[cleanName].points += 1;
        }
      });
    });

    return Object.values(globalStats).sort((a, b) => b.points - a.points || b.wins - a.wins || b.goals - a.goals);
  };

  const handleAwardBallonDor = async () => {
    const rankings = getBallonDorRankings();
    if (rankings.length === 0) {
      showToast('error', 'No match data available to determine Ballon d\'Or winner.');
      return;
    }

    const winner = rankings[0];
    if (!confirm(`Award Season Ballon d'Or 🌟 to ${winner.name} (${winner.points} pts, ${winner.goals} goals)?`)) return;
    if (!supabase) return;

    const playerObj = players.find((p) => p.name.trim().toLowerCase() === winner.name.trim().toLowerCase());
    if (playerObj) {
      const trophyTag = `🥇 Ballon d'Or Winner 2026`;
      const currentTrophies = playerObj.trophies || [];
      if (!currentTrophies.includes(trophyTag)) {
        await supabase.from('players').update({ trophies: [...currentTrophies, trophyTag] }).eq('id', playerObj.id);
        showToast('success', `✨ Ballon d'Or awarded to ${winner.name}! Updated in Player Profile.`);
        onRefresh();
      } else {
        showToast('error', `${winner.name} already holds this season's Ballon d'Or trophy!`);
      }
    } else {
      showToast('error', `Player record for "${winner.name}" not found in database.`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#12141c] border border-[#d4af37]/40 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-black text-[#d4af37] uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-3">
            <Award className="w-5 h-5 text-[#d4af37]" /> Conclude Competition & Award Trophies
          </h2>
          <p className="text-xs text-gray-400">
            Selecting a competition below calculates the tournament champion, automatically attaches a trophy badge to their Player Profile, and resets the match bracket for a new cycle.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { code: 'WEEKLY', title: 'Weekly Blitz', color: 'border-amber-500/40 hover:border-amber-500 text-amber-400' },
              { code: 'UCL', title: 'Champions League', color: 'border-blue-500/40 hover:border-blue-500 text-blue-400' },
              { code: 'LEAGUE', title: 'Premier League', color: 'border-emerald-500/40 hover:border-emerald-500 text-emerald-400' },
              { code: 'DUO', title: 'Duo Cup (2v2)', color: 'border-[#d4af37]/40 hover:border-[#d4af37] text-[#d4af37]' },
            ].map((item) => (
              <div key={item.code} className={`bg-[#181a24] border ${item.color} p-3 rounded-xl space-y-2 flex flex-col justify-between`}>
                <h3 className="text-[11px] font-black text-white uppercase">{item.title}</h3>
                <button
                  onClick={() => handleConcludeAndAwardTrophy(item.code, item.title)}
                  className="w-full py-1.5 bg-[#12141c] hover:bg-[#d4af37] hover:text-black text-[10px] font-extrabold border border-gray-700 rounded transition flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3 h-3 text-[#d4af37]" /> Conclude & Award
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#12141c] border border-amber-500/30 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Season Ballon d'Or MVP Race
            </h3>
            <button
              onClick={handleAwardBallonDor}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black text-[10px] font-black border border-amber-500/40 rounded-lg transition"
            >
              🥇 Award Ballon d'Or
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {getBallonDorRankings().length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No active match scores recorded to calculate rankings.</p>
            ) : (
              getBallonDorRankings().map((p, index) => (
                <div key={p.name} className="flex items-center justify-between bg-[#181a24] p-3 rounded-xl border border-gray-800 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`font-black text-sm ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-gray-600'}`}>
                      #{index + 1}
                    </span>
                    <span className="font-bold text-white uppercase">{p.name}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] font-bold">
                    <span className="text-emerald-400">{p.wins} Wins</span>
                    <span className="text-blue-400">{p.goals} Goals</span>
                    <span className="text-amber-400 font-extrabold">{p.points} Pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
        <form onSubmit={handleSaveCompetition} className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
            <Trophy className="w-5 h-5 text-[#d4af37]" /> {editingComp ? 'Edit Competition Details' : 'Publish / Create Competition'}
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tournament Title</label>
            <input
              type="text"
              placeholder="e.g. WEEKEND KNOCKOUT BLITZ"
              value={compInput.title}
              onChange={(e) => setCompInput({ ...compInput, title: e.target.value })}
              className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Summary / Description</label>
            <textarea
              placeholder="High-stakes fast-paced elimination tournament..."
              value={compInput.description}
              onChange={(e) => setCompInput({ ...compInput, description: e.target.value })}
              className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none h-20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Publish Status</label>
              <select
                value={compInput.status}
                onChange={(e) => setCompInput({ ...compInput, status: e.target.value as any })}
                className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
              >
                <option value="UPCOMING">Upcoming Tournament</option>
                <option value="ACTIVE">Active / Ongoing</option>
                <option value="COMPLETED">Completed / Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Format Type Tag</label>
              <input
                type="text"
                placeholder="e.g. WEEKLY FORMAT"
                value={compInput.formatType}
                onChange={(e) => setCompInput({ ...compInput, formatType: e.target.value })}
                className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {editingComp && (
              <button
                type="button"
                onClick={() => {
                  setEditingComp(null);
                  setCompInput({
                    title: '',
                    description: '',
                    status: 'UPCOMING',
                    formatType: 'LEAGUE FORMAT',
                    capacity: '16 Players Max',
                    prize: 'Golden Trophy & Badge',
                    matchFormatDescription: 'Group Stage + Knockouts',
                    rules: '',
                  });
                }}
                className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-extrabold rounded-lg transition text-xs"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b59228] text-black font-extrabold rounded-lg transition text-xs uppercase">
              {editingComp ? 'Update Competition' : 'Publish Competition'}
            </button>
          </div>
        </form>

        <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">
            Published Competitions ({competitions.length})
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {competitions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No competitions published yet.</p>
            ) : (
              competitions.map((c) => (
                <div key={c.id} className="bg-[#181a24] p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        • {c.status}
                      </span>
                      <h4 className="font-black text-white uppercase mt-1">{c.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Edit Competition"
                        onClick={() => {
                          setEditingComp(c);
                          setCompInput({
                            title: c.title,
                            description: c.description,
                            status: c.status,
                            formatType: c.format_type || 'LEAGUE FORMAT',
                            capacity: c.capacity || '16 Players Max',
                            prize: c.prize || 'Golden Trophy & Badge',
                            matchFormatDescription: c.match_format_description || 'Group Stage + Knockouts',
                            rules: c.rules || '',
                          });
                        }}
                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComp(c.id)}
                        className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-400 text-[11px] line-clamp-2">{c.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}