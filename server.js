const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

// ---- simple JSON-file database ----
let db = { users: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
if (!db.users) db.users = {};
let timer;
function flush() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.writeFile(FILE + '.tmp', JSON.stringify(db), err => { if (!err) fs.rename(FILE + '.tmp', FILE, () => {}); });
  }, 200);
}
const has = u => Object.prototype.hasOwnProperty.call(db.users, u);
const sign = u => jwt.sign({ u }, SECRET, { expiresIn: '30d' });
const validUser = u => /^[a-z0-9_.-]{3,30}$/.test(u);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    const u = jwt.verify(t, SECRET).u;
    if (!has(u)) throw new Error('no user');
    req.u = u; next();
  } catch (e) { res.status(401).json({ error: 'Login karo' }); }
}

app.get('/api/exists', (req, res) => {
  res.json({ exists: has(String(req.query.u || '').toLowerCase()) });
});

app.post('/api/signup', async (req, res) => {
  const u = String(req.body.u || '').trim().toLowerCase(), p = String(req.body.p || '');
  if (!validUser(u)) return res.status(400).json({ error: 'Username 3-30 character ka ho (a-z, 0-9, _ . -)' });
  if (p.length < 4) return res.status(400).json({ error: 'Password kam se kam 4 character ka rakho' });
  if (has(u)) return res.status(409).json({ error: 'Account pehle se hai' });
  db.users[u] = { hash: await bcrypt.hash(p, 10), data: { team: null, matches: [] } };
  flush();
  res.json({ token: sign(u), user: u, data: db.users[u].data });
});

app.post('/api/login', async (req, res) => {
  const u = String(req.body.u || '').trim().toLowerCase(), p = String(req.body.p || '');
  if (!has(u)) return res.status(404).json({ error: 'Account nahi mila' });
  if (!(await bcrypt.compare(p, db.users[u].hash))) return res.status(401).json({ error: 'Password galat hai' });
  res.json({ token: sign(u), user: u, data: db.users[u].data });
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.u, data: db.users[req.u].data }));

app.put('/api/data', auth, (req, res) => {
  const d = req.body;
  if (!d || typeof d !== 'object' || !Array.isArray(d.matches)) return res.status(400).json({ error: 'Galat data' });
  db.users[req.u].data = { team: d.team || null, matches: d.matches };
  flush();
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Mehra Cricket chal raha hai: http://localhost:' + PORT));
