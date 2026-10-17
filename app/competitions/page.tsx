'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, ChevronRight, Zap, Shield, Flame, BookOpen, Users, Award, X, Sparkles, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Competition {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  format_type: string;
  capacity: string;
  prize: string;
  match_format_description: string;
  rules?: string;
  created_at?: string;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [selectedRulesComp, setSelectedRulesComp] = useState<Competition | null>(null);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    setLoading(true);
    if (supabase) {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setCompetitions(data);
      }
    }
    setLoading(false);
  };

  const filteredCompetitions = competitions.filter((c) =>
    filter === 'ALL' ? true : c.status === filter
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy className="w-3.5 h-3.5" /> Tournament Formats & Leagues
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">
            OFFICIAL <span className="text-[#d4af37]">COMPETITIONS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse ongoing eFootball league fixtures, cup formats, upcoming tournaments, and official rulesets.
          </p>
        </div>

        {/* STATUS FILTER TABS */}
        <div className="flex flex-wrap gap-2 bg-[#12141c] p-1.5 rounded-xl border border-gray-800">
          {(['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition uppercase ${
                filter === status
                  ? 'bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20 font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#12141c] border border-gray-800 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-gray-800 rounded w-1/3"></div>
              <div className="h-7 bg-gray-800 rounded w-3/4"></div>
              <div className="h-12 bg-gray-800 rounded w-full"></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 bg-gray-800 rounded"></div>
                <div className="h-14 bg-gray-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCompetitions.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-[#12141c] border border-gray-800 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-lg font-bold text-white uppercase">No Competitions Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            There are currently no tournaments matching the selected status filter. Check back soon for official announcements!
          </p>
        </div>
      ) : (
        /* COMPETITIONS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCompetitions.map((c) => (
            <div
              key={c.id}
              className="bg-[#12141c] border border-gray-800 hover:border-[#d4af37]/50 rounded-2xl p-6 space-y-5 transition flex flex-col justify-between group relative overflow-hidden"
            >
              {/* STATUS BADGE & FORMAT TAG */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : c.status === 'UPCOMING'
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          : 'bg-gray-500/10 border border-gray-500/30 text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-400 animate-pulse'
                            : c.status === 'UPCOMING'
                            ? 'bg-amber-400'
                            : 'bg-gray-400'
                        }`}
                      ></span>
                      {c.status}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      • {c.format_type || 'LEAGUE FORMAT'}
                    </span>
                  </div>

                  <div className="p-2 bg-[#181a24] rounded-xl border border-gray-800 text-gray-400 group-hover:text-[#d4af37] transition">
                    {c.status === 'ACTIVE' ? (
                      <Flame className="w-4 h-4 text-emerald-400" />
                    ) : c.status === 'UPCOMING' ? (
                      <Zap className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Trophy className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* TOURNAMENT TITLE & DESCRIPTION */}
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wide group-hover:text-[#d4af37] transition">
                    {c.title}
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1.5 line-clamp-3">
                    {c.description}
                  </p>
                </div>

                {/* CAPACITY & PRIZE METRICS */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[#181a24] rounded-xl border border-gray-800/80">
                    <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-0.5">
                      <Users className="w-3 h-3 text-gray-400" /> Capacity
                    </span>
                    <span className="text-xs font-extrabold text-white">{c.capacity || 'Open Registration'}</span>
                  </div>
                  <div className="p-3 bg-[#181a24] rounded-xl border border-gray-800/80">
                    <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1 mb-0.5">
                      <Award className="w-3 h-3 text-[#d4af37]" /> Prize Pool
                    </span>
                    <span className="text-xs font-extrabold text-[#d4af37]">{c.prize || 'Trophy & Rank Points'}</span>
                  </div>
                </div>
              </div>

              {/* CARD FOOTER WITH RULES & FORMAT */}
              <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500 font-medium">
                  Format: <span className="text-gray-300 font-bold">{c.match_format_description || 'Standard Match Play'}</span>
                </span>

                {c.rules && (
                  <button
                    onClick={() => setSelectedRulesComp(c)}
                    className="px-3 py-1.5 bg-[#181a24] hover:bg-[#d4af37] hover:text-black border border-gray-700 hover:border-[#d4af37] rounded-lg text-xs font-bold text-gray-300 flex items-center gap-1.5 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Rules
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOURNAMENT RULES MODAL */}
      {selectedRulesComp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-gray-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative animate-fade-in">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] uppercase">
                  Official Guidelines
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-wide mt-1">
                  {selectedRulesComp.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRulesComp(null)}
                className="p-1.5 bg-[#181a24] hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* RULES CONTENT BODY */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div className="p-4 bg-[#181a24] rounded-xl border border-gray-800 space-y-2">
                <h4 className="text-xs font-bold text-[#d4af37] uppercase flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Rules & Match Standards
                </h4>
                <p className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedRulesComp.rules || 'No custom rules uploaded for this tournament.'}
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRulesComp(null)}
                className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#b59228] text-black font-extrabold rounded-lg text-xs transition"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}