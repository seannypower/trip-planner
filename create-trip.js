#!/usr/bin/env node

/**
 * create-trip.js — spin up a new trip planner instance
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node create-trip.js
 *
 * What it does:
 *   1. Prompts for trip details
 *   2. Geocodes the city to get lat/lon
 *   3. Looks up the IANA timezone
 *   4. Creates a Vercel project linked to seannypower/trip-planner
 *   5. Sets REACT_APP_ITINERARY_KEY env var
 *   6. Triggers a production deployment
 *   7. Seeds Firebase tripConfig (with coords for weather)
 *   8. Prints the live URL + a Claude seed prompt
 */

const readline = require('readline/promises');
const https = require('https');

// ── constants ──────────────────────────────────────────────────────────────
const VERCEL_TEAM_ID   = 'team_TP6ZdR0JzkPVtgP3iRrWyih9';
const GITHUB_REPO      = 'seannypower/trip-planner';
const GITHUB_REPO_ID   = '1186789288';
const FIREBASE_API_KEY = 'AIzaSyAaD0SfuCz1YOeFl2wiXfOBQerLAGgOxfY';
const FIREBASE_DB_URL  = 'https://itinerary-planner-f85a6-default-rtdb.firebaseio.com';

// ── http helper ────────────────────────────────────────────────────────────
function req(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method, headers },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

// ── geocode (Nominatim — no key required) ─────────────────────────────────
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await req(url, { headers: { 'User-Agent': 'trip-planner-cli/1.0' } });
  if (!res.body?.[0]) return null;
  return { lat: parseFloat(res.body[0].lat), lon: parseFloat(res.body[0].lon) };
}

// ── timezone lookup (timeapi.io — no key required) ────────────────────────
async function lookupTimezone(lat, lon) {
  const res = await req(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`);
  return res.body?.timeZone ?? null;
}

// ── firebase ───────────────────────────────────────────────────────────────
async function firebaseAnonToken() {
  const res = await req(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { returnSecureToken: true } }
  );
  return res.body?.idToken ?? null;
}

async function writeTripConfig(firebaseKey, tripConfig, token) {
  return req(
    `${FIREBASE_DB_URL}/${firebaseKey}/tripConfig.json?auth=${token}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: tripConfig }
  );
}

// ── vercel ─────────────────────────────────────────────────────────────────
function vercelHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function createProject(name, token) {
  return req(
    `https://api.vercel.com/v9/projects?teamId=${VERCEL_TEAM_ID}`,
    {
      method: 'POST',
      headers: vercelHeaders(token),
      body: {
        name,
        framework: 'create-react-app',
        gitRepository: { type: 'github', repo: GITHUB_REPO },
      },
    }
  );
}

async function addEnvVar(projectId, key, value, token) {
  return req(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${VERCEL_TEAM_ID}`,
    {
      method: 'POST',
      headers: vercelHeaders(token),
      body: [{ key, value, type: 'plain', target: ['production', 'preview'] }],
    }
  );
}

async function triggerDeployment(projectName, token) {
  return req(
    `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}&forceNew=1`,
    {
      method: 'POST',
      headers: vercelHeaders(token),
      body: {
        name: projectName,
        target: 'production',
        gitSource: { type: 'github', repoId: GITHUB_REPO_ID, ref: 'main' },
      },
    }
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function assert(condition, msg) {
  if (!condition) { console.error(`\nError: ${msg}`); process.exit(1); }
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => rl.question(q);

  console.log('\nTrip Planner — New Instance\n');

  const token      = process.env.VERCEL_TOKEN || await ask('Vercel API token: ');
  const tripName   = await ask('Trip name (e.g. "Austin Weekend"): ');
  const defaultSlug = slugify(tripName);
  const slugInput  = await ask(`URL slug [${defaultSlug}]: `);
  const slug       = slugInput.trim() || defaultSlug;
  const startDate  = await ask('Start date (YYYY-MM-DD): ');
  const numDaysRaw = await ask('Number of days: ');
  const location   = await ask('Location (city, state or country): ');
  const description = await ask('Short trip description: ');
  rl.close();

  const numDays     = parseInt(numDaysRaw, 10);
  const year        = startDate.split('-')[0];
  const firebaseKey = `itinerary-${slug}-${year}`;
  const projectName = `trip-planner-${slug}`;

  assert(token,        'Vercel token is required.');
  assert(tripName,     'Trip name is required.');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(startDate), 'Start date must be YYYY-MM-DD.');
  assert(numDays > 0,  'Number of days must be a positive integer.');

  // 1. Geocode
  process.stdout.write('\nGeocoding location... ');
  const coords = await geocode(location);
  assert(coords, `Could not geocode "${location}". Try a more specific city name.`);
  console.log(`${coords.lat}, ${coords.lon}`);

  // 2. Timezone
  process.stdout.write('Looking up timezone...  ');
  const timezone = await lookupTimezone(coords.lat, coords.lon);
  assert(timezone, 'Could not determine timezone. Check your internet connection.');
  console.log(timezone);

  // 3. Create Vercel project
  process.stdout.write('Creating Vercel project... ');
  const projRes = await createProject(projectName, token);
  if (projRes.status === 409) {
    console.log(`already exists — continuing`);
  } else {
    assert(projRes.status === 200 || projRes.status === 201,
      `Vercel project creation failed (${projRes.status}): ${JSON.stringify(projRes.body)}`);
    console.log('done');
  }
  const projectId = projRes.body.id || projectName;

  // 4. Set env var
  process.stdout.write('Setting env var... ');
  const envRes = await addEnvVar(projectId, 'REACT_APP_ITINERARY_KEY', firebaseKey, token);
  if (envRes.status === 409) {
    console.log('already set — continuing');
  } else {
    assert(envRes.status === 200 || envRes.status === 201,
      `Env var failed (${envRes.status}): ${JSON.stringify(envRes.body)}`);
    console.log(`REACT_APP_ITINERARY_KEY=${firebaseKey}`);
  }

  // 5. Trigger deployment
  process.stdout.write('Triggering deployment... ');
  const deployRes = await triggerDeployment(projectName, token);
  if (deployRes.status === 200 || deployRes.status === 201) {
    console.log('queued (~90s to go live)');
  } else {
    // Non-fatal — project creation may already queue one
    console.log(`skipped (${deployRes.status}) — check Vercel dashboard`);
  }

  // 6. Seed Firebase
  process.stdout.write('Writing Firebase tripConfig... ');
  const firebaseToken = await firebaseAnonToken();
  assert(firebaseToken, 'Could not get Firebase anonymous token.');
  const tripConfig = { tripName, startDate, numDays, latitude: coords.lat, longitude: coords.lon, timezone, description };
  const fbRes = await writeTripConfig(firebaseKey, tripConfig, firebaseToken);
  assert(fbRes.status === 200, `Firebase write failed (${fbRes.status}): ${JSON.stringify(fbRes.body)}`);
  console.log('done');

  // 7. Print summary
  const liveUrl = `https://${projectName}.vercel.app`;
  const seedPrompt = `Populate the trip planner at ${liveUrl} (Firebase key: ${firebaseKey}). Trip: "${tripName}", ${startDate}, ${numDays} days. ${description} Research activities, restaurants, and things to do, then write them to Firebase using the seed script in the runbook.`;

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Done!

 Live URL:     ${liveUrl}
 Vercel:       https://vercel.com/seannypowers-projects/${projectName}
 Firebase key: ${firebaseKey}
 Coords:       ${coords.lat}, ${coords.lon} (${timezone})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Claude seed prompt (paste into a new Project conversation):

 ${seedPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(err => { console.error('\nUnexpected error:', err.message); process.exit(1); });
