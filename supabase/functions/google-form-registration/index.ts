import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expectedSecret = Deno.env.get('GOOGLE_FORM_WEBHOOK_SECRET');
  const receivedSecret = request.headers.get('x-webhook-secret');
  if (!expectedSecret || receivedSecret !== expectedSecret) return json({ error: 'Unauthorized' }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const sourceSubmissionId = String(payload.source_submission_id || '').trim();
  const playerName = String(payload.player_name || '').trim();
  const efootballId = String(payload.efootball_id || '').trim();
  if (!sourceSubmissionId || playerName.length < 2 || playerName.length > 120) {
    return json({ error: 'source_submission_id and a valid player_name are required' }, 400);
  }
  if (efootballId.length > 120) return json({ error: 'efootball_id is too long' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase
    .from('player_registration_requests')
    .upsert({
      source_submission_id: sourceSubmissionId,
      player_name: playerName,
      efootball_id: efootballId || null,
      profile_photo_reference: String(payload.profile_photo_reference || '').trim() || null,
      squad_photo_reference: String(payload.squad_photo_reference || '').trim() || null,
      requested_team: String(payload.requested_team || '').trim() || null,
      contact_reference: String(payload.contact_reference || '').trim() || null,
      status: 'pending',
    }, { onConflict: 'source_submission_id', ignoreDuplicates: true })
    .select('id, status')
    .maybeSingle();

  if (error) return json({ error: 'Could not save registration request' }, 500);
  return json({ accepted: true, request: data || { source_submission_id: sourceSubmissionId } });
});
