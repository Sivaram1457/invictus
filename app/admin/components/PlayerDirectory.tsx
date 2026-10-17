'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Users, Upload, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Player, Team } from '../types';

interface PlayerDirectoryProps {
  players: Player[];
  teams: Team[];
  onRefresh: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

const getTrophySeason = (trophy: string) => trophy.match(/Season:\s*([^|]+)/i)?.[1]?.trim() || 'Unassigned Season';

export default function PlayerDirectory({ players, teams, onRefresh, showToast }: PlayerDirectoryProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerData, setPlayerData] = useState({ name: '', efootballId: '', teamId: '' });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [squadFile, setSquadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFileToSupabase = async (file: File, folder: string): Promise<string> => {
    if (!supabase) return '';
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('player-avatars').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('player-avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleRegisterPlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setUploading(true);

    try {
      let profileUrl = editingPlayer ? editingPlayer.profile_photo || '' : '';
      let squadUrl = editingPlayer ? editingPlayer.squad_photo || '' : '';

      if (profileFile) profileUrl = await uploadFileToSupabase(profileFile, 'profiles');
      if (squadFile) squadUrl = await uploadFileToSupabase(squadFile, 'squads');

      if (editingPlayer) {
        const { error } = await supabase
          .from('players')
          .update({
            name: playerData.name.trim(),
            efootball_id: playerData.efootballId.trim(),
            team_id: playerData.teamId || null,
            avatar_url: profileUrl || null,
            profile_photo: profileUrl || null,
            squad_photo: squadUrl || null,
          })
          .eq('id', editingPlayer.id);

        if (error) throw error;
        showToast('success', `Player "${playerData.name}" updated successfully!`);
        setEditingPlayer(null);
      } else {
        const { error } = await supabase.from('players').insert([
          {
            name: playerData.name.trim(),
            efootball_id: playerData.efootballId.trim(),
            team_id: playerData.teamId || null,
            avatar_url: profileUrl || null,
            profile_photo: profileUrl || null,
            squad_photo: squadUrl || null,
            points: 0,
            trophies: [],
          },
        ]);

        if (error) throw error;
        showToast('success', `Player "${playerData.name}" registered successfully!`);
      }

      setPlayerData({ name: '', efootballId: '', teamId: '' });
      setProfileFile(null);
      setSquadFile(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Error processing player record');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this player?')) return;
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) showToast('error', error.message);
    else {
      showToast('success', 'Player deleted successfully!');
      onRefresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleRegisterPlayer} className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Users className="w-5 h-5 text-[#d4af37]" /> {editingPlayer ? 'Edit Player Profile' : 'Register New Player Profile'}
        </h2>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Player Name</label>
          <input
            type="text"
            placeholder="e.g. Sivaram"
            value={playerData.name}
            onChange={(e) => setPlayerData({ ...playerData, name: e.target.value })}
            className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">eFootball User ID</label>
          <input
            type="text"
            placeholder="e.g. 123-456-789"
            value={playerData.efootballId}
            onChange={(e) => setPlayerData({ ...playerData, efootballId: e.target.value })}
            className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Assign Team</label>
          <select
            value={playerData.teamId}
            onChange={(e) => setPlayerData({ ...playerData, teamId: e.target.value })}
            className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none"
          >
            <option value="">No Team (Free Agent)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Profile Photo / Avatar</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              id="profile-upload"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files[0]) {
                  setProfileFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="profile-upload"
              className="cursor-pointer px-4 py-2 bg-[#181a24] border border-gray-800 hover:border-[#d4af37]/50 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-2 transition"
            >
              <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
              {profileFile ? profileFile.name : 'Choose Profile Image'}
            </label>
            {profileFile && <span className="text-[10px] text-emerald-400 font-bold">Attached</span>}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {editingPlayer && (
            <button
              type="button"
              onClick={() => {
                setEditingPlayer(null);
                setPlayerData({ name: '', efootballId: '', teamId: '' });
                setProfileFile(null);
              }}
              className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-extrabold rounded-lg transition text-xs"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={uploading}
            className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b59228] text-black font-extrabold rounded-lg transition disabled:opacity-50 text-xs uppercase"
          >
            {uploading ? 'Uploading Media...' : editingPlayer ? 'Update Player' : 'Register Player'}
          </button>
        </div>
      </form>

      <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">
          Registered Players ({players.length})
        </h3>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {players.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No players registered yet.</p>
          ) : (
            players.map((p) => {
              const assignedTeam = teams.find((t) => t.id === p.team_id);
              return (
                <div key={p.id} className="bg-[#181a24] p-3.5 rounded-xl border border-gray-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.avatar_url || p.profile_photo ? (
                        <img
                          src={p.avatar_url || p.profile_photo}
                          alt={p.name}
                          className="w-9 h-9 rounded-lg object-cover border border-[#d4af37]/30"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#12141c] border border-[#d4af37]/30 flex items-center justify-center font-black text-[#d4af37] text-xs">
                          {p.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white uppercase text-sm">{p.name}</p>
                        <p className="text-[10px] text-gray-400">
                          ID: {p.efootball_id || 'N/A'} • Team: <span className="text-[#d4af37] font-bold">{assignedTeam ? assignedTeam.name : 'Free Agent'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        title="Edit Player Profile"
                        onClick={() => {
                          setEditingPlayer(p);
                          setPlayerData({
                            name: p.name,
                            efootballId: p.efootball_id || '',
                            teamId: p.team_id || '',
                          });
                        }}
                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete Player"
                        onClick={() => handleDeletePlayer(p.id)}
                        className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-gray-800/60">
                    <span className="text-[9px] font-extrabold text-gray-500 uppercase">Trophy Cabinet:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {p.trophies && p.trophies.length > 0 ? (
                        Object.entries(p.trophies.reduce<Record<string, string[]>>((groups, trophy) => {
                          const season = getTrophySeason(trophy);
                          groups[season] = groups[season] || [];
                          groups[season].push(trophy);
                          return groups;
                        }, {})).map(([season, trophies]) => (
                          <div key={season} className="w-full">
                            <span className="block text-[9px] font-black uppercase text-amber-500 mb-1">{season}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {trophies.map((trophy) => (
                                <span key={trophy} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[9px] font-black uppercase shadow-sm">{trophy}</span>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-600 italic">No trophies won yet</span>
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