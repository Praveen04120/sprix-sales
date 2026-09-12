/**
 * SPRIX SALES HIRING PLATFORM - PRODUCTION GOOGLE APPS SCRIPT API
 * 
 * Version: 2.2.0 (Production / Explicit Spreadsheet ID Access)
 * Purpose: Connects real Google Forms & Google Sheets to Sprix Hiring Management.
 * 
 * ARCHITECTURE & DATA SAFETY:
 * 1. Explicit Spreadsheet ID: Opens target spreadsheet using SpreadsheetApp.openById().
 *    Zero dependency on active spreadsheet UI container context (robust for standalone Web Apps).
 * 2. Strictly Read-Only Sync: Normal sync & data fetches NEVER mutate, append, or delete real form responses.
 * 3. Separate Internal Sheets:
 *    - Sprix_Candidate_Metadata: Tracks Status, Final Scores (0-10), Joining Dates, Roles, Notes.
 *    - Sprix_Calendar: Persists all scheduled calls, phone interviews, training sessions.
 *    - Sprix_Manual_Candidates: Persists candidates created via "+ Add Candidate".
 * 4. Test Environment Isolation: Mutation actions accept an optional `sheetId` parameter to test against a separate test sheet.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet (where Google Form responses land).
 * 2. Click: Extensions > Apps Script.
 * 3. Replace all contents of Code.gs with this code and save (Ctrl+S).
 * 4. In the toolbar function dropdown, select "testSpreadsheetAccess" and click "Run".
 *    - Click "Review permissions" > choose your Google account > "Advanced" > "Go to Untitled project (unsafe)" > "Allow".
 *    - This grants the required https://www.googleapis.com/auth/spreadsheets permission.
 * 5. In the toolbar, select "setupSprixSystem" and click "Run" once to prepare helper sheets if needed.
 * 6. Click "Deploy" > "Manage deployments" > click pencil icon > Version: "New version" > click "Deploy".
 *    (Or click "Deploy" > "New deployment" > Web app > Execute as "Me", Access "Anyone").
 * 7. Copy the Web App URL and paste it into your Sprix Platform Settings.
 */

var DEFAULT_SPREADSHEET_ID = '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ';

var INTERNAL_SHEETS = {
  CALENDAR: 'Sprix_Calendar',
  INTERNAL_METADATA: 'Sprix_Candidate_Metadata',
  MANUAL_CANDIDATES: 'Sprix_Manual_Candidates'
};

/**
 * Diagnostic test function: Run directly from Apps Script editor toolbar.
 * Authorizes permissions and verifies explicit read access to the recruitment spreadsheet.
 */
function testSpreadsheetAccess() {
  Logger.log('Testing explicit access to Google Sheet ID: ' + DEFAULT_SPREADSHEET_ID);
  try {
    var ss = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
    var name = ss.getName();
    var sheets = ss.getSheets();
    Logger.log('SUCCESS: Opened spreadsheet "' + name + '"');
    Logger.log('Detected ' + sheets.length + ' sheet tabs:');
    for (var i = 0; i < sheets.length; i++) {
      Logger.log('  [' + (i + 1) + '] "' + sheets[i].getName() + '" (' + sheets[i].getLastRow() + ' rows, ' + sheets[i].getLastColumn() + ' cols)');
    }
    return {
      success: true,
      sheetTitle: name,
      totalSheets: sheets.length,
      sheets: sheets.map(function(s) { return s.getName(); })
    };
  } catch (err) {
    var errDetail = err.message || err.toString();
    Logger.log('ERROR opening spreadsheet: ' + errDetail);
    throw new Error('SpreadsheetApp.openById failed: ' + errDetail);
  }
}

/**
 * Run setup once to prepare the Calendar, metadata, and manual candidate helper sheets.
 * Existing form responses and existing sheets are completely untouched.
 */
function setupSprixSystem() {
  var resolved = resolveSpreadsheet(null);
  var ss = resolved.spreadsheet;
  if (!ss) {
    Logger.log('setupSprixSystem failed: ' + resolved.error);
    return;
  }
  
  // 1. Create Calendar sheet if not present
  var calSheet = ss.getSheetByName(INTERNAL_SHEETS.CALENDAR);
  if (!calSheet) {
    calSheet = ss.insertSheet(INTERNAL_SHEETS.CALENDAR);
    calSheet.appendRow([
      'Event ID',
      'Candidate ID',
      'Candidate Name',
      'Event Type',
      'Start Date',
      'End Date',
      'Start Time',
      'End Time',
      'Reason',
      'Notes',
      'Status'
    ]);
    formatHeaderRow(calSheet);
  }
  
  // 2. Create Internal Metadata sheet if not present
  var metaSheet = ss.getSheetByName(INTERNAL_SHEETS.INTERNAL_METADATA);
  if (!metaSheet) {
    metaSheet = ss.insertSheet(INTERNAL_SHEETS.INTERNAL_METADATA);
    metaSheet.appendRow([
      'Candidate ID',
      'Current Status',
      'Final Score',
      'Joining Date',
      'Role',
      'Call Reason',
      'Call Status',
      'Notes',
      'Last Updated'
    ]);
    formatHeaderRow(metaSheet);
  }

  // 3. Create Manual Candidates sheet if not present
  var manualSheet = ss.getSheetByName(INTERNAL_SHEETS.MANUAL_CANDIDATES);
  if (!manualSheet) {
    manualSheet = ss.insertSheet(INTERNAL_SHEETS.MANUAL_CANDIDATES);
    manualSheet.appendRow([
      'Candidate ID',
      'Timestamp',
      'Full Name',
      'Phone / Whatsapp',
      'Email Address',
      'Location',
      'Source'
    ]);
    formatHeaderRow(manualSheet);
  }
  
  Logger.log('Sprix Hiring System initialized safely.');
}

/**
 * Handle HTTP GET: Reads real candidates and calendar records from spreadsheet.
 * STRICTLY READ ONLY — Zero rows appended, updated, or deleted.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // 1. Fast ping response for healthcheck
    if (params.action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'Sprix Google Apps Script API is active',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Explicitly resolve the spreadsheet
    var resolved = resolveSpreadsheet(params);
    if (!resolved.spreadsheet) {
      return jsonResponse({
        success: false,
        error: resolved.error,
        configuredSheetId: resolved.sheetId
      });
    }

    var ss = resolved.spreadsheet;

    // 3. Test connection probe (Settings page test)
    if (params.action === 'test_access') {
      var allTabs = ss.getSheets();
      var tabNames = [];
      for (var t = 0; t < allTabs.length; t++) {
        tabNames.push(allTabs[t].getName());
      }
      return jsonResponse({
        success: true,
        message: 'Google Sheets connection verified successfully',
        sheetTitle: ss.getName(),
        sheetId: ss.getId(),
        sheetTabs: tabNames,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Read candidates and calendar (strictly read-only)
    var candidates = getRealCandidatesData(ss);
    var calendar = getRealCalendarData(ss);
    
    return jsonResponse({
      success: true,
      timestamp: new Date().toISOString(),
      candidates: candidates,
      calendar: calendar,
      sheetTitle: ss.getName(),
      totalCandidates: candidates.length,
      sheetId: ss.getId()
    });
  } catch (err) {
    Logger.log('doGet exception: ' + err.toString());
    return jsonResponse({
      success: false,
      error: 'Google Apps Script error: ' + (err.message || err.toString())
    });
  }
}

/**
 * Handle HTTP POST: Mutates candidate status, adds manual candidates, schedules calls.
 * Can target an isolated test sheet by providing sheetId in payload.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Empty POST payload' });
    }

    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    if (action === 'PING') {
      return jsonResponse({ success: true, message: 'Sprix Apps Script POST API online' });
    }

    var resolved = resolveSpreadsheet(requestData);
    if (!resolved.spreadsheet) {
      return jsonResponse({
        success: false,
        error: resolved.error,
        configuredSheetId: resolved.sheetId
      });
    }

    var ss = resolved.spreadsheet;
    var result = { success: true };
    
    switch (action) {
      case 'ADD_CANDIDATE':
        result = addCandidateToSheet(ss, requestData.candidate);
        break;
        
      case 'UPDATE_CANDIDATE':
        result = updateCandidateMetadata(ss, requestData.candidateId, requestData.updates);
        break;
        
      case 'ADD_CALENDAR_EVENT':
        result = addCalendarEventToSheet(ss, requestData.event);
        break;
        
      case 'UPDATE_CALL_STATUS':
        result = updateCallRecord(ss, requestData.eventId, requestData.status, requestData.reason);
        break;
        
      default:
        throw new Error('Unsupported action: ' + action);
    }
    
    return jsonResponse(result);
  } catch (err) {
    Logger.log('doPost exception: ' + err.toString());
    return jsonResponse({
      success: false,
      error: 'Google Apps Script POST error: ' + (err.message || err.toString())
    });
  }
}

/**
 * Helper to explicitly open spreadsheet by Spreadsheet ID.
 * Eliminates reliance on active spreadsheet container context.
 */
function resolveSpreadsheet(params) {
  var targetId = (params && (params.sheetId || params.spreadsheetId))
    ? String(params.sheetId || params.spreadsheetId).trim()
    : DEFAULT_SPREADSHEET_ID;

  var errors = [];

  // 1. Primary: Explicit openById
  if (targetId) {
    try {
      var ss = SpreadsheetApp.openById(targetId);
      if (ss) {
        return { spreadsheet: ss, error: null, sheetId: targetId };
      }
    } catch (err) {
      var msg = 'SpreadsheetApp.openById("' + targetId + '") failed: ' + (err.message || err.toString());
      Logger.log(msg);
      errors.push(msg);
    }
  }

  // 2. Secondary fallback: Bound container context (if run from Google Sheets Extensions menu)
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      return { spreadsheet: activeSs, error: null, sheetId: activeSs.getId() };
    }
  } catch (err) {
    // Expected in standalone Web App execution
  }

  var failureReason = errors.length > 0
    ? errors.join('; ')
    : 'Unable to open spreadsheet. Please verify that the Google Sheet ID is valid and that the executing account has read access to the sheet.';

  return {
    spreadsheet: null,
    error: failureReason,
    sheetId: targetId
  };
}

// ----------------------------------------------------
// DYNAMIC DATA READING & COLUMN MAPPING
// ----------------------------------------------------

function getRealCandidatesData(ss) {
  var candidates = [];
  var seenKeys = {}; // Prevent duplicate candidate entries

  var metaMap = getMetadataMap(ss);

  // 1. Read Google Form response sheets
  var formSheets = findFormResponseSheets(ss);
  for (var f = 0; f < formSheets.length; f++) {
    var sheet = formSheets[f];
    if (sheet.getLastRow() < 2) continue;

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    var colMap = mapHeaderIndices(headers);

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 2;

      var email = (colMap.email !== -1 && row[colMap.email]) ? String(row[colMap.email]).trim() : '';
      var name = (colMap.name !== -1 && row[colMap.name]) ? String(row[colMap.name]).trim() : '';
      if (!name && email) name = email.split('@')[0];
      if (!name) continue; // skip completely blank row

      var id = (colMap.id !== -1 && row[colMap.id]) ? String(row[colMap.id]).trim() : ('SPRIX-FR-' + String(rowIndex).padStart(4, '0'));
      var dedupeKey = (id || email || name).toLowerCase();
      if (seenKeys[dedupeKey]) continue;
      seenKeys[dedupeKey] = true;

      var phone = (colMap.phone !== -1 && row[colMap.phone]) ? String(row[colMap.phone]).trim() : '';
      var location = (colMap.location !== -1 && row[colMap.location]) ? String(row[colMap.location]).trim() : '';
      var appDate = (colMap.date !== -1 && row[colMap.date]) ? formatDateValue(row[colMap.date]) : '';

      // Extract all form questions as dynamic key-values
      var formResponses = {};
      for (var c = 0; c < headers.length; c++) {
        var hName = String(headers[c]).trim();
        if (hName && row[c] !== '' && row[c] !== null && row[c] !== undefined) {
          formResponses[hName] = formatDateValue(row[c]);
        }
      }

      // Merge internal metadata
      var meta = metaMap[id] || (email ? metaMap[email] : null) || {};
      var currentStatus = meta.currentStatus || (colMap.status !== -1 && row[colMap.status] ? String(row[colMap.status]) : 'New');
      var finalScore = meta.finalScore !== undefined && meta.finalScore !== null && meta.finalScore !== '' ? Number(meta.finalScore) : null;
      var joiningDate = meta.joiningDate || (colMap.joiningDate !== -1 && row[colMap.joiningDate] ? formatDateValue(row[colMap.joiningDate]) : '');
      var role = meta.role || (colMap.role !== -1 && row[colMap.role] ? String(row[colMap.role]) : '');

      candidates.push({
        id: id,
        name: name,
        phone: phone,
        email: email,
        location: location,
        applicationDate: appDate,
        lastUpdated: meta.lastUpdated || appDate || new Date().toISOString().split('T')[0],
        currentStage: deriveStage(currentStatus),
        currentStatus: currentStatus,
        finalScore: finalScore,
        joiningDate: joiningDate,
        role: role,
        callReason: meta.callReason || '',
        callStatus: meta.callStatus || 'Scheduled',
        formResponses: formResponses,
        adminNotes: meta.notes ? [{ id: 'n-' + id, timestamp: meta.lastUpdated || '', author: 'Admin', note: meta.notes }] : []
      });
    }
  }

  // 2. Read Manually Added Candidates sheet
  var manualSheet = ss.getSheetByName(INTERNAL_SHEETS.MANUAL_CANDIDATES);
  if (manualSheet && manualSheet.getLastRow() >= 2) {
    var mData = manualSheet.getRange(2, 1, manualSheet.getLastRow() - 1, manualSheet.getLastColumn()).getValues();
    for (var m = 0; m < mData.length; m++) {
      var mRow = mData[m];
      var mId = String(mRow[0] || '').trim();
      var mName = String(mRow[2] || '').trim();
      var mPhone = String(mRow[3] || '').trim();
      var mEmail = String(mRow[4] || '').trim();
      var mLocation = String(mRow[5] || '').trim();
      var mDate = formatDateValue(mRow[1]);

      if (!mName) continue;
      var mDedupe = (mId || mEmail || mName).toLowerCase();
      if (seenKeys[mDedupe]) continue;
      seenKeys[mDedupe] = true;

      var mMeta = metaMap[mId] || (mEmail ? metaMap[mEmail] : null) || {};
      var mStatus = mMeta.currentStatus || 'Working';
      var mScore = mMeta.finalScore !== undefined && mMeta.finalScore !== null && mMeta.finalScore !== '' ? Number(mMeta.finalScore) : null;

      candidates.push({
        id: mId,
        name: mName,
        phone: mPhone,
        email: mEmail,
        location: mLocation,
        applicationDate: mDate,
        lastUpdated: mMeta.lastUpdated || mDate || new Date().toISOString().split('T')[0],
        currentStage: deriveStage(mStatus),
        currentStatus: mStatus,
        finalScore: mScore,
        joiningDate: mMeta.joiningDate || '',
        role: mMeta.role || 'Sales Representative',
        callReason: mMeta.callReason || '',
        callStatus: mMeta.callStatus || 'Scheduled',
        formResponses: { 'Candidate Source': 'Manual Entry / Direct Hire' },
        adminNotes: mMeta.notes ? [{ id: 'mn-' + mId, timestamp: mMeta.lastUpdated || '', author: 'Admin', note: mMeta.notes }] : []
      });
    }
  }

  return candidates;
}

function findFormResponseSheets(ss) {
  var sheets = ss.getSheets();
  var matched = [];

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    // Exclude internal helper sheets
    if (name === INTERNAL_SHEETS.CALENDAR || 
        name === INTERNAL_SHEETS.INTERNAL_METADATA || 
        name === INTERNAL_SHEETS.MANUAL_CANDIDATES) {
      continue;
    }
    var lower = name.toLowerCase();
    if (lower.includes('form') || lower.includes('response') || lower === 'candidates') {
      matched.push(sheets[i]);
    }
  }

  // Fallback: if no sheet matched by name pattern, return the first non-internal sheet
  if (matched.length === 0) {
    for (var j = 0; j < sheets.length; j++) {
      var n = sheets[j].getName();
      if (n !== INTERNAL_SHEETS.CALENDAR && 
          n !== INTERNAL_SHEETS.INTERNAL_METADATA && 
          n !== INTERNAL_SHEETS.MANUAL_CANDIDATES) {
        matched.push(sheets[j]);
        break;
      }
    }
  }

  return matched;
}

function mapHeaderIndices(headers) {
  var map = {
    id: -1,
    name: -1,
    phone: -1,
    email: -1,
    location: -1,
    date: -1,
    status: -1,
    score: -1,
    joiningDate: -1,
    role: -1
  };
  
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim();
    if (map.id === -1 && (h === 'candidate id' || h === 'id' || h === 'roll no')) map.id = i;
    if (map.name === -1 && (h.includes('name') || h === 'candidate')) map.name = i;
    if (map.phone === -1 && (h.includes('phone') || h.includes('mobile') || h.includes('whatsapp') || h.includes('contact'))) map.phone = i;
    if (map.email === -1 && h.includes('email')) map.email = i;
    if (map.location === -1 && (h.includes('location') || h.includes('city') || h.includes('college') || h.includes('address'))) map.location = i;
    if (map.date === -1 && (h.includes('timestamp') || h === 'date' || h.includes('application date'))) map.date = i;
    if (map.status === -1 && (h.includes('status') || h === 'stage')) map.status = i;
    if (map.score === -1 && (h.includes('score') || h.includes('rating'))) map.score = i;
    if (map.joiningDate === -1 && (h.includes('joining') || h.includes('join date'))) map.joiningDate = i;
    if (map.role === -1 && (h.includes('role') || h.includes('position'))) map.role = i;
  }
  
  return map;
}

function deriveStage(status) {
  if (!status) return 'ROUND_1';
  var s = String(status).toUpperCase();
  if (s.includes('WORK')) return 'WORKING';
  if (s.includes('ROUND 3') || s.includes('TRAIN') || s.includes('FINAL')) return 'ROUND_3';
  if (s.includes('ROUND 2') || s.includes('PHONE') || s.includes('INTERVIEW')) return 'ROUND_2';
  if (s.includes('SELECT') || s.includes('HIRE')) return 'SELECTED';
  if (s.includes('REJECT')) return 'REJECTED';
  return 'ROUND_1';
}

function getMetadataMap(ss) {
  var sheet = ss.getSheetByName(INTERNAL_SHEETS.INTERNAL_METADATA);
  var map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var id = String(r[0]).trim();
    if (!id) continue;
    map[id] = {
      currentStatus: r[1] ? String(r[1]) : '',
      finalScore: r[2] !== '' && r[2] !== null && r[2] !== undefined ? Number(r[2]) : null,
      joiningDate: r[3] ? formatDateValue(r[3]) : '',
      role: r[4] ? String(r[4]) : '',
      callReason: r[5] ? String(r[5]) : '',
      callStatus: r[6] ? String(r[6]) : '',
      notes: r[7] ? String(r[7]) : '',
      lastUpdated: r[8] ? formatDateValue(r[8]) : ''
    };
  }
  return map;
}

function getRealCalendarData(ss) {
  var sheet = ss.getSheetByName(INTERNAL_SHEETS.CALENDAR);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  var events = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0] && !r[2]) continue; // skip blank rows
    events.push({
      id: String(r[0]),
      candidateId: String(r[1]),
      candidateName: String(r[2]),
      type: String(r[3]),
      startDate: formatDateValue(r[4]),
      endDate: formatDateValue(r[5]),
      startTime: String(r[6]),
      endTime: String(r[7]),
      reason: String(r[8]),
      notes: String(r[9]),
      status: String(r[10]) || 'Scheduled'
    });
  }
  return events;
}

// ----------------------------------------------------
// MUTATION OPERATIONS (Google Sheets Persistence)
// ----------------------------------------------------

function addCandidateToSheet(ss, candidate) {
  var manualSheet = ss.getSheetByName(INTERNAL_SHEETS.MANUAL_CANDIDATES);
  if (!manualSheet) {
    setupSprixSystem();
    manualSheet = ss.getSheetByName(INTERNAL_SHEETS.MANUAL_CANDIDATES);
  }
  
  var candId = candidate.id || ('SPRIX-M-' + Date.now().toString().slice(-4));
  var now = new Date();

  // Save to Manual Candidates sheet
  manualSheet.appendRow([
    candId,
    now,
    candidate.name || '',
    candidate.phone || '',
    candidate.email || '',
    candidate.location || '',
    'Manual Entry'
  ]);
  
  // Save internal metadata
  updateCandidateMetadata(ss, candId, {
    currentStatus: candidate.currentStatus || 'Working',
    finalScore: candidate.finalScore,
    joiningDate: candidate.joiningDate,
    role: candidate.role,
    notes: candidate.adminNotes && candidate.adminNotes[0] ? candidate.adminNotes[0].note : ''
  });
  
  return { success: true, id: candId };
}

function updateCandidateMetadata(ss, candidateId, updates) {
  var metaSheet = ss.getSheetByName(INTERNAL_SHEETS.INTERNAL_METADATA);
  if (!metaSheet) {
    setupSprixSystem();
    metaSheet = ss.getSheetByName(INTERNAL_SHEETS.INTERNAL_METADATA);
  }
  
  var data = metaSheet.getLastRow() > 1 ? metaSheet.getRange(2, 1, metaSheet.getLastRow() - 1, 9).getValues() : [];
  var rowIndex = -1;
  
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(candidateId).trim()) {
      rowIndex = i + 2;
      break;
    }
  }
  
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm');
  
  if (rowIndex !== -1) {
    if (updates.currentStatus !== undefined) metaSheet.getRange(rowIndex, 2).setValue(updates.currentStatus);
    if (updates.finalScore !== undefined) metaSheet.getRange(rowIndex, 3).setValue(updates.finalScore !== null ? updates.finalScore : '');
    if (updates.joiningDate !== undefined) metaSheet.getRange(rowIndex, 4).setValue(updates.joiningDate);
    if (updates.role !== undefined) metaSheet.getRange(rowIndex, 5).setValue(updates.role);
    if (updates.callReason !== undefined) metaSheet.getRange(rowIndex, 6).setValue(updates.callReason);
    if (updates.callStatus !== undefined) metaSheet.getRange(rowIndex, 7).setValue(updates.callStatus);
    if (updates.notes !== undefined && updates.notes) metaSheet.getRange(rowIndex, 8).setValue(updates.notes);
    metaSheet.getRange(rowIndex, 9).setValue(now);
  } else {
    metaSheet.appendRow([
      candidateId,
      updates.currentStatus || 'New',
      updates.finalScore !== undefined && updates.finalScore !== null ? updates.finalScore : '',
      updates.joiningDate || '',
      updates.role || '',
      updates.callReason || '',
      updates.callStatus || '',
      updates.notes || '',
      now
    ]);
  }
  
  return { success: true };
}

function addCalendarEventToSheet(ss, event) {
  var sheet = ss.getSheetByName(INTERNAL_SHEETS.CALENDAR);
  if (!sheet) {
    setupSprixSystem();
    sheet = ss.getSheetByName(INTERNAL_SHEETS.CALENDAR);
  }
  
  sheet.appendRow([
    event.id || ('evt-' + Date.now()),
    event.candidateId || '',
    event.candidateName || '',
    event.type || 'CALL',
    event.startDate || '',
    event.endDate || '',
    event.startTime || '',
    event.endTime || '',
    event.reason || '',
    event.notes || '',
    event.status || 'Scheduled'
  ]);
  
  return { success: true };
}

function updateCallRecord(ss, eventId, status, reason) {
  var sheet = ss.getSheetByName(INTERNAL_SHEETS.CALENDAR);
  if (!sheet || sheet.getLastRow() < 2) return { success: false };
  
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(eventId)) {
      var row = i + 2;
      if (status) sheet.getRange(row, 11).setValue(status);
      if (reason) sheet.getRange(row, 9).setValue(reason);
      return { success: true };
    }
  }
  return { success: false };
}

function formatHeaderRow(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#01008A');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd');
  }
  return String(val);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
