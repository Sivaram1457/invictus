'use client';

import { useState, FormEvent } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Player, Team } from '../types';

interface TeamManagerProps {
  teams: Team[];
  players: Player[];
  onRefresh: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export default function TeamManager({ teams, players, onRefresh, showToast }: TeamManagerProps) {
  const [teamName, setTeamName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const handleSaveTeam = async (e: FormEvent) => {
    e.preventDefault();

    const codeToSave = shortCode.trim() 
      ? shortCode.trim().toUpperCase() 
      : (teamName.trim().substring(0, 3) + Math.floor(10 + Math.random() * 90)).toUpperCase();

    if (editingTeam) {
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamName.trim(),
          short_code: codeToSave,
        })
        .eq('id', editingTeam.id);

      if (error) showToast('error', error.message);
      else {
        showToast('success', `Team "${teamName}" updated successfully!`);
        setEditingTeam(null);
      }
    } else {
      const { error } = await supabase.from('teams').insert([
        { name: teamName.trim(), short_code: codeToSave }
      ]);
      if (error) showToast('error', error.message);
      else showToast('success', `Team "${teamName}" created with code (${codeToSave})!`);
    }

    setTeamName('');
    setShortCode('');
    onRefresh();
  };

  const handleDeleteTeam = async (teamId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete team "${name}"? Players in this team will become Free Agents.`)) return;

    await supabase.from('players').update({ team_id: null }).eq('team_id', teamId);
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    
    if (error) showToast('error', error.message);
    else {
      showToast('success', `Team "${name}" deleted successfully!`);
      onRefresh();
    }
  };

  const handleRemoveFromTeam = async (playerId: string) => {
    const { error } = await supabase.from('players').update({ team_id: null }).eq('id', playerId);
    if (error) showToast('error', error.message);
    else {
      showToast('success', 'Player removed from team squad!');
      onRefresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleSaveTeam} className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Shield className="w-5 h-5 text-[#d4af37]" /> {editingTeam ? 'Edit Team Details' : 'Create New Team (8 Players Max)'}
        </h2>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Team Name</label>
          <input
            type="text"
            placeholder="e.g. Invictus Knights"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Team Short Code (Unique Tag)</label>
          <input
            type="text"
            maxLength={5}
            placeholder="e.g. KNI (Leave empty for auto-generation)"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
            className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none uppercase"
          />
        </div>

        <div className="flex gap-2 pt-2">
          {editingTeam && (
            <button
              type="button"
              onClick={() => {
                setEditingTeam(null);
                setTeamName('');
                setShortCode('');
              }}
              className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-extrabold rounded-lg transition text-xs"
            >
              Cancel
            </button>
          )}
          <button type="submit" className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b59228] text-black font-extrabold rounded-lg transition text-xs uppercase">
            {editingTeam ? 'Update Team' : 'Create Team'}
          </button>
        </div>
      </form>

      <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">
          Registered Teams ({teams.length})
        </h3>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {teams.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No teams registered yet.</p>
          ) : (
            teams.map((t) => {
              const teamRoster = players.filter((p) => p.team_id === t.id);
              return (
                <div key={t.id} className="bg-[#181a24] p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-gray-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white uppercase text-sm">{t.name}</span>
                      <span className="text-[#d4af37] font-extrabold">({t.short_code})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Edit Team"
                        onClick={() => {
                          setEditingTeam(t);
                          setTeamName(t.name);
                          setShortCode(t.short_code);
                        }}
                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition text-xs"
                      >
                        Edit
                      </button>
                      <button
                        title="Delete Team"
                        onClick={() => handleDeleteTeam(t.id, t.name)}
                        className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">
                      Squad Roster ({teamRoster.length}/8 Players):
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {teamRoster.length === 0 ? (
                        <span className="text-[10px] text-gray-500 italic">No players assigned</span>
                      ) : (
                        teamRoster.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 bg-[#12141c] border border-gray-800 rounded text-[10px] font-bold text-gray-300 flex items-center gap-1"
                          >
                            {p.name}
                            <button
                              onClick={() => handleRemoveFromTeam(p.id)}
                              className="text-rose-400 hover:text-rose-300 ml-1 font-black"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}