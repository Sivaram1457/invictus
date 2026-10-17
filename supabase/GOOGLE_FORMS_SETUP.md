# INVICTUS Google Forms registration setup

This project does not assume that a Google Form, response spreadsheet, or Apps Script project already exists. The provided script creates them for you.

## Before starting

1. Apply `migrations/202610170001_player_registration_requests.sql` in Supabase.
2. Deploy `functions/google-form-registration`.
3. In Supabase Edge Function secrets, set:
   - `GOOGLE_FORM_WEBHOOK_SECRET`: generate a long random value.
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role key, only inside the Edge Function.
   - `SUPABASE_URL`: your project URL.
4. Do not put any of those values in the Google Form, response Sheet, browser code, or public `.env` variables.
5. Deploy `functions/review-player-registration` as well. Approval requires a Supabase Auth user with `app_metadata.role` set to `admin`.

## Create the Form, Sheet, and trigger

1. Open [script.google.com](https://script.google.com) and choose **New project**.
2. Open `supabase/google-form-registration.gs` from this repository.
3. Copy the complete script into the Apps Script editor and save it.
4. In Apps Script, open **Project Settings** -> **Script Properties** -> **Add script property**.
5. Add `SUPABASE_REGISTRATION_ENDPOINT` using the deployed URL shown by Supabase for `google-form-registration`. Do not guess this URL.
6. Add `SUPABASE_REGISTRATION_WEBHOOK_SECRET` using the exact same random value as the Edge Function secret.
7. Return to the editor, select `setupInvictusRegistration` in the function dropdown, and click **Run**.
8. Google will ask for authorization. Review the requested permissions and allow them. The script needs permission to create a Form, create a spreadsheet, install a trigger, and call the Supabase webhook.
9. Open **Execution log** after the run. It prints:
   - Form URL: share this with players.
   - Edit URL: keep this private for administrators.
   - Response Sheet URL: keep this private for administrators.
10. The script stores the Form and Sheet IDs in Script Properties. Running setup again reuses them and replaces only its own `onInvictusFormSubmit` trigger, preventing duplicate webhook calls.

## Fields created

The generated Form contains these exact questions:

- `Player Name` required
- `eFootball User ID`
- `Profile Photo or URL`
- `Squad Photo or URL`
- `Requested Team`

Team preference is only stored as a request. It does not assign a team, season, ranking, match, or trophy.

## Verify the trigger

1. In Apps Script, open **Triggers** (clock icon).
2. Confirm one trigger exists for `onInvictusFormSubmit`.
3. Its event source must be **From spreadsheet** and event type **On form submit**.
4. Submit one test Form response.
5. Confirm a new row appears in the response Sheet.
6. Check Apps Script **Executions** for a successful `onInvictusFormSubmit` run.
7. Check the INVICTUS admin **Pending Registrations** queue. The request must be pending and must not yet appear as a player.

## Idempotency and approval

The script creates `source_submission_id` as `response-spreadsheet-id:row-number`. Retrying the same spreadsheet event sends the same identifier. The Supabase Edge Function stores it under the unique constraint on `player_registration_requests`, so retries do not create duplicate queue rows.

A request remains pending until an authenticated Supabase admin uses the INVICTUS review queue. Approval checks the request status and eFootball ID before creating one player. Rejection creates no player. Neither action automatically assigns a requested team or season.

The current legacy admin login uses localStorage and is not a secure backend identity. The queue intentionally does not bypass RLS with that flag. Configure Supabase Auth for admin reviewers and set the user metadata claim:

```json
{"role":"admin"}
```

## Photo limitations

Google Forms native File Upload questions require Google sign-in and save files in Drive with permissions controlled by the Form owner. A Drive URL may not be publicly readable by the INVICTUS website. This setup therefore creates URL/reference fields instead of assuming Drive files are public.

Recommended options:

- Use publicly accessible image URLs only when the owner intentionally grants access.
- Keep Drive references private for admin review and move approved media through the existing Supabase Storage upload workflow.
- Do not put private Drive credentials or service-role credentials in the Form or Sheet.

## Testing checklist

- [ ] Migration applied successfully.
- [ ] Both Edge Functions deployed.
- [ ] Edge Function secrets configured.
- [ ] Apps Script properties configured.
- [ ] One installable spreadsheet form-submit trigger exists.
- [ ] Test response creates exactly one pending queue request.
- [ ] Replaying the same response does not create a second request.
- [ ] Public users cannot read the queue.
- [ ] A Supabase Auth admin can approve a valid request.
- [ ] Approval creates exactly one player and marks the request approved.
- [ ] Duplicate eFootball IDs are rejected.
- [ ] Rejection records a reason and creates no player.
- [ ] Manual admin player registration still works.
- [ ] Approved players appear in the existing player directory without affecting matches, rankings, trophies, or seasons before approval.
