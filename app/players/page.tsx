'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
  team_id?: string;
  avatar_url?: string;
}

interface Team {
  id: string;
  name: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDirectory = async () => {
      if (!supabase) return;
      const [{ data: playerData }, { data: teamData }] = await Promise.all([
        supabase.from('players').select('id, name, team_id, avatar_url').order('name'),
        supabase.from('teams').select('id, name'),
      ]);
      if (playerData) setPlayers(playerData);
      if (teamData) setTeams(teamData);
      setLoading(false);
    };
    loadDirectory();
  }, []);

  const visiblePlayers = players.filter((player) => player.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" /> Registered Roster Directory
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">PLAYER <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">PROFILES</span></h1>
          <p className="text-xs text-gray-400 mt-1">Select a player to open their complete profile and analysis.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search player name..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-[#12141c] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
        </div>
      </div>

      {loading ? <div className="py-20 text-center text-xs text-gray-500">Loading registered roster...</div> : visiblePlayers.length === 0 ? (
        <div className="py-20 text-center bg-[#12141c] border border-gray-800 rounded-2xl"><p className="text-sm font-bold text-gray-300">No players found.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePlayers.map((player) => {
            const team = teams.find((entry) => entry.id === player.team_id);
            return (
              <Link key={player.id} href={`/players/${encodeURIComponent(player.id)}`} className="bg-[#12141c] border border-gray-800 hover:border-[#d4af37]/50 rounded-2xl p-6 transition duration-300 relative overflow-hidden group cursor-pointer block">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="flex items-center gap-4">
                  {player.avatar_url ? <img src={player.avatar_url} alt={player.name} className="w-12 h-12 rounded-xl object-cover border border-[#d4af37]/30" /> : <div className="w-12 h-12 rounded-xl bg-[#181a24] border border-[#d4af37]/30 flex items-center justify-center font-black text-[#d4af37]">{player.name.slice(0, 2).toUpperCase()}</div>}
                  <div className="min-w-0"><h2 className="font-black text-white uppercase truncate group-hover:text-[#d4af37] transition">{player.name}</h2><p className="text-xs text-gray-500 font-bold uppercase mt-1 truncate">{team?.name || 'Free Agent'}</p></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
