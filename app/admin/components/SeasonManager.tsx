'use client';

import { FormEvent, useState } from 'react';
import { Archive, Calendar, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Season } from '../types';

interface SeasonManagerProps {
  activeSeason: Season | null;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export default function SeasonManager({ activeSeason, onRefresh, showToast }: SeasonManagerProps) {
  const [seasonName, setSeasonName] = useState('');
  const [busy, setBusy] = useState(false);

  const endSeason = async () => {
    if (!supabase || !activeSeason || busy) return;
    if (!confirm(`End and archive "${activeSeason.name}"? Official matches, trophies, player records, and team history will be preserved.`)) return;

    setBusy(true);
    const { error } = await supabase.from('seasons').update({ status: 'Completed' }).eq('id', activeSeason.id).eq('status', 'Active');
    setBusy(false);

    if (error) showToast('error', error.message);
    else {
      showToast('success', `Season "${activeSeason.name}" archived. Historical records were preserved.`);
      onRefresh();
    }
  };

  const createSeason = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = seasonName.trim();
    if (!supabase || !normalizedName || busy) {
      if (!normalizedName) showToast('error', 'Please enter a valid season name.');
      return;
    }

    const { data: duplicate } = await supabase.from('seasons').select('id').ilike('name', normalizedName).limit(1).maybeSingle();
    if (duplicate) {
      showToast('error', 'A season with this name already exists.');
      return;
    }

    if (!confirm(`Create "${normalizedName}" as the new active season?\n\nCarry forward: registered player and team identities, trophies, awards, and historical matches.\nReset: new-season fixtures, standings, points, and competition progress.\nNo historical rows will be deleted.`)) return;

    setBusy(true);
    if (activeSeason) {
      const { error: archiveError } = await supabase.from('seasons').update({ status: 'Completed' }).eq('id', activeSeason.id).eq('status', 'Active');
      if (archiveError) {
        setBusy(false);
        showToast('error', archiveError.message);
        return;
      }
    }

    const { error } = await supabase.from('seasons').insert([{ name: normalizedName, status: 'Active' }]);
    setBusy(false);

    if (error) {
      showToast('error', `New season was not created: ${error.message}`);
      return;
    }

    setSeasonName('');
    showToast('success', `Season "${normalizedName}" created. Historical matches and trophies remain intact.`);
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Calendar className="w-5 h-5 text-[#d4af37]" /> Season Lifecycle
        </h2>
        <div className="p-3 bg-[#181a24] border border-gray-800 rounded-xl text-xs text-gray-300">
          Active season: <strong className="text-[#d4af37]">{activeSeason?.name || 'None'}</strong>
        </div>
        <button type="button" onClick={endSeason} disabled={!activeSeason || busy} className="w-full py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 font-extrabold rounded-lg transition text-xs uppercase flex items-center justify-center gap-2">
          <Archive className="w-4 h-4" /> End Season & Archive
        </button>
      </div>

      <form onSubmit={createSeason} className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Plus className="w-5 h-5 text-[#d4af37]" /> Start New Season
        </h2>
        <input type="text" placeholder="e.g. Season 2 (2026)" value={seasonName} onChange={(event) => setSeasonName(event.target.value)} className="w-full p-2.5 bg-[#181a24] border border-gray-800 rounded-lg text-sm text-white focus:border-[#d4af37] focus:outline-none" required />
        <button type="submit" disabled={busy} className="w-full py-3 bg-[#d4af37] hover:bg-[#b59228] disabled:opacity-50 text-black font-extrabold rounded-lg transition text-xs uppercase">
          {busy ? 'Processing Season...' : 'Create New Active Season'}
        </button>
      </form>
    </div>
  );
}
