'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Users, 
  UserCheck, 
  UserPlus, 
  AlertCircle, 
  Trophy, 
  ChevronRight, 
  PlusCircle,
  Award
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// TYPES
interface Player {
  id: string;
  name: string;
  team_id?: string;
  points: number;
  trophies?: string[]; // Added property to hold the player's trophies array
}

interface Team {
  id: string;
  name: string;
  short_code: string;
  logo_url?: string;
  players?: Player[];
  team_trophies?: string[]; // Holds a combined/deduplicated list of all trophies won by team members
}

const DEFAULT_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Invictus Titans',
    short_code: 'TIT',
    players: [
      { id: '1', name: 'Sivaram A M', points: 42, trophies: [] },
      { id: '2', name: 'Gokul Priyan', points: 38, trophies: [] },
      { id: '3', name: 'Nitin', points: 31, trophies: [] },
      { id: '4', name: 'Sujith', points: 29, trophies: [] },
    ],
  },
  {
    id: 'team-2',
    name: 'Apex Strikers',
    short_code: 'APX',
    players: [], // Team created with 0 players initially
  },
];

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTeams() {
      if (supabase) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*');

        // Fetching players, now including the newly added `trophies` column
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*');

        if (!teamError && teamData && teamData.length > 0) {
          const mappedTeams = teamData.map((t) => {
            const teamPlayers = playerData ? playerData.filter((p) => p.team_id === t.id) : [];
            
            // Calculate a consolidated, distinct list of trophies won by the members of this team
            const combinedTrophies = Array.from(new Set(
              teamPlayers.flatMap((p) => p.trophies || [])
            ));

            return {
              ...t,
              players: teamPlayers,
              team_trophies: combinedTrophies,
            };
          });
          setTeams(mappedTeams);
        }
      }
      setLoading(false);
    }

    fetchTeams();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" /> Official Team Squads
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">
            SQUAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]">ROSTERS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Registered team franchises and consolidated trophy cabinets across all squad members.
          </p>
        </div>

        {/* RULE BANNER */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12141c] border border-[#d4af37]/30 rounded-xl text-xs text-[#d4af37] font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Max Cap: 8 Players | Squads can be updated later by Admin</span>
        </div>
      </div>

      {/* TEAMS GRID */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-500">Loading team rosters...</div>
      ) : teams.length === 0 ? (
        <div className="py-20 text-center space-y-2 bg-[#12141c] border border-gray-800 rounded-2xl">
          <p className="text-sm font-bold text-gray-300">No teams registered yet.</p>
          <p className="text-xs text-gray-500">Create new teams via the Admin Panel to populate squad rosters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const squad = team.players || [];
            const squadCount = squad.length;
            const maxCap = 8;
            const isFull = squadCount >= maxCap;
            const hasTrophies = team.team_trophies && team.team_trophies.length > 0;

            return (
              <div
                key={team.id}
                className="bg-[#12141c] border border-gray-800 hover:border-[#d4af37]/50 rounded-2xl p-6 space-y-5 transition duration-300 relative overflow-hidden group flex flex-col justify-between"
              >
                {/* TOP ACCENT BAR */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-0 group-hover:opacity-100 transition" />

                <div className="space-y-4">
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#181a24] border border-[#d4af37]/40 flex items-center justify-center font-black text-[#d4af37] text-base tracking-wider shadow-inner">
                        {team.short_code}
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-white group-hover:text-[#d4af37] transition uppercase tracking-wide">
                          {team.name}
                        </h2>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#d4af37]" /> Code: {team.short_code}
                        </span>
                      </div>
                    </div>

                    {/* CAPACITY BADGE */}
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isFull
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {squadCount} / {maxCap} Players
                      </span>
                    </div>
                  </div>

                  {/* SQUAD LIST */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase">
                      <span>Squad Roster ({squadCount})</span>
                      <span>Total Points</span>
                    </div>

                    {squad.length === 0 ? (
                      <div className="p-4 bg-[#181a24]/50 border border-dashed border-gray-800 rounded-xl text-center space-y-2">
                        <p className="text-xs text-gray-400 font-medium">No players added to this team yet.</p>
                        <Link
                          href="/admin"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#d4af37] hover:underline"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Assign Players via Admin
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {squad.map((player) => (
                          <div
                            key={player.id}
                            className="p-2.5 bg-[#181a24] border border-gray-800/80 rounded-xl flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-gray-200 flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> {player.name}
                            </span>
                            <span className="font-black text-[#d4af37]">{player.points || 0} PTS</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* TEAM TROPHY CABINET (COMBINED FROM ALL PLAYERS) */}
                  <div className="pt-3 mt-3 border-t border-gray-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                        Combined Team Trophy Cabinet
                      </span>
                      {hasTrophies && (
                        <span className="text-[10px] text-amber-500 font-bold">
                          {team.team_trophies?.length} Titles
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {hasTrophies ? (
                        team.team_trophies!.map((trophy, tIdx) => (
                          <div 
                            key={tIdx} 
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#181a24] border border-amber-500/30 text-amber-400 rounded text-[9px] font-bold uppercase shadow-sm group-hover:border-amber-500/60 transition-colors"
                          >
                            <Award className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{trophy}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-600 font-medium italic p-2 bg-[#181a24]/50 border border-dashed border-gray-800 rounded-lg w-full text-center">
                          No official honors collected by this squad yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div className="pt-4 border-t border-gray-800/80 mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-medium">
                    {isFull ? 'Roster Full (8/8)' : `${maxCap - squadCount} Open Spot(s) Available`}
                  </span>

                  <Link
                    href="/players"
                    className="inline-flex items-center gap-1 text-xs font-black text-[#d4af37] hover:text-[#f3e5ab] transition uppercase tracking-wider"
                  >
                    View Player Profiles <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}