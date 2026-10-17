'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Swords, Trophy, Shield, Users, Calendar, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Player, Team, Match, Competition, Season } from './types';

// Import all our modular components
import UCLTournamentEngine from './components/UCLTournamentEngine';
import MatchRecorder from './components/MatchRecorder';
import CompetitionManager from './components/CompetitionManager';
import TeamManager from './components/TeamManager';
import PlayerDirectory from './components/PlayerDirectory';
import SeasonManager from './components/SeasonManager';
import PendingRegistrations from './components/PendingRegistrations';

export default function AdminDashboard() {
  const router = useRouter();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'matches' | 'competitions' | 'players' | 'teams' | 'seasons' | 'ucl'>('ucl');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Global Data State
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);

  // Auth check & Initial Fetch
  useEffect(() => {
    const isAuth = localStorage.getItem('invictus_admin');
    if (!isAuth) {
      router.push('/admin/login');
    } else {
      fetchAllData();
    }
  }, [router]);

  const fetchAllData = async () => {
    if (!supabase) return;
    
    // Fetch all required data concurrently
    const [
      { data: playerData },
      { data: teamData },
      { data: matchData },
      { data: compData },
      { data: seasonData }
    ] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('matches').select('*').order('created_at', { ascending: false }),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
      supabase.from('seasons').select('*').eq('status', 'Active').order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);

    if (playerData) setPlayers(playerData);
    if (teamData) setTeams(teamData);
    if (matchData) setMatches(seasonData ? matchData.filter((match) => match.season_id === seasonData.id) : []);
    if (compData) setCompetitions(compData);
    setActiveSeason(seasonData || null);
  };

  const handleLogout = () => {
    localStorage.removeItem('invictus_admin');
    router.push('/admin/login');
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#d4af37] tracking-wider uppercase">
            INVICTUS ADMIN CONTROL
          </h1>
          <p className="text-xs font-medium text-gray-400 mt-1">
            System Management • Authentic UCL Engine, Ballon d'Or & Player Records
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-bold rounded-lg flex items-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" /> Logout Admin
        </button>
      </div>

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold transition ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
              : 'bg-red-950/60 border-red-500/50 text-red-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <PendingRegistrations />

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveTab('ucl')}
          className={`px-4 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
            activeTab === 'ucl' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Real UCL Tournament Engine
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
            activeTab === 'matches' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Swords className="w-4 h-4" /> Record Matches (1v1 / 2v2)
        </button>
        <button
          onClick={() => setActiveTab('competitions')}
          className={`px-4 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
            activeTab === 'competitions' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Trophy className="w-4 h-4" /> Competitions & Ballon d'Or
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
            activeTab === 'teams' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Shield className="w-4 h-4" /> Manage Teams
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
            activeTab === 'players' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Users className="w-4 h-4" /> Player Directory
        </button>
        <button
          onClick={() => setActiveTab('seasons')}
          className={`px-4 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
            activeTab === 'seasons' ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#12141c] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Seasons
        </button>
      </div>

      {/* DYNAMIC COMPONENT RENDERING */}
      {activeTab === 'ucl' && (
        <UCLTournamentEngine players={players} matches={matches} activeSeason={activeSeason} onRefresh={fetchAllData} showToast={showToast} />
      )}

      {activeTab === 'matches' && (
        <MatchRecorder players={players} matches={matches} activeSeason={activeSeason} onRefresh={fetchAllData} showToast={showToast} />
      )}

      {activeTab === 'competitions' && (
        <CompetitionManager competitions={competitions} matches={matches} players={players} onRefresh={fetchAllData} showToast={showToast} />
      )}

      {activeTab === 'teams' && (
        <TeamManager teams={teams} players={players} onRefresh={fetchAllData} showToast={showToast} />
      )}

      {activeTab === 'players' && (
        <PlayerDirectory players={players} teams={teams} onRefresh={fetchAllData} showToast={showToast} />
      )}

      {activeTab === 'seasons' && (
        <SeasonManager activeSeason={activeSeason} onRefresh={fetchAllData} showToast={showToast} />
      )}
    </div>
  );
}