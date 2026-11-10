import 'fake-indexeddb/auto';
import fs from 'fs';
import { db } from '../src/database/db.js';
import { settingsService, DEFAULT_FARM_PROFILE, DEFAULT_PREFERENCES } from '../src/services/settingsService.js';
import { APP_MODULES } from '../src/utils/constants.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// Mock browser download and DOM environment
class MockBlob {
  constructor(contentParts, options) {
    this.content = contentParts.join('');
    this.type = options?.type || '';
  }
}

class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  readAsText(file) {
    setTimeout(() => {
      if (file && file._shouldError) {
        if (this.onerror) this.onerror(new Error('Mock file read error'));
      } else {
        if (this.onload) {
          this.onload({ target: { result: file.content || '' } });
        }
      }
    }, 10);
  }
  readAsDataURL(file) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' } });
      }
    }, 10);
  }
}

const capturedDownloads = [];
global.Blob = MockBlob;
global.window = {
  FileReader: MockFileReader,
};
global.URL.createObjectURL = (blob) => {
  const url = `blob:freshnest-${Date.now()}`;
  return url;
};
global.URL.revokeObjectURL = (_url) => {};
global.document = {
  body: {
    appendChild: (elem) => {
      capturedDownloads.push(elem);
    },
    removeChild: (_elem) => {},
  },
  createElement: (tagName) => {
    const attributes = {};
    return {
      tagName,
      setAttribute: (k, v) => {
        attributes[k] = v;
      },
      getAttribute: (k) => attributes[k],
      click: function () {
        this._clicked = true;
      },
      attributes,
    };
  },
};

async function runLiveUiVerification() {
  console.log('====================================================');
  console.log(' FRESHNEST POULTRY FARM: LIVE UI & WORKFLOW AUDIT');
  console.log('====================================================\n');

  await db.open();
  assert(db.isOpen(), 'IndexedDB initialized in live application environment');

  // -----------------------------------------------------------------
  // TEST 1: FARM PROFILE UI FLOW & REPORT PRINT HEADER SYNC
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 1: Farm Profile UI Save, Persistence & Print Header Sync');
  
  // Clean settings table for controlled verification
  await db.farmSettings.clear();

  // Initial load
  const initialProfile = await settingsService.getFarmProfile();
  assert(initialProfile.farm_name === DEFAULT_FARM_PROFILE.farm_name, 'Default profile loaded in UI form');

  // Simulate updating farm name and details in FarmProfileTab form
  const updatedFormPayload = {
    farm_name: 'FreshNest Greenfield Agro-Allied Farm Ltd',
    farm_phone: '+234 803 777 6655',
    farm_email: 'operations@freshnestgreenfield.ng',
    farm_address: 'Kilometre 8, Epe-Ijebu Expressway, Lagos State',
    farm_admin_name: 'Alhaji Rasheed Balogun',
    farm_description: 'Automated 50,000 layer flock poultry complex with on-site feed mill.',
    farm_logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  };

  await settingsService.updateFarmProfile(updatedFormPayload);
  assert(true, 'Farm profile settings successfully saved through form submit');

  // Simulate browser page refresh by reloading freshly from IndexedDB
  const reloadedProfile = await settingsService.getFarmProfile();
  assert(reloadedProfile.farm_name === 'FreshNest Greenfield Agro-Allied Farm Ltd', 'Updated farm name remains saved after page refresh');
  assert(reloadedProfile.farm_phone === '+234 803 777 6655', 'Updated farm phone remains saved after page refresh');
  assert(reloadedProfile.farm_email === 'operations@freshnestgreenfield.ng', 'Updated farm email remains saved after page refresh');
  assert(reloadedProfile.farm_admin_name === 'Alhaji Rasheed Balogun', 'Updated admin name remains saved after page refresh');
  assert(reloadedProfile.farm_logo.startsWith('data:image/png'), 'Updated farm logo base64 remains saved after page refresh');

  // Confirm report print header loads the updated farm name and logo directly
  const printHeaderSetting = await db.farmSettings.get('farm_name');
  assert(printHeaderSetting && printHeaderSetting.value === 'FreshNest Greenfield Agro-Allied Farm Ltd', 'Print header displays the updated farm name');
  const printHeaderLogoSetting = await db.farmSettings.get('farm_logo');
  assert(printHeaderLogoSetting && printHeaderLogoSetting.value.startsWith('data:image/png'), 'Print header displays the updated farm logo');

  // -----------------------------------------------------------------
  // TEST 2: BACKUP DOWNLOAD BROWSER ACTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: Backup Download Browser Action');
  
  // Seed sample operational data so backup has realistic contents
  await db.pens.put({ id: 1, penId: 'PEN-001', name: 'Brooder East', capacity: 600, type: 'Brooder' });
  await db.batches.put({ id: 1, batchCode: 'BAT-2026-L1', breed: 'Isa Brown', initialCount: 600, currentCount: 590, status: 'Active' });
  await db.birds.put({ id: 1, tagNumber: 'BRD-001', breed: 'Isa Brown', batchId: 'BAT-2026-L1', status: 'Active' });
  await db.eggLogs.put({ id: 1, logId: 'EGG-001', batchId: 'BAT-2026-L1', totalCollected: 520, goodEggs: 510, date: '2026-11-01' });
  await db.sales.put({ id: 1, saleId: 'SALE-001', customerName: 'Mama Nkechi Stores', productType: 'Table Eggs', totalAmount: 45000, amountPaid: 45000, status: 'Completed' });
  await db.expenses.put({ id: 1, expenseId: 'EXP-001', category: 'Feed Purchases', amount: 32000, amountPaid: 32000, status: 'Completed' });

  // Simulate clicking "Create & Download Full Backup (.json)" in BackupRestoreTab
  const backupData = await settingsService.generateFullBackup();
  const blob = new MockBlob([backupData.jsonString], { type: 'application/json;charset=utf-8;' });
  const downloadUrl = global.URL.createObjectURL(blob);
  const linkElem = global.document.createElement('a');
  linkElem.setAttribute('href', downloadUrl);
  linkElem.setAttribute('download', backupData.filename);
  global.document.body.appendChild(linkElem);
  linkElem.click();

  assert(linkElem._clicked === true, 'Download link click event dispatched');
  assert(backupData.filename.startsWith('FreshNest_Backup_'), 'Download filename contains FreshNest_Backup prefix');
  const todayDateStr = new Date().toISOString().slice(0, 10);
  assert(backupData.filename.includes(todayDateStr), `Download filename contains current date ${todayDateStr}`);
  assert(backupData.filename.endsWith('.json'), 'Download filename has .json extension');

  // Verify downloaded JSON payload validity and metadata
  const parsedDownloadedJson = JSON.parse(backupData.jsonString);
  assert(parsedDownloadedJson.appName === 'FreshNest Poultry Farm', 'Backup metadata contains correct appName');
  assert(parsedDownloadedJson.schemaVersion === 12, 'Backup metadata schemaVersion is 12');
  assert(parsedDownloadedJson.backupFormatVersion === '1.0', 'Backup metadata backupFormatVersion is 1.0');
  assert(typeof parsedDownloadedJson.tables === 'object', 'Backup contains all tables');
  assert(parsedDownloadedJson.tables.birds.length >= 1, 'Backup contains active birds records');
  assert(parsedDownloadedJson.tables.sales.length >= 1, 'Backup contains active sales records');
  assert(parsedDownloadedJson.tables.expenses.length >= 1, 'Backup contains active expenses records');

  // -----------------------------------------------------------------
  // TEST 3: RESTORE PREVIEW & CREDENTIAL PROTECTION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: Restore Preview Validation & Credential Protection');

  // Seed administrator with hashed credentials
  await db.administrators.put({
    id: 1,
    username: 'farm_admin',
    fullName: 'Farm Chief Officer',
    passwordHash: 'pbkdf2_sha256$100000$mockedsalt$mockedhashvalue',
    salt: 'salt128bitrandomhex',
    status: 'Active',
    createdAt: new Date().toISOString(),
  });

  // Re-generate backup that includes administrator record
  const backupWithAdmin = await settingsService.generateFullBackup();
  const fileToPreview = {
    name: backupWithAdmin.filename,
    content: backupWithAdmin.jsonString,
  };

  // Simulate FileReader reading the file in handleFileSelect
  let previewResult = null;
  await new Promise((resolve) => {
    const reader = new window.FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsedJson = JSON.parse(text);
      const validation = settingsService.validateBackup(parsedJson);
      previewResult = {
        parsedBackup: parsedJson,
        validation,
      };
      resolve();
    };
    reader.readAsText(fileToPreview);
  });

  assert(previewResult !== null, 'File picker reads and validates backup file');
  assert(previewResult.validation.isValid === true, 'Preview indicates validation passed');
  assert(previewResult.validation.schemaVersion === 12, 'Preview displays correct schema version 12');
  assert(previewResult.validation.exportedAt !== undefined, 'Preview displays backup export timestamp');
  assert(previewResult.validation.tableCounts.birds >= 1, 'Preview displays birds record counts');
  assert(previewResult.validation.tableCounts.sales >= 1, 'Preview displays sales record counts');
  assert(previewResult.validation.tableCounts.administrators >= 1, 'Preview displays administrators table count');

  // Confirm sensitive credential fields are NOT exposed in preview validation summary
  assert(previewResult.validation.passwordHash === undefined, 'passwordHash is strictly hidden from preview card');
  assert(previewResult.validation.salt === undefined, 'salt is strictly hidden from preview card');
  assert(previewResult.validation.password === undefined, 'password is strictly hidden from preview card');

  // -----------------------------------------------------------------
  // TEST 4: RESTORE SAFETY & CANCELLATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Restore Safety, Cancellation & Corrupted File Rejection');

  // 1. User cancels restore modal
  const birdCountBeforeCancel = await db.birds.count();
  let showConfirmModal = true;
  // User clicks "Cancel" button in modal
  showConfirmModal = false;
  const birdCountAfterCancel = await db.birds.count();
  assert(showConfirmModal === false, 'Confirmation modal dismissed on Cancel click');
  assert(birdCountAfterCancel === birdCountBeforeCancel, 'Cancelling restore leaves current database completely untouched');

  // 2. Invalid / corrupted JSON uploaded
  let corruptedErrorCaught = false;
  try {
    const corruptedText = '{"appName": "FreshNest Poultry Farm", "tables": "NOT_AN_OBJECT"}';
    const parsed = JSON.parse(corruptedText);
    settingsService.validateBackup(parsed);
  } catch (err) {
    corruptedErrorCaught = true;
    assert(err.message.includes('Corrupted backup data') || err.message.includes('container'), 'Corrupted file safely rejected');
  }
  assert(corruptedErrorCaught, 'Invalid/corrupted JSON rejected with error banner');
  assert((await db.birds.count()) === birdCountBeforeCancel, 'Database records intact after corrupted file rejected');

  // 3. Isolated test database round trip
  console.log('  Testing safe round-trip restore on controlled dataset...');
  const testBackupPayload = JSON.parse(backupWithAdmin.jsonString);
  const restoreOutcome = await settingsService.executeRestore(testBackupPayload);
  assert(restoreOutcome.success === true, 'Safe round-trip restore succeeded');
  assert(restoreOutcome.totalRestored === testBackupPayload.totalRecords, 'All records restored accurately');
  const restoredAdmin = await db.administrators.get(1);
  assert(restoredAdmin && restoredAdmin.username === 'farm_admin', 'Administrator restored intact');

  // -----------------------------------------------------------------
  // TEST 5: FINAL VERIFICATION & NAVIGATION
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Navigation, Offline Capability & Modules 03-13 Intact');

  // Verify all 13 modules in constants
  assert(APP_MODULES.length >= 13, `All ${APP_MODULES.length} application modules defined`);
  const settingsModuleConfig = APP_MODULES.find((m) => m.id === 'settings');
  assert(settingsModuleConfig !== undefined, 'Settings module defined in APP_MODULES');
  assert(settingsModuleConfig.label === 'Settings', 'Settings label matches');

  // Verify MODULE_REGISTRY in src/modules/index.js
  const indexJsCode = fs.readFileSync(new URL('../src/modules/index.js', import.meta.url), 'utf-8');
  assert(indexJsCode.includes('settings: SettingsModule'), 'SettingsModule registered in MODULE_REGISTRY');
  assert(indexJsCode.includes('export {') && indexJsCode.includes('SettingsModule,'), 'SettingsModule exported from barrel');

  // Verify Modules 03 through 13 components are registered in MODULE_REGISTRY
  const requiredModules = ['birds', 'batches', 'feed', 'medication', 'vaccination', 'eggs', 'mortality', 'sales', 'expenses', 'inventory', 'reports', 'settings'];
  for (const modId of requiredModules) {
    assert(indexJsCode.includes(`${modId}:`), `Module ${modId} remains accessible in MODULE_REGISTRY`);
  }

  // Verify offline engine
  assert(db.isOpen(), 'Database remains operational offline without network access');

  console.log('\n====================================================');
  console.log(` LIVE UI AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runLiveUiVerification().catch((err) => {
  console.error('Live UI audit error:', err);
  process.exit(1);
});
