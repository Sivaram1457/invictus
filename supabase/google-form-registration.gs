/**
 * INVICTUS Google Forms -> Supabase registration setup.
 * Run setupInvictusRegistration once after configuring Script Properties.
 */
function setupInvictusRegistration() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('SUPABASE_REGISTRATION_ENDPOINT');
  const webhookSecret = props.getProperty('SUPABASE_REGISTRATION_WEBHOOK_SECRET');
  if (!endpoint || !webhookSecret) {
    throw new Error('Set SUPABASE_REGISTRATION_ENDPOINT and SUPABASE_REGISTRATION_WEBHOOK_SECRET first.');
  }

  let form;
  let spreadsheet;
  const formId = props.getProperty('INVICTUS_FORM_ID');
  const spreadsheetId = props.getProperty('INVICTUS_RESPONSE_SPREADSHEET_ID');

  if (formId) {
    form = FormApp.openById(formId);
  } else {
    form = FormApp.create('INVICTUS Player Registration');
    form.setDescription('Submit your player details for INVICTUS admin review. Submission does not automatically create a player or assign a team.');
    form.setConfirmationMessage('Registration received. An INVICTUS administrator will review it before approval.');
    form.addTextItem().setTitle('Player Name').setRequired(true);
    form.addTextItem().setTitle('eFootball User ID').setRequired(false);
    form.addTextItem().setTitle('Profile Photo or URL').setHelpText('Paste an accessible image URL. Google Drive links may require permission.').setRequired(false);
    form.addTextItem().setTitle('Squad Photo or URL').setHelpText('Paste an accessible image URL. Google Drive links may require permission.').setRequired(false);
    form.addTextItem().setTitle('Requested Team').setHelpText('Optional preference. Admin approval controls final assignment.').setRequired(false);
    props.setProperty('INVICTUS_FORM_ID', form.getId());
  }

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('INVICTUS Player Registration Responses');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
    props.setProperty('INVICTUS_RESPONSE_SPREADSHEET_ID', spreadsheet.getId());
  }

  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === 'onInvictusFormSubmit') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onInvictusFormSubmit').forSpreadsheet(spreadsheet).onFormSubmit().create();

  Logger.log('Form URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());
  Logger.log('Response Sheet URL: ' + spreadsheet.getUrl());
  Logger.log('Trigger installed for onInvictusFormSubmit.');
}

function onInvictusFormSubmit(e) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('SUPABASE_REGISTRATION_ENDPOINT');
  const webhookSecret = props.getProperty('SUPABASE_REGISTRATION_WEBHOOK_SECRET');
  if (!endpoint || !webhookSecret) throw new Error('Supabase endpoint or webhook secret is not configured');

  const named = e.namedValues || {};
  const value = (name) => named[name] && named[name][0] ? String(named[name][0]).trim() : '';
  const sourceSubmissionId = e.range.getSheet().getParent().getId() + ':' + e.range.getRow();
  const payload = {
    source_submission_id: sourceSubmissionId,
    player_name: value('Player Name'),
    efootball_id: value('eFootball User ID'),
    profile_photo_reference: value('Profile Photo or URL'),
    squad_photo_reference: value('Squad Photo or URL'),
    requested_team: value('Requested Team'),
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-webhook-secret': webhookSecret },
    payload: JSON.stringify(payload),
  });
  if (response.getResponseCode() >= 300) throw new Error('Supabase registration webhook rejected the submission: HTTP ' + response.getResponseCode());
}
