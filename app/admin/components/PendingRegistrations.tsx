'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RegistrationRequest {
  id: string;
  player_name: string;
  efootball_id?: string;
  profile_photo_reference?: string;
  squad_photo_reference?: string;
  requested_team?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  rejection_reason?: string;
}

export default function PendingRegistrations() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const review = async (requestId: string, action: 'approve' | 'reject') => {
    if (!supabase || !confirm(`${action === 'approve' ? 'Approve' : 'Reject'} this registration?`)) return;
    const reason = action === 'reject' ? window.prompt('Rejection reason (optional):') || '' : '';
    const { error: reviewError } = await supabase.functions.invoke('review-player-registration', { body: { request_id: requestId, action, reason } });
    if (reviewError) {
      setError('Review failed. Confirm Supabase Auth admin claims and Edge Function deployment.');
      return;
    }
    setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: action === 'approve' ? 'approved' : 'rejected', rejection_reason: reason } : request));
  };

  useEffect(() => {
    const loadRequests = async () => {
      if (!supabase) return;
      const { data, error: requestError } = await supabase
        .from('player_registration_requests')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (requestError) setError('Registration queue is not available to this account. Configure Supabase Auth admin claims and RLS before reviewing requests.');
      if (data) setRequests(data);
      setLoading(false);
    };
    loadRequests();
  }, []);

  return (
    <section className="bg-[#12141c] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <h2 className="text-sm font-black text-white uppercase flex items-center gap-2"><Clock3 className="w-4 h-4 text-[#d4af37]" /> Pending Registrations</h2>
        <span className="text-[10px] text-gray-500 uppercase">Secure review queue</span>
      </div>
      {loading && <p className="text-xs text-gray-500">Loading registration queue...</p>}
      {error && <p className="text-xs text-amber-400">{error}</p>}
      {!loading && !error && requests.length === 0 && <p className="text-xs text-gray-500">No registration requests found.</p>}
      {!loading && !error && requests.map((request) => (
        <div key={request.id} className="bg-[#181a24] border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
          <div><p className="font-bold text-white">{request.player_name}</p><p className="text-xs text-gray-400">eFootball ID: {request.efootball_id || 'N/A'}</p><p className="text-[10px] text-gray-500 mt-1">{request.requested_team || 'No team requested'} · {request.status}</p>{request.status === 'pending' && <div className="flex gap-2 mt-3"><button type="button" onClick={() => review(request.id, 'approve')} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold uppercase">Approve</button><button type="button" onClick={() => review(request.id, 'reject')} className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded text-[10px] font-bold uppercase">Reject</button></div>}</div>
          <span className={request.status === 'approved' ? 'text-emerald-400' : request.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'}>{request.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : request.status === 'rejected' ? <XCircle className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}</span>
        </div>
      ))}
    </section>
  );
}
