'use client';

import { useState, FormEvent } from 'react';
import { Plus, Swords, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Match, Player, Season } from '../types';

interface MatchRecorderProps {
  players: Player[];
  matches: Match[];
  activeSeason: Season | null;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export default function MatchRecorder({ players, matches, activeSeason, onRefresh, showToast }: MatchRecorderProps) {
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchData, setMatchData] = useState({
    competitionType: 'LEAGUE',
    homePlayerId: '',
    homePlayer2Id: '',
    awayPlayerId: '',
    awayPlayer2Id: '',
    homeScore: 0,
    awayScore: 0,
  });

  const handleRecordMatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!activeSeason) {
      showToast('error', 'Create or activate a season before recording matches.');
      return;
    }

    const isDuo = matchData.competitionType === 'DUO';

    if (!isDuo && matchData.homePlayerId === matchData.awayPlayerId) {
      showToast('error', 'Home and Away players cannot be the same!');
      return;
    }

    if (isDuo) {
      if (!matchData.homePlayer2Id || !matchData.awayPlayer2Id) {
        showToast('error', 'Please select both players for Home and Away Duo teams!');
        return;
      }
      const selectedSet = new Set([
        matchData.homePlayerId,
        matchData.homePlayer2Id,
        matchData.awayPlayerId,
        matchData.awayPlayer2Id,
      ]);
      if (selectedSet.size < 4) {
        showToast('error', 'All 4 players in a 2v2 Duo match must be unique!');
        return;
      }
    }

    const homeFormattedName = isDuo
      ? `${matchData.homePlayerId} / ${matchData.homePlayer2Id}`
      : matchData.homePlayerId;

    const awayFormattedName = isDuo
      ? `${matchData.awayPlayerId} / ${matchData.awayPlayer2Id}`
      : matchData.awayPlayerId;

    if (editingMatch) {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: Number(matchData.homeScore),
          away_score: Number(matchData.awayScore),
          competition_type: matchData.competitionType,
                  season_id: activeSeason.id,
        })
        .eq('id', editingMatch.id);

      if (error) showToast('error', error.message);
      else {
        showToast('success', 'Match updated successfully!');
        setEditingMatch(null);
      }
    } else {
      const { error } = await supabase.from('matches').insert([
        {
          home_player_id: homeFormattedName,
          away_player_id: awayFormattedName,
          home_score: Number(matchData.homeScore),
          away_score: Number(matchData.awayScore),
          competition_type: matchData.competitionType,
        },
      ]);

      if (error) showToast('error', error.message);
      else showToast('success', `${isDuo ? '2v2 Duo' : '1v1'} Match score recorded successfully!`);
    }

    setMatchData({
      competitionType: 'LEAGUE',
      homePlayerId: '',
      homePlayer2Id: '',
      awayPlayerId: '',
      awayPlayer2Id: '',
      homeScore: 0,
      awayScore: 0,
    });
    onRefresh();
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this match record?')) return;
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) showToast('error', error.message);
    else {
      showToast('success', 'Match deleted successfully!');
      onRefresh();
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleRecordMatch} className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-6 max-w-2xl shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Plus className="w-5 h-5 text-[#d4af37]" /> {editingMatch ? 'Edit Match Score' : 'Submit Official Match Score'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Competition Type</label>
            <select
              value={matchData.competitionType}
              onChange={(e) => setMatchData({ ...matchData, competitionType: e.target.value })}
              className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
            >
              <option value="LEAGUE">Invictus Premier League (1v1)</option>
              <option value="WEEKLY">Weekly Tournament Blitz (1v1)</option>
              <option value="DUO">Duo Tournament (2v2 Team Match)</option>
              <option value="CHAMPIONSHIP">Major Championship (1v1)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-[#181a24] rounded-xl border border-gray-800 space-y-3">
              <label className="block text-xs font-bold text-[#d4af37] uppercase">
                {matchData.competitionType === 'DUO' ? 'Home Team (Duo Players 1 & 2)' : 'Home Player'}
              </label>
              
              <select
                value={matchData.homePlayerId}
                disabled={!!editingMatch}
                onChange={(e) => setMatchData({ ...matchData, homePlayerId: e.target.value })}
                className="w-full p-2.5 bg-[#12141c] border border-gray-800 rounded text-sm text-white disabled:opacity-50"
                required
              >
                <option value="">Select Home Player 1</option>
                {players.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              {matchData.competitionType === 'DUO' && (
                <select
                  value={matchData.homePlayer2Id}
                  disabled={!!editingMatch}
                  onChange={(e) => setMatchData({ ...matchData, homePlayer2Id: e.target.value })}
                  className="w-full p-2.5 bg-[#12141c] border border-[#d4af37]/40 rounded text-sm text-white disabled:opacity-50 mt-2"
                  required
                >
                  <option value="">Select Home Player 2 (Duo Partner)</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              )}

              <div>
                <label className="text-[10px] text-gray-400 uppercase">Goals Scored</label>
                <input
                  type="number"
                  min="0"
                  value={matchData.homeScore}
                  onChange={(e) => setMatchData({ ...matchData, homeScore: Number(e.target.value) })}
                  className="w-full mt-1 p-2 bg-[#12141c] border border-gray-800 rounded text-center text-xl font-bold text-[#d4af37]"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-[#181a24] rounded-xl border border-gray-800 space-y-3">
              <label className="block text-xs font-bold text-[#d4af37] uppercase">
                {matchData.competitionType === 'DUO' ? 'Away Team (Duo Players 1 & 2)' : 'Away Player'}
              </label>

              <select
                value={matchData.awayPlayerId}
                disabled={!!editingMatch}
                onChange={(e) => setMatchData({ ...matchData, awayPlayerId: e.target.value })}
                className="w-full p-2.5 bg-[#12141c] border border-gray-800 rounded text-sm text-white disabled:opacity-50"
                required
              >
                <option value="">Select Away Player 1</option>
                {players.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              {matchData.competitionType === 'DUO' && (
                <select
                  value={matchData.awayPlayer2Id}
                  disabled={!!editingMatch}
                  onChange={(e) => setMatchData({ ...matchData, awayPlayer2Id: e.target.value })}
                  className="w-full p-2.5 bg-[#12141c] border border-[#d4af37]/40 rounded text-sm text-white disabled:opacity-50 mt-2"
                  required
                >
                  <option value="">Select Away Player 2 (Duo Partner)</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              )}

              <div>
                <label className="text-[10px] text-gray-400 uppercase">Goals Scored</label>
                <input
                  type="number"
                  min="0"
                  value={matchData.awayScore}
                  onChange={(e) => setMatchData({ ...matchData, awayScore: Number(e.target.value) })}
                  className="w-full mt-1 p-2 bg-[#12141c] border border-gray-800 rounded text-center text-xl font-bold text-[#d4af37]"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {editingMatch && (
            <button
              type="button"
              onClick={() => {
                setEditingMatch(null);
                setMatchData({
                  competitionType: 'LEAGUE',
                  homePlayerId: '',
                  homePlayer2Id: '',
                  awayPlayerId: '',
                  awayPlayer2Id: '',
                  homeScore: 0,
                  awayScore: 0,
                });
              }}
              className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-extrabold rounded-lg transition text-xs"
            >
              Cancel
            </button>
          )}
          <button type="submit" className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b59228] text-black font-extrabold rounded-lg transition text-xs uppercase">
            {editingMatch ? 'Update Match Score' : 'Save Match Result'}
          </button>
        </div>
      </form>

      <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl max-w-2xl space-y-3 shadow-xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#d4af37]" /> All Recorded Matches Database ({matches.filter(m => m.competition_type !== 'UCL').length})
        </h3>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {matches.filter(m => m.competition_type !== 'UCL').length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No non-UCL matches recorded yet.</p>
          ) : (
            matches.filter(m => m.competition_type !== 'UCL').map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-[#181a24] p-3 rounded-xl border border-gray-800 text-xs">
                <div>
                  <span className="font-bold text-white uppercase">{m.home_player_id}</span>
                  <span className="text-[#d4af37] font-black mx-2">{m.home_score} - {m.away_score}</span>
                  <span className="font-bold text-white uppercase">{m.away_player_id}</span>
                  <span className="text-[10px] text-gray-500 ml-3">({m.competition_type})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    title="Edit Match"
                    onClick={() => {
                      setEditingMatch(m);
                      setMatchData({
                        competitionType: m.competition_type,
                        homePlayerId: m.home_player_id,
                        homePlayer2Id: '',
                        awayPlayerId: m.away_player_id,
                        awayPlayer2Id: '',
                        homeScore: m.home_score,
                        awayScore: m.away_score,
                      });
                    }}
                    className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Delete Match"
                    onClick={() => handleDeleteMatch(m.id)}
                    className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}