const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

// ---------- Storage: MongoDB (agar MONGODB_URI set hai) warna JSON file ----------
async function initStore() {
  if (process.env.MONGODB_URI) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const col = client.db(process.env.MONGODB_DB || 'mehra_cricket').collection('users');
    console.log('Storage: MongoDB');
    return {
      get: u => col.findOne({ _id: u }),
      create: async (u, doc) => {
        try { await col.insertOne({ _id: u, ...doc }); return true; }
        catch (e) { if (e.code === 11000) return false; throw e; }
      },
      setData: (u, data) => col.updateOne({ _id: u }, { $set: { data } })
    };
  }
  console.log('Storage: JSON file (' + FILE + ') — deploy ke liye MONGODB_URI set karo');
  let db = { users: {} };
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
  if (!db.users) db.users = {};
  let timer;
  const flush = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.writeFile(FILE + '.tmp', JSON.stringify(db), err => { if (!err) fs.rename(FILE + '.tmp', FILE, () => {}); });
    }, 200);
  };
  const has = u => Object.prototype.hasOwnProperty.call(db.users, u);
  return {
    get: async u => (has(u) ? db.users[u] : null),
    create: async (u, doc) => { if (has(u)) return false; db.users[u] = doc; flush(); return true; },
    setData: async (u, data) => { if (has(u)) { db.users[u].data = data; flush(); } }
  };
}

const sign = u => jwt.sign({ u }, SECRET, { expiresIn: '30d' });
const validUser = u => /^[a-z0-9_.-]{3,30}$/.test(u);
const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error(e); res.status(500).json({ error: 'Server error' });
});

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
let store;

const auth = wrap(async (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    const u = jwt.verify(t, SECRET).u;
    const user = await store.get(u);
    if (!user) throw new Error('no user');
    req.u = u; req.user = user; next();
  } catch (e) { res.status(401).json({ error: 'Login karo' }); }
});

app.get('/health', (req, res) => res.send('ok'));

app.get('/api/exists', wrap(async (req, res) => {
  const u = String(req.query.u || '').toLowerCase();
  res.json({ exists: validUser(u) && !!(await store.get(u)) });
}));

app.post('/api/signup', wrap(async (req, res) => {
  const u = String(req.body.u || '').trim().toLowerCase(), p = String(req.body.p || '');
  if (!validUser(u)) return res.status(400).json({ error: 'Username 3-30 character ka ho (a-z, 0-9, _ . -)' });
  if (p.length < 4) return res.status(400).json({ error: 'Password kam se kam 4 character ka rakho' });
  const doc = { hash: await bcrypt.hash(p, 10), data: { team: null, matches: [] } };
  if (!(await store.create(u, doc))) return res.status(409).json({ error: 'Account pehle se hai' });
  res.json({ token: sign(u), user: u, data: doc.data });
}));

app.post('/api/login', wrap(async (req, res) => {
  const u = String(req.body.u || '').trim().toLowerCase(), p = String(req.body.p || '');
  const user = validUser(u) ? await store.get(u) : null;
  if (!user) return res.status(404).json({ error: 'Account nahi mila' });
  if (!(await bcrypt.compare(p, user.hash))) return res.status(401).json({ error: 'Password galat hai' });
  res.json({ token: sign(u), user: u, data: user.data });
}));

app.get('/api/me', auth, (req, res) => res.json({ user: req.u, data: req.user.data }));

app.put('/api/data', auth, wrap(async (req, res) => {
  const d = req.body;
  if (!d || typeof d !== 'object' || !Array.isArray(d.matches)) return res.status(400).json({ error: 'Galat data' });
  await store.setData(req.u, { team: d.team || null, matches: d.matches });
  res.json({ ok: true });
}));

initStore().then(s => {
  store = s;
  app.listen(PORT, () => console.log('Mehra Cricket chal raha hai: http://localhost:' + PORT));
}).catch(e => { console.error('Storage start nahi hua:', e.message); process.exit(1); });