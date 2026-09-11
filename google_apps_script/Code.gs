/**
 * SPRIX SALES HIRING PLATFORM - PRODUCTION GOOGLE APPS SCRIPT API
 * 
 * Version: 2.0.0 (Production / Real Data)
 * Purpose: Connects real Google Forms & Google Sheets to Sprix Hiring Management.
 * 
 * KEY FEATURES:
 * 1. Safe Dynamic Column Mapping: Never assumes fixed column positions or breaks existing data.
 * 2. Immutable Form Responses: Never overwrites original Google Form responses.
 * 3. Supports Existing Working Candidates, Joining Dates, and Final Scores (0-10).
 * 4. Tracks Scheduled Calls with "Reason for Call" for Today's Dashboard.
 * 
 * DEPLOYMENT:
 * 1. Open your Google Spreadsheet (where Google Form responses land).
 * 2. Click: Extensions > Apps Script.
 * 3. Paste this code into Code.gs and save.
 * 4. Run "setupSprixSystem()" once to ensure internal helper sheets exist without touching your form data.
 * 5. Click "Deploy" > "New deployment" > "Web app" > "Execute as: Me" > "Who has access: Anyone".
 * 6. Copy the Web App URL into your Sprix Platform Settings.
 */

var INTERNAL_SHEETS = {
  CALENDAR: 'Sprix_Calendar',
  INTERNAL_METADATA: 'Sprix_Candidate_Metadata'
};

/**
 * Run setup once to prepare the Calendar and internal tracking sheet.
 * Existing form responses and sheets are completely untouched.
 */
function setupSprixSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Calendar sheet if not present
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
  
  // Create Internal Metadata sheet if not present
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
  
  Logger.log('Sprix Hiring System initialized safely.');
}

/**
 * Handle HTTP GET: Reads real candidates and calendar records from the active spreadsheet.
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var candidates = getRealCandidatesData(ss);
    var calendar = getRealCalendarData(ss);
    
    var response = {
      success: true,
      timestamp: new Date().toISOString(),
      candidates: candidates,
      calendar: calendar,
      sheetTitle: ss.getName(),
      totalCandidates: candidates.length
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST: Mutates candidate status, adds manual candidates, schedules calls.
 */
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------
// DYNAMIC DATA READING & COLUMN MAPPING
// ----------------------------------------------------

function getRealCandidatesData(ss) {
  // Find candidates sheet: prioritize 'Candidates' or 'Form Responses 1', or the first sheet
  var candSheet = ss.getSheetByName('Candidates') ||
                  ss.getSheetByName('Form Responses 1') ||
                  ss.getSheetByName('Form Responses') ||
                  ss.getSheets()[0];
                  
  if (!candSheet || candSheet.getLastRow() < 2) {
    return [];
  }
  
  var headers = candSheet.getRange(1, 1, 1, candSheet.getLastColumn()).getValues()[0];
  var data = candSheet.getRange(2, 1, candSheet.getLastRow() - 1, candSheet.getLastColumn()).getValues();
  
  // Read metadata map (for internal statuses, final scores, joining dates)
  var metaMap = getMetadataMap(ss);
  
  // Map column header indices flexibly
  var colMap = mapHeaderIndices(headers);
  var candidates = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + 2; // 1-indexed row in sheet
    
    // Extract candidate ID or generate a stable one based on row or sheet ID
    var id = (colMap.id !== -1 && row[colMap.id]) ? String(row[colMap.id]).trim() : ('SPRIX-' + String(rowIndex).padStart(4, '0'));
    var name = (colMap.name !== -1 && row[colMap.name]) ? String(row[colMap.name]).trim() : '';
    if (!name && colMap.email !== -1 && row[colMap.email]) {
      name = String(row[colMap.email]).split('@')[0];
    }
    if (!name) continue; // skip blank rows
    
    var phone = (colMap.phone !== -1 && row[colMap.phone]) ? String(row[colMap.phone]).trim() : '';
    var email = (colMap.email !== -1 && row[colMap.email]) ? String(row[colMap.email]).trim() : '';
    var location = (colMap.location !== -1 && row[colMap.location]) ? String(row[colMap.location]).trim() : '';
    var appDate = (colMap.date !== -1 && row[colMap.date]) ? formatDateValue(row[colMap.date]) : '';
    
    // Extract all dynamic Google Form questions as key-value pairs
    var formResponses = {};
    for (var c = 0; c < headers.length; c++) {
      var headerName = String(headers[c]).trim();
      if (headerName && row[c] !== '' && row[c] !== null && row[c] !== undefined) {
        formResponses[headerName] = formatDateValue(row[c]);
      }
    }
    
    // Merge internal metadata (status, score, joining date, notes)
    var meta = metaMap[id] || metaMap[email] || {};
    var currentStatus = meta.currentStatus || (colMap.status !== -1 && row[colMap.status] ? String(row[colMap.status]) : 'New');
    var finalScore = meta.finalScore !== undefined && meta.finalScore !== null && meta.finalScore !== '' ? Number(meta.finalScore) : null;
    var joiningDate = meta.joiningDate || (colMap.joiningDate !== -1 && row[colMap.joiningDate] ? formatDateValue(row[colMap.joiningDate]) : '');
    var role = meta.role || (colMap.role !== -1 && row[colMap.role] ? String(row[colMap.role]) : '');
    
    // Derive stage from status
    var currentStage = deriveStage(currentStatus);
    
    candidates.push({
      id: id,
      name: name,
      phone: phone,
      email: email,
      location: location,
      applicationDate: appDate,
      lastUpdated: meta.lastUpdated || appDate || new Date().toISOString().split('T')[0],
      currentStage: currentStage,
      currentStatus: currentStatus,
      finalScore: finalScore,
      joiningDate: joiningDate,
      role: role,
      callReason: meta.callReason || '',
      callStatus: meta.callStatus || 'Scheduled',
      formResponses: formResponses,
      adminNotes: meta.notes ? [{ id: 'n1', timestamp: meta.lastUpdated || '', author: 'Admin', note: meta.notes }] : []
    });
  }
  
  return candidates;
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
    if (map.phone === -1 && (h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('whatsapp'))) map.phone = i;
    if (map.email === -1 && h.includes('email')) map.email = i;
    if (map.location === -1 && (h.includes('location') || h.includes('city') || h.includes('address') || h.includes('state'))) map.location = i;
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
      finalScore: r[2] !== '' && r[2] !== null ? Number(r[2]) : null,
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
// MUTATION HELPERS
// ----------------------------------------------------

function addCandidateToSheet(ss, candidate) {
  var candSheet = ss.getSheetByName('Candidates') || ss.getSheets()[0];
  var lastCol = candSheet.getLastColumn() || 5;
  
  // Append new candidate row
  var row = [
    candidate.id || ('SPRIX-' + Date.now().toString().slice(-4)),
    new Date(),
    candidate.name || '',
    candidate.phone || '',
    candidate.email || '',
    candidate.location || ''
  ];
  candSheet.appendRow(row);
  
  // Save internal metadata
  updateCandidateMetadata(ss, row[0], {
    currentStatus: candidate.currentStatus || 'Working',
    finalScore: candidate.finalScore,
    joiningDate: candidate.joiningDate,
    role: candidate.role,
    notes: candidate.notes
  });
  
  return { success: true, id: row[0] };
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
  
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  
  if (rowIndex !== -1) {
    if (updates.currentStatus !== undefined) metaSheet.getRange(rowIndex, 2).setValue(updates.currentStatus);
    if (updates.finalScore !== undefined) metaSheet.getRange(rowIndex, 3).setValue(updates.finalScore);
    if (updates.joiningDate !== undefined) metaSheet.getRange(rowIndex, 4).setValue(updates.joiningDate);
    if (updates.role !== undefined) metaSheet.getRange(rowIndex, 5).setValue(updates.role);
    if (updates.callReason !== undefined) metaSheet.getRange(rowIndex, 6).setValue(updates.callReason);
    if (updates.callStatus !== undefined) metaSheet.getRange(rowIndex, 7).setValue(updates.callStatus);
    if (updates.notes !== undefined) metaSheet.getRange(rowIndex, 8).setValue(updates.notes);
    metaSheet.getRange(rowIndex, 9).setValue(now);
  } else {
    metaSheet.appendRow([
      candidateId,
      updates.currentStatus || 'New',
      updates.finalScore !== undefined ? updates.finalScore : '',
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
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}
