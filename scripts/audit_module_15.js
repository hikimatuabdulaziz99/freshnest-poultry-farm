import 'fake-indexeddb/auto';
import fs from 'fs';
import path from 'path';
import { db } from '../src/database/db.js';
import { APP_INFO, APP_MODULES } from '../src/utils/constants.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failed++;
  }
}

async function runAudit() {
  console.log('====================================================');
  console.log(' FRESHNEST POULTRY FARM: MODULE 15 AUDIT & TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: WEB APP MANIFEST VALIDITY & STANDARDS
  // -----------------------------------------------------------------
  console.log('>>> TEST 1: Web App Manifest Validity & Standards');
  const manifestPath = path.resolve('public/manifest.json');
  assert(fs.existsSync(manifestPath), 'public/manifest.json exists on disk');

  let manifest = null;
  let manifestValidJson = false;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
    manifestValidJson = true;
  } catch (err) {
    console.error('Manifest JSON parse error:', err);
  }
  assert(manifestValidJson, 'manifest.json is valid parseable JSON');
  assert(manifest.name === 'FreshNest Poultry Farm', `Manifest name matches 'FreshNest Poultry Farm' (got '${manifest?.name}')`);
  assert(manifest.short_name === 'FreshNest', `Manifest short_name matches 'FreshNest' (got '${manifest?.short_name}')`);
  assert(manifest.short_name.length <= 12, `short_name is <= 12 characters (length: ${manifest.short_name.length})`);
  assert(manifest.start_url === '/', 'start_url is set to root /');
  assert(manifest.scope === '/', 'scope is set to root /');
  assert(manifest.display === 'standalone', `display mode is standalone (got '${manifest?.display}')`);
  assert(manifest.theme_color.toLowerCase() === '#1b4332', `theme_color matches Dark Green #1B4332 (got '${manifest?.theme_color}')`);
  assert(manifest.background_color.toLowerCase() === '#f8faf8', `background_color matches Soft White #F8FAF8 (got '${manifest?.background_color}')`);
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifest includes complete icon array');

  // -----------------------------------------------------------------
  // TEST 2: PWA APPLICATION ICONS EXISTENCE & RESOLUTIONS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 2: PWA Application Icons Existence & Resolutions');
  const icon192 = manifest.icons.find((i) => i.sizes === '192x192' && i.purpose === 'any');
  const icon512 = manifest.icons.find((i) => i.sizes === '512x512' && i.purpose === 'any');
  const maskable512 = manifest.icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');
  const iconSvg = manifest.icons.find((i) => i.type === 'image/svg+xml');

  assert(icon192 !== undefined, 'Manifest declares 192x192 standard icon');
  assert(icon512 !== undefined, 'Manifest declares 512x512 standard icon');
  assert(maskable512 !== undefined, 'Manifest declares 512x512 maskable icon with separate purpose');
  assert(iconSvg !== undefined, 'Manifest declares vector SVG icon');

  // Verify icon files physically exist in public directory
  const p192 = path.resolve('public', icon192.src.replace(/^\//, ''));
  const p512 = path.resolve('public', icon512.src.replace(/^\//, ''));
  const pMaskable = path.resolve('public', maskable512.src.replace(/^\//, ''));
  const pSvg = path.resolve('public', iconSvg.src.replace(/^\//, ''));
  const pApple = path.resolve('public/icons/apple-touch-icon.png');

  assert(fs.existsSync(p192), `Icon file physically exists: ${icon192.src}`);
  assert(fs.existsSync(p512), `Icon file physically exists: ${icon512.src}`);
  assert(fs.existsSync(pMaskable), `Maskable icon file physically exists: ${maskable512.src}`);
  assert(fs.existsSync(pSvg), `SVG icon file physically exists: ${iconSvg.src}`);
  assert(fs.existsSync(pApple), 'Apple Touch Icon physically exists: /icons/apple-touch-icon.png');

  // Verify PNG headers (\x89PNG\r\n\x1a\n)
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const buf192 = fs.readFileSync(p192);
  const buf512 = fs.readFileSync(p512);
  const bufApple = fs.readFileSync(pApple);

  assert(buf192.subarray(0, 8).equals(pngSig), '192x192 icon has valid PNG binary signature');
  assert(buf512.subarray(0, 8).equals(pngSig), '512x512 icon has valid PNG binary signature');
  assert(bufApple.subarray(0, 8).equals(pngSig), 'Apple touch icon has valid PNG binary signature');

  // Verify SVG content
  const svgContent = fs.readFileSync(pSvg, 'utf-8');
  assert(svgContent.includes('<svg') && svgContent.includes('FRESHNEST'), 'SVG icon contains valid FreshNest vector markup');

  // -----------------------------------------------------------------
  // TEST 3: HTML ENTRY POINT PWA HEAD TAGS
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 3: HTML Entry Point PWA Head Tags');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert(indexHtml.includes('rel="manifest"'), 'index.html links manifest.json');
  assert(indexHtml.includes('href="/manifest.json"'), 'index.html manifest path is /manifest.json');
  assert(indexHtml.includes('name="theme-color" content="#1B4332"'), 'index.html specifies theme-color #1B4332');
  assert(indexHtml.includes('name="mobile-web-app-capable" content="yes"'), 'index.html specifies mobile-web-app-capable');
  assert(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html specifies apple-mobile-web-app-capable');
  assert(indexHtml.includes('rel="apple-touch-icon"'), 'index.html specifies apple-touch-icon');
  assert(indexHtml.includes('href="/icons/apple-touch-icon.png"'), 'index.html points apple-touch-icon to PNG asset');

  // -----------------------------------------------------------------
  // TEST 4: SERVICE WORKER FILE IMPLEMENTATION & ARCHITECTURE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 4: Service Worker File Implementation & Architecture');
  const swPath = path.resolve('public/sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js exists on disk');

  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert(swContent.includes('CACHE_VERSION'), 'Service worker declares CACHE_VERSION');
  assert(swContent.includes('STATIC_CACHE_NAME') && swContent.includes('RUNTIME_CACHE_NAME'), 'Service worker separates static shell and runtime caches');
  assert(swContent.includes('PRECACHE_ASSETS'), 'Service worker declares PRECACHE_ASSETS list');
  assert(swContent.includes("'/index.html'") && swContent.includes("'/manifest.json'"), 'PRECACHE_ASSETS includes index.html and manifest.json');
  assert(swContent.includes("'/icons/icon-192.png'") && swContent.includes("'/icons/icon-512.png'"), 'PRECACHE_ASSETS includes essential app icons');

  // Check event listeners
  assert(swContent.includes("addEventListener('install'"), 'Service worker handles install event');
  assert(swContent.includes("addEventListener('activate'"), 'Service worker handles activate event');
  assert(swContent.includes("addEventListener('fetch'"), 'Service worker handles fetch event');
  assert(swContent.includes("addEventListener('message'"), 'Service worker handles message event');

  // -----------------------------------------------------------------
  // TEST 5: SERVICE WORKER CACHE SAFETY & OFFLINE POLICIES
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 5: Service Worker Cache Safety & Offline Policies');
  assert(swContent.includes("request.method !== 'GET'"), 'Service worker strictly ignores non-GET requests');
  assert(swContent.includes('/api/auth') || swContent.includes('/session') || swContent.includes('token'), 'Service worker bypasses sensitive auth/session endpoints');
  assert(swContent.includes("request.mode === 'navigate'"), 'Service worker detects HTML navigation requests');
  assert(swContent.includes('caches.delete(cacheName)'), 'Service worker purges outdated caches on activate');
  assert(swContent.includes('clients.claim()'), 'Service worker claims clients immediately on activate');
  assert(swContent.includes('SKIP_WAITING'), 'Service worker handles SKIP_WAITING update message');

  // -----------------------------------------------------------------
  // TEST 6: CLIENT SERVICE WORKER REGISTRATION & UPDATER
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 6: Client Service Worker Registration & Updater');
  const swRegPath = path.resolve('src/services/serviceWorkerRegistration.js');
  assert(fs.existsSync(swRegPath), 'src/services/serviceWorkerRegistration.js exists');

  const swRegContent = fs.readFileSync(swRegPath, 'utf-8');
  assert(swRegContent.includes('export function registerServiceWorker'), 'Exports registerServiceWorker function');
  assert(swRegContent.includes('export function skipWaitingAndReload'), 'Exports skipWaitingAndReload function');
  assert(swRegContent.includes('onupdatefound'), 'Listens for service worker update discovery');
  assert(swRegContent.includes('controllerchange'), 'Listens for controllerchange to reload cleanly');

  // Verify registration in main.jsx
  const mainJsx = fs.readFileSync(path.resolve('src/main.jsx'), 'utf-8');
  assert(mainJsx.includes('registerServiceWorker'), 'src/main.jsx calls registerServiceWorker');

  // -----------------------------------------------------------------
  // TEST 7: REACT PWA HOOK & INSTALLABILITY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 7: React PWA Hook & Installability');
  const usePWAPath = path.resolve('src/hooks/usePWA.js');
  assert(fs.existsSync(usePWAPath), 'src/hooks/usePWA.js exists');

  const usePWAContent = fs.readFileSync(usePWAPath, 'utf-8');
  assert(usePWAContent.includes('beforeinstallprompt'), 'Handles browser beforeinstallprompt event');
  assert(usePWAContent.includes('appinstalled'), 'Handles appinstalled event');
  assert(usePWAContent.includes('display-mode: standalone'), 'Detects standalone display mode');
  assert(usePWAContent.includes('isIOS'), 'Detects iOS Safari devices');
  assert(usePWAContent.includes('installApp'), 'Provides installApp trigger');
  assert(usePWAContent.includes('isOnline'), 'Provides reactive isOnline connectivity status');

  // -----------------------------------------------------------------
  // TEST 8: PWA UI COMPONENTS & IN-APP INSTALL PROMPT
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 8: PWA UI Components & In-App Install Prompt');
  const installBtnPath = path.resolve('src/components/common/PWAInstallButton.jsx');
  const offlineBannerPath = path.resolve('src/components/common/OfflineStatusBanner.jsx');
  const updateBannerPath = path.resolve('src/components/common/UpdateReadyBanner.jsx');

  assert(fs.existsSync(installBtnPath), 'PWAInstallButton component exists');
  assert(fs.existsSync(offlineBannerPath), 'OfflineStatusBanner component exists');
  assert(fs.existsSync(updateBannerPath), 'UpdateReadyBanner component exists');

  // Verify AppLayout mounts status banners
  const appLayoutContent = fs.readFileSync(path.resolve('src/components/layout/AppLayout.jsx'), 'utf-8');
  assert(appLayoutContent.includes('OfflineStatusBanner'), 'AppLayout mounts OfflineStatusBanner');
  assert(appLayoutContent.includes('UpdateReadyBanner'), 'AppLayout mounts UpdateReadyBanner');

  // Verify Header mounts PWAInstallButton
  const headerContent = fs.readFileSync(path.resolve('src/components/common/Header.jsx'), 'utf-8');
  assert(headerContent.includes('PWAInstallButton'), 'Header mounts PWAInstallButton');

  // Verify Sidebar mounts PWAInstallButton
  const sidebarContent = fs.readFileSync(path.resolve('src/components/common/Sidebar.jsx'), 'utf-8');
  assert(sidebarContent.includes('PWAInstallButton'), 'Sidebar mounts PWAInstallButton');

  // -----------------------------------------------------------------
  // TEST 9: OFFLINE-FIRST INDEXEDDB ENGINE PERSISTENCE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 9: Offline-First IndexedDB Engine Persistence');
  await db.open();
  assert(db.isOpen(), 'IndexedDB engine opens cleanly without network connection');
  assert(db.name === 'freshnest_poultry_db', 'Database name matches freshnest_poultry_db');
  assert(db.verno === 12, `Database schema version is 12 (got ${db.verno})`);

  // Perform full write-read-delete cycle offline across multiple module tables
  const testTag = 'BRD-PWA-TEST';
  await db.birds.put({ id: 9999, tagNumber: testTag, breed: 'Isa Brown', status: 'Active' });
  const fetchedBird = await db.birds.get(9999);
  assert(fetchedBird !== undefined && fetchedBird.tagNumber === testTag, 'Operational bird record saved and read offline');
  await db.birds.delete(9999);
  assert((await db.birds.get(9999)) === undefined, 'Operational record deleted offline');

  // -----------------------------------------------------------------
  // TEST 10: ZERO CLOUD DEPENDENCY & AUTHENTICATION SAFETY
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 10: Zero Cloud Dependency & Authentication Safety');
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  const allDeps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

  assert(!allDeps['firebase'], 'No Firebase cloud dependency');
  assert(!allDeps['@supabase/supabase-js'], 'No Supabase cloud dependency');
  assert(!allDeps['aws-sdk'], 'No AWS cloud dependency');
  assert(!allDeps['next'], 'No Next.js cloud framework dependency');

  // -----------------------------------------------------------------
  // TEST 11: ALL 13 MODULES REGISTERED & ACCESSIBLE
  // -----------------------------------------------------------------
  console.log('\n>>> TEST 11: All Application Modules Registered & Accessible');
  const indexJs = fs.readFileSync(path.resolve('src/modules/index.js'), 'utf-8');
  const requiredModules = [
    'dashboard',
    'birds',
    'batches',
    'feed',
    'medication',
    'vaccination',
    'eggs',
    'mortality',
    'sales',
    'expenses',
    'inventory',
    'reports',
    'settings',
  ];

  for (const modId of requiredModules) {
    assert(indexJs.includes(`${modId}:`), `Module '${modId}' is registered in MODULE_REGISTRY`);
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` MODULE 15 AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
