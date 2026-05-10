/* Mock backend for the Vue dev server. Handles only what the UI needs to render. */
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const log = (req, _res, next) => { console.log(`[mock] ${req.method} ${req.url}`); next(); };
app.use(log);

const now = () => new Date().toISOString();

// --- /token (axios-auth-refresh path) ---
app.get('/api/v1/token', (req, res) => {
  res.json({
    access_token: 'mock-token',
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    logout_url: '/logout',
    login_url: '/login',
  });
});

// --- /user-info ---
const me = {
  user_id: 'kai-demo',
  email: 'kai.demo@sdcourt.ca.gov',
  display_name: 'Kai Demo',
  first_name: 'Kai',
  last_name: 'Demo',
  role: [
    { role_name: 'super-admin' },
    { role_name: 'cis-admin' },
    { role_name: 'cis-user' },
  ],
  location: {
    id: 1, addressLine1: '220 W Broadway', addressLine2: null, city: 'San Diego',
    createdAt: now(), latitude: 32.7180, locationCode: 'CCH', longitude: -117.1640,
    name: 'Central Courthouse, San Diego', timezone: 'America/Los_Angeles', postalCode: '92101',
    shortDescription: 'Central (Hall of Justice)', updatedAt: now(),
  },
};
app.get('/api/v1/user-info', (_req, res) => res.json(me));
app.get('/api/v1/user-info/', (_req, res) => res.json(me));
app.get('/api/v1/user-info/all', (_req, res) => res.json([
  { user_id: 'kai-demo', display_name: 'Kai Demo',     email: 'kai.demo@sdcourt.ca.gov',     first_name: 'Kai',    last_name: 'Demo',  role: me.role, location: me.location },
  { user_id: 'a-singh',  display_name: 'Aman Singh',   email: 'aman.singh@sdcourt.ca.gov',   first_name: 'Aman',   last_name: 'Singh', role: [{ role_name: 'cis-user' }],  location: me.location },
  { user_id: 'l-tran',   display_name: 'Linh Tran',    email: 'linh.tran@sdcourt.ca.gov',    first_name: 'Linh',   last_name: 'Tran',  role: [{ role_name: 'cis-admin' }], location: me.location },
]));
app.put('/api/v1/user-info/save-location', (_req, res) => res.json({ ok: true }));

// --- /location ---
const locations = [
  { id: 1, name: 'Central Courthouse',         locationCode: 'CCH', timezone: 'America/Los_Angeles', shortDescription: 'Central (Hall of Justice)', addressLine1: '1100 Union St',     addressLine2: null, city: 'San Diego',  latitude: 32.7176, longitude: -117.1657, postalCode: '92101', createdAt: now(), updatedAt: now() },
  { id: 2, name: 'Hall of Justice',            locationCode: 'HOJ', timezone: 'America/Los_Angeles', shortDescription: 'Hall of Justice',            addressLine1: '330 W Broadway',    addressLine2: null, city: 'San Diego',  latitude: 32.7177, longitude: -117.1640, postalCode: '92101', createdAt: now(), updatedAt: now() },
  { id: 3, name: 'East County Regional Center',locationCode: 'ECR', timezone: 'America/Los_Angeles', shortDescription: 'East County (El Cajon)',     addressLine1: '250 E Main St',     addressLine2: null, city: 'El Cajon',   latitude: 32.7944, longitude: -116.9625, postalCode: '92020', createdAt: now(), updatedAt: now() },
  { id: 4, name: 'North County Regional Center',locationCode:'NCR', timezone: 'America/Los_Angeles', shortDescription: 'North County (Vista)',       addressLine1: '325 S Melrose Dr',  addressLine2: null, city: 'Vista',      latitude: 33.1745, longitude: -117.2469, postalCode: '92081', createdAt: now(), updatedAt: now() },
  { id: 5, name: 'South County Regional Center',locationCode:'SCR', timezone: 'America/Los_Angeles', shortDescription: 'South County (Chula Vista)', addressLine1: '500 3rd Ave',       addressLine2: null, city: 'Chula Vista',latitude: 32.6391, longitude: -117.0824, postalCode: '91910', createdAt: now(), updatedAt: now() },
  { id: 6, name: 'Juvenile Court',             locationCode: 'JUV', timezone: 'America/Los_Angeles', shortDescription: 'Juvenile (Meadow Lark)',     addressLine1: '2851 Meadow Lark Dr',addressLine2: null, city: 'San Diego',  latitude: 32.8094, longitude: -117.1311, postalCode: '92123', createdAt: now(), updatedAt: now() },
];
app.get('/api/v1/location', (_req, res) => res.json(locations));

// --- /language ---
const languages = [
  { id: 1, name: 'Punjabi' }, { id: 2, name: 'Mandarin' }, { id: 3, name: 'Cantonese' },
  { id: 4, name: 'Spanish' }, { id: 5, name: 'Vietnamese' }, { id: 6, name: 'Tagalog' },
  { id: 7, name: 'Arabic' }, { id: 8, name: 'Farsi' }, { id: 9, name: 'Russian' },
  { id: 10, name: 'Korean' }, { id: 11, name: 'Hindi' }, { id: 12, name: 'Ukrainian' },
  { id: 13, name: 'ASL' }, { id: 14, name: 'French' }, { id: 15, name: 'Portuguese' },
];
app.get('/api/v1/language', (_req, res) => res.json(languages));

// --- /rate ---
app.get('/api/v1/rate', (_req, res) => res.json([
  { id: 1, name: 'MILEAGE', value: 0.61, previousValue: 0.55, valueChangedDate: '2024-04-01' },
  { id: 2, name: 'LODGING', value: 145, previousValue: 130, valueChangedDate: '2024-04-01' },
  { id: 3, name: 'BREAKFAST', value: 16.5, previousValue: 15, valueChangedDate: '2024-04-01' },
  { id: 4, name: 'LUNCH', value: 18.0, previousValue: 16.5, valueChangedDate: '2024-04-01' },
  { id: 5, name: 'DINNER', value: 32.5, previousValue: 30, valueChangedDate: '2024-04-01' },
  { id: 6, name: 'SPKL1', value: 45, previousValue: 42, valueChangedDate: '2024-04-01' },
  { id: 7, name: 'SPKL2', value: 55, previousValue: 50, valueChangedDate: '2024-04-01' },
  { id: 8, name: 'SPKL3', value: 65, previousValue: 60, valueChangedDate: '2024-04-01' },
  { id: 9, name: 'SPKL4', value: 75, previousValue: 70, valueChangedDate: '2024-04-01' },
  { id: 10, name: 'ASL1', value: 70, previousValue: 65, valueChangedDate: '2024-04-01' },
  { id: 11, name: 'ASL2', value: 80, previousValue: 75, valueChangedDate: '2024-04-01' },
  { id: 12, name: 'CART', value: 90, previousValue: 85, valueChangedDate: '2024-04-01' },
]));
app.put('/api/v1/rate', (_req, res) => res.json({ ok: true }));

// --- /holidays/stats/:start/:end ---
app.get('/api/v1/holidays/stats/:start/:end', (req, res) => {
  const years = [];
  for (let y = +req.params.start; y <= +req.params.end; y++) {
    years.push({
      Year: String(y),
      NewYearsDay: `${y}-01-01`,
      BcFamilyDay: `${y}-02-19`,
      GoodFriday: `${y}-03-29`,
      EasterMonday: `${y}-04-01`,
      VictoriaDay: `${y}-05-20`,
      CanadaDay: `${y}-07-01`,
      BcDay: `${y}-08-05`,
      LabourDay: `${y}-09-02`,
      TruthAndReconciliationDay: `${y}-09-30`,
      Thanksgiving: `${y}-10-14`,
      RemembranceDay: `${y}-11-11`,
      ChristmasDay: `${y}-12-25`,
      BoxingDay: `${y}-12-26`,
      NextYearNewYearsDay: `${y + 1}-01-01`,
    });
  }
  res.json(years);
});

// --- /role ---
app.get('/api/v1/role/all', (_req, res) => res.json([
  { id: 1, role_name: 'super-admin', role_description: 'Full system access' },
  { id: 2, role_name: 'cis-admin', role_description: 'Manage interpreters, languages, rates' },
  { id: 3, role_name: 'cis-user', role_description: 'Create and manage bookings' },
]));
app.put('/api/v1/role/assign', (_req, res) => res.json({ ok: true }));
app.post('/api/v1/role/request-access', (_req, res) => res.json({ ok: true }));

// --- /interpreter ---
const interpreters = [
  { id: 101, firstName: 'Priya',  lastName: 'Kaur',       fullName: 'Priya Kaur',       address: '845 4th Ave',         city: 'San Diego',  province: 'CA', postal: '92101', phone: '619-555-0101', homePhone: '619-555-0101', businessPhone: '',             email: 'priya.kaur@example.com',   supplier: 'S-101', gst: '', comments: 'Senior interpreter, 12 yrs',     criminalRecordCheckDate: '2024-09-12', contractExtension: true,  highestLevel: 4, languages: [{ languageId: 1,  level: 4, languageName: 'Punjabi',    commentOnLevel: null }, { languageId: 11, level: 3, languageName: 'Hindi',      commentOnLevel: null }], events: [], booking: [], adminComments: 'Top performer' },
  { id: 102, firstName: 'Wei',    lastName: 'Chen',       fullName: 'Wei Chen',         address: '110 W A St',          city: 'San Diego',  province: 'CA', postal: '92101', phone: '619-555-0102', homePhone: '',            businessPhone: '619-555-0102', email: 'wei.chen@example.com',     supplier: 'S-102', gst: '',       comments: '',                                criminalRecordCheckDate: '2024-11-02', contractExtension: false, highestLevel: 3, languages: [{ languageId: 2,  level: 3, languageName: 'Mandarin',   commentOnLevel: null }, { languageId: 3,  level: 3, languageName: 'Cantonese',  commentOnLevel: null }], events: [], booking: [], adminComments: '' },
  { id: 103, firstName: 'Maria',  lastName: 'Lopez',      fullName: 'Maria Lopez',      address: '321 G St',            city: 'Chula Vista',province: 'CA', postal: '91910', phone: '619-555-0103', homePhone: '619-555-0103', businessPhone: '',             email: 'maria.lopez@example.com',  supplier: 'S-103', gst: '',       comments: 'Available evenings',              criminalRecordCheckDate: '2025-01-20', contractExtension: true,  highestLevel: 4, languages: [{ languageId: 4,  level: 4, languageName: 'Spanish',    commentOnLevel: null }, { languageId: 15, level: 2, languageName: 'Portuguese', commentOnLevel: null }], events: [], booking: [], adminComments: '' },
  { id: 104, firstName: 'Linh',   lastName: 'Nguyen',     fullName: 'Linh Nguyen',      address: '6720 El Cajon Blvd',  city: 'San Diego',  province: 'CA', postal: '92115', phone: '619-555-0104', homePhone: '',            businessPhone: '619-555-0104', email: 'linh.nguyen@example.com',  supplier: 'S-104', gst: '',       comments: '',                                criminalRecordCheckDate: '2024-07-14', contractExtension: true,  highestLevel: 3, languages: [{ languageId: 5,  level: 3, languageName: 'Vietnamese', commentOnLevel: null }], events: [], booking: [], adminComments: '' },
  { id: 105, firstName: 'Omar',   lastName: 'Haddad',     fullName: 'Omar Haddad',      address: '450 N Magnolia Ave',  city: 'El Cajon',   province: 'CA', postal: '92020', phone: '619-555-0105', homePhone: '',            businessPhone: '619-555-0105', email: 'omar.haddad@example.com',  supplier: 'S-105', gst: '',       comments: 'Court-experienced',               criminalRecordCheckDate: '2024-12-03', contractExtension: false, highestLevel: 4, languages: [{ languageId: 7,  level: 4, languageName: 'Arabic',     commentOnLevel: null }, { languageId: 8,  level: 3, languageName: 'Farsi',      commentOnLevel: null }], events: [], booking: [], adminComments: '' },
  { id: 106, firstName: 'Sara',   lastName: 'Park',       fullName: 'Sara Park',        address: '895 Eastlake Pkwy',   city: 'Chula Vista',province: 'CA', postal: '91914', phone: '619-555-0106', homePhone: '',            businessPhone: '619-555-0106', email: 'sara.park@example.com',    supplier: 'S-106', gst: '',       comments: '',                                criminalRecordCheckDate: '2025-02-01', contractExtension: true,  highestLevel: 3, languages: [{ languageId: 10, level: 3, languageName: 'Korean',     commentOnLevel: null }], events: [], booking: [], adminComments: '' },
  { id: 107, firstName: 'Iryna',  lastName: 'Kovalenko',  fullName: 'Iryna Kovalenko',  address: '4001 Mission Blvd',   city: 'San Diego',  province: 'CA', postal: '92109', phone: '619-555-0107', homePhone: '',            businessPhone: '619-555-0107', email: 'iryna.k@example.com',      supplier: 'S-107', gst: '',       comments: 'Bilingual',                       criminalRecordCheckDate: '2024-10-19', contractExtension: true,  highestLevel: 3, languages: [{ languageId: 9,  level: 3, languageName: 'Russian',    commentOnLevel: null }, { languageId: 12, level: 4, languageName: 'Ukrainian',  commentOnLevel: null }], events: [], booking: [], adminComments: '' },
  { id: 108, firstName: 'Diego',  lastName: 'Reyes',      fullName: 'Diego Reyes',      address: '500 S Melrose Dr',    city: 'Vista',      province: 'CA', postal: '92081', phone: '760-555-0108', homePhone: '',            businessPhone: '760-555-0108', email: 'diego.reyes@example.com',  supplier: 'S-108', gst: '',       comments: '',                                criminalRecordCheckDate: '2024-08-30', contractExtension: false, highestLevel: 4, languages: [{ languageId: 4,  level: 4, languageName: 'Spanish',    commentOnLevel: null }], events: [], booking: [], adminComments: '' },
];
app.post('/api/v1/interpreter/search', (_req, res) => res.json(interpreters.slice(0, 6)));
app.post('/api/v1/interpreter/search-full-detail', (_req, res) => res.json(interpreters));
app.post('/api/v1/interpreter', (req, res) => res.json({ id: 999, ...(req.body || {}) }));
app.put('/api/v1/interpreter/:id', (req, res) => res.json({ id: +req.params.id, ...(req.body || {}) }));
app.delete('/api/v1/interpreter/:id', (_req, res) => res.json({ ok: true }));
app.post('/api/v1/interpreter/download-data-in-excel', (_req, res) => res.send(Buffer.from('mock-xlsx')));

// --- /booking ---
const today = new Date();
const iso = d => new Date(d).toISOString();
const dayShift = n => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
const bookings = [
  {
    id: 5001, clerkPhone: '619-450-7100', schedulingClerk: 'J. Bennett', created_at: iso(dayShift(-3)), updated_at: iso(dayShift(-1)), updated_by: 'kai-demo',
    interpreter: { id: 101, firstName: 'Priya', lastName: 'Kaur', fullName: 'Priya Kaur', phone: '619-555-0101', email: 'priya.kaur@example.com', languages: interpreters[0].languages, address: interpreters[0].address, city: interpreters[0].city, province: 'CA', postal: interpreters[0].postal, courts: [{ court_id: 3, court_code: 'ECR', distance: 17, duration: 22, interpreter_id: 101 }] },
    location_id: 3, location_name: 'East County Regional Center', location: { id: 3, name: 'East County Regional Center', locationCode: 'ECR', timezone: 'America/Los_Angeles', shortDescription: 'East County (El Cajon)' },
    dates: [{ id: 7001, locationId: 3, interpreterId: 101, date: iso(dayShift(2)).slice(0, 10), startTime: '09:30', finishTime: '12:00', status: 'Booked', methodOfAppearance: 'In-Person', registry: 'East County', cases: [{ file: '12345', caseName: 'People v. Smith', room: '201', caseType: 'Criminal', courtLevel: 'Limited', courtClass: 'Adult', courtClassOther: '', reason: 'Trial', reasonOther: '', bilingual: false, interpretationMode: 'Consecutive', language: { languageId: 1, level: 4, languageName: 'Punjabi' }, interpretFor: 'Defendant', federal: false, prosecutor: 'A. Khan', remoteRegistry: '', remoteLocationId: 0, vanRegistry: '', vanLocationId: 0, requestedBy: 'Defense', methodOfAppearance: 'In-Person', antcpStartTime: '09:30' }], comment: '', languages: [{ languageId: 1, language: 'Punjabi', level: 4, interpretFor: 'Defendant' }] }],
    feesGST: 0, feesTotal: 0, expenseGST: 0, expenseTotal: 0, invoiceTotal: 0, invoiceDate: '', invoiceNumber: '', admDetail: null, adm_updated_by: '',
  },
  {
    id: 5002, clerkPhone: '619-450-7100', schedulingClerk: 'M. Larsen', created_at: iso(dayShift(-5)), updated_at: iso(dayShift(-2)), updated_by: 'a-singh',
    interpreter: { id: 102, firstName: 'Wei', lastName: 'Chen', fullName: 'Wei Chen', phone: '619-555-0102', email: 'wei.chen@example.com', languages: interpreters[1].languages, address: interpreters[1].address, city: 'San Diego', province: 'CA', postal: interpreters[1].postal, courts: [{ court_id: 2, court_code: 'HOJ', distance: 4, duration: 9, interpreter_id: 102 }] },
    location_id: 2, location_name: 'Hall of Justice', location: { id: 2, name: 'Hall of Justice', locationCode: 'HOJ', timezone: 'America/Los_Angeles', shortDescription: 'Hall of Justice' },
    dates: [{ id: 7002, locationId: 2, interpreterId: 102, date: iso(dayShift(4)).slice(0, 10), startTime: '14:00', finishTime: '16:30', status: 'Booked', methodOfAppearance: 'Video Conference', registry: 'Central', cases: [{ file: '67890', caseName: 'People v. Lin', room: '305', caseType: 'Criminal', courtLevel: 'Unlimited', courtClass: 'Adult', courtClassOther: '', reason: 'Sentencing', reasonOther: '', bilingual: false, interpretationMode: 'Simultaneous', language: { languageId: 2, level: 3, languageName: 'Mandarin' }, interpretFor: 'Defendant', federal: false, prosecutor: 'D. Cole', remoteRegistry: '', remoteLocationId: 0, vanRegistry: '', vanLocationId: 0, requestedBy: 'Court', methodOfAppearance: 'Video Conference', antcpStartTime: '14:00' }], comment: 'Felony matter', languages: [{ languageId: 2, language: 'Mandarin', level: 3, interpretFor: 'Defendant' }] }],
    feesGST: 0, feesTotal: 0, expenseGST: 0, expenseTotal: 0, invoiceTotal: 0, invoiceDate: '', invoiceNumber: '', admDetail: null, adm_updated_by: '',
  },
  {
    id: 5003, clerkPhone: '619-450-7100', schedulingClerk: 'R. Wong', created_at: iso(dayShift(-1)), updated_at: iso(dayShift(0)), updated_by: 'kai-demo',
    interpreter: { id: 103, firstName: 'Maria', lastName: 'Lopez', fullName: 'Maria Lopez', phone: '619-555-0103', email: 'maria.lopez@example.com', languages: interpreters[2].languages, address: interpreters[2].address, city: 'Chula Vista', province: 'CA', postal: interpreters[2].postal, courts: [{ court_id: 1, court_code: 'CCH', distance: 7, duration: 12, interpreter_id: 103 }] },
    location_id: 1, location_name: 'Central Courthouse', location: { id: 1, name: 'Central Courthouse', locationCode: 'CCH', timezone: 'America/Los_Angeles', shortDescription: 'Central (Hall of Justice)' },
    dates: [{ id: 7003, locationId: 1, interpreterId: 103, date: iso(dayShift(1)).slice(0, 10), startTime: '10:00', finishTime: '11:30', status: 'Pending', methodOfAppearance: 'In-Person', registry: 'Central', cases: [{ file: '24680', caseName: 'People v. Hernandez', room: 'A1', caseType: 'Criminal', courtLevel: 'Limited', courtClass: 'Juvenile', courtClassOther: '', reason: 'Arraignment', reasonOther: '', bilingual: false, interpretationMode: 'Consecutive', language: { languageId: 4, level: 4, languageName: 'Spanish' }, interpretFor: 'Witness', federal: false, prosecutor: 'L. Ng', remoteRegistry: '', remoteLocationId: 0, vanRegistry: '', vanLocationId: 0, requestedBy: 'D.A.', methodOfAppearance: 'In-Person', antcpStartTime: '10:00' }], comment: '', languages: [{ languageId: 4, language: 'Spanish', level: 4, interpretFor: 'Witness' }] }],
    feesGST: 0, feesTotal: 0, expenseGST: 0, expenseTotal: 0, invoiceTotal: 0, invoiceDate: '', invoiceNumber: '', admDetail: null, adm_updated_by: '',
  },
  {
    id: 5004, clerkPhone: '619-450-7100', schedulingClerk: 'A. Pal', created_at: iso(dayShift(-7)), updated_at: iso(dayShift(-1)), updated_by: 'l-tran',
    interpreter: { id: 105, firstName: 'Omar', lastName: 'Haddad', fullName: 'Omar Haddad', phone: '619-555-0105', email: 'omar.haddad@example.com', languages: interpreters[4].languages, address: interpreters[4].address, city: 'El Cajon', province: 'CA', postal: interpreters[4].postal, courts: [{ court_id: 2, court_code: 'HOJ', distance: 18, duration: 26, interpreter_id: 105 }] },
    location_id: 2, location_name: 'Hall of Justice', location: { id: 2, name: 'Hall of Justice', locationCode: 'HOJ', timezone: 'America/Los_Angeles', shortDescription: 'Hall of Justice' },
    dates: [{ id: 7004, locationId: 2, interpreterId: 105, date: iso(dayShift(6)).slice(0, 10), startTime: '09:00', finishTime: '15:00', status: 'Booked', methodOfAppearance: 'In-Person', registry: 'Central', cases: [{ file: '99102', caseName: 'People v. Ahmadi', room: '54', caseType: 'Criminal', courtLevel: 'Unlimited', courtClass: 'Adult', courtClassOther: '', reason: 'Trial', reasonOther: '', bilingual: false, interpretationMode: 'Consecutive', language: { languageId: 7, level: 4, languageName: 'Arabic' }, interpretFor: 'Defendant', federal: false, prosecutor: 'P. Gill', remoteRegistry: '', remoteLocationId: 0, vanRegistry: '', vanLocationId: 0, requestedBy: 'Defense', methodOfAppearance: 'In-Person', antcpStartTime: '09:00' }], comment: 'Multi-day trial', languages: [{ languageId: 7, language: 'Arabic', level: 4, interpretFor: 'Defendant' }] }],
    feesGST: 0, feesTotal: 0, expenseGST: 0, expenseTotal: 0, invoiceTotal: 0, invoiceDate: '', invoiceNumber: '', admDetail: null, adm_updated_by: '',
  },
  {
    id: 5005, clerkPhone: '760-201-8500', schedulingClerk: 'T. Singh', created_at: iso(dayShift(-2)), updated_at: iso(dayShift(0)), updated_by: 'kai-demo',
    interpreter: { id: 106, firstName: 'Sara', lastName: 'Park', fullName: 'Sara Park', phone: '619-555-0106', email: 'sara.park@example.com', languages: interpreters[5].languages, address: interpreters[5].address, city: 'Chula Vista', province: 'CA', postal: interpreters[5].postal, courts: [{ court_id: 4, court_code: 'NCR', distance: 41, duration: 52, interpreter_id: 106 }] },
    location_id: 4, location_name: 'North County Regional Center', location: { id: 4, name: 'North County Regional Center', locationCode: 'NCR', timezone: 'America/Los_Angeles', shortDescription: 'North County (Vista)' },
    dates: [{ id: 7005, locationId: 4, interpreterId: 106, date: iso(dayShift(8)).slice(0, 10), startTime: '13:30', finishTime: '15:00', status: 'Booked', methodOfAppearance: 'Telephone', registry: 'North County', cases: [{ file: '11223', caseName: 'People v. Choi', room: '102', caseType: 'Criminal', courtLevel: 'Limited', courtClass: 'Adult', courtClassOther: '', reason: 'Initial Appearance', reasonOther: '', bilingual: false, interpretationMode: 'Consecutive', language: { languageId: 10, level: 3, languageName: 'Korean' }, interpretFor: 'Defendant', federal: false, prosecutor: 'M. Banerjee', remoteRegistry: 'Vista', remoteLocationId: 4, vanRegistry: '', vanLocationId: 0, requestedBy: 'Court', methodOfAppearance: 'Telephone', antcpStartTime: '13:30' }], comment: '', languages: [{ languageId: 10, language: 'Korean', level: 3, interpretFor: 'Defendant' }] }],
    feesGST: 0, feesTotal: 0, expenseGST: 0, expenseTotal: 0, invoiceTotal: 0, invoiceDate: '', invoiceNumber: '', admDetail: null, adm_updated_by: '',
  },
];
app.post('/api/v1/booking/search', (_req, res) => res.json(bookings));
app.get('/api/v1/booking/:id', (req, res) => res.json(bookings.find(b => b.id === +req.params.id) || bookings[0]));
app.get('/api/v1/booking/interpreter/:id', (_req, res) => res.json(bookings));
app.post('/api/v1/booking', (req, res) => res.json({ id: 9999, ...(req.body || {}) }));
app.put('/api/v1/booking/:id', (_req, res) => res.json({ ok: true }));
app.put('/api/v1/booking/adm/:id', (_req, res) => res.json({ ok: true }));
app.get('/api/v1/booking/invoice-number/:n', (_req, res) => res.json({ count: 0 }));

// --- /audit ---
app.get('/api/v1/audit/multiple-session-booking-overpaid', (_req, res) => res.json([]));
app.get('/api/v1/audit/same-date-booking', (_req, res) => res.json([]));
app.get('/api/v1/audit/same-date-booking-diff-locations', (_req, res) => res.json([]));

// --- /geo ---
app.get('/api/v1/geo/interpreters', (_req, res) => res.json(interpreters.map(i => ({ id: i.id, firstName: i.firstName, lastName: i.lastName, address: i.address, city: i.city, postal: i.postal, addressLatitude: 49 + Math.random(), addressLongitude: -123 + Math.random(), courts: [] }))));
app.get('/api/v1/geo/updating-status', (_req, res) => res.json({ status: 'idle', progress: 0 }));
app.get('/api/v1/geo/update-locations', (_req, res) => res.json({ ok: true }));
app.get('/api/v1/geo/update-geo-coordinates', (_req, res) => res.json({ ok: true }));
app.put('/api/v1/geo/update-geo-coordinates/:id', (_req, res) => res.json({ ok: true }));

// --- /files & /adm ---
app.post('/api/v1/files/search', (_req, res) => res.json([]));
app.post('/api/v1/files/appearance', (_req, res) => res.json([]));
app.get('/api/v1/adm/fillable-pdf', (_req, res) => res.send(Buffer.from('%PDF-1.4 mock')));

app.use((req, res) => { console.log('[mock] 404', req.method, req.url); res.status(404).json({ error: 'not_found' }); });

const port = process.env.PORT || 8082;
app.listen(port, '0.0.0.0', () => console.log(`[mock] listening on :${port}`));
