import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Authentication required' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') return json({ error: 'Admin authorization required' }, 403);

  const body = await request.json();
  const requestId = String(body.request_id || '').trim();
  const action = String(body.action || '').trim();
  if (!requestId || !['approve', 'reject'].includes(action)) return json({ error: 'Invalid review request' }, 400);

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: registration, error: loadError } = await adminClient.from('player_registration_requests').select('*').eq('id', requestId).maybeSingle();
  if (loadError || !registration) return json({ error: 'Registration request not found' }, 404);
  if (registration.status !== 'pending') return json({ error: 'Registration request was already processed' }, 409);

  if (action === 'reject') {
    const { error } = await adminClient.from('player_registration_requests').update({ status: 'rejected', rejection_reason: String(body.reason || '').trim() || null, reviewed_at: new Date().toISOString(), reviewer_id: user.id }).eq('id', requestId).eq('status', 'pending');
    return error ? json({ error: 'Could not reject registration' }, 500) : json({ status: 'rejected' });
  }

  const name = registration.player_name.trim();
  if (name.length < 2 || name.length > 120) return json({ error: 'Invalid player name' }, 400);
  if (registration.efootball_id) {
    const { data: duplicate } = await adminClient.from('players').select('id').eq('efootball_id', registration.efootball_id).maybeSingle();
    if (duplicate) return json({ error: 'A player with this eFootball ID already exists' }, 409);
  }

  const { data: created, error: playerError } = await adminClient.from('players').insert({ name, efootball_id: registration.efootball_id || null, avatar_url: registration.profile_photo_reference || null, profile_photo: registration.profile_photo_reference || null, squad_photo: registration.squad_photo_reference || null, points: 0, trophies: [] }).select('id').single();
  if (playerError || !created) return json({ error: 'Could not create player' }, 500);

  const { error: markError } = await adminClient.from('player_registration_requests').update({ status: 'approved', created_player_id: created.id, reviewed_at: new Date().toISOString(), reviewer_id: user.id }).eq('id', requestId).eq('status', 'pending');
  if (markError) return json({ error: 'Player created but request could not be finalized; investigate before retrying' }, 500);
  return json({ status: 'approved', player_id: created.id });
});
