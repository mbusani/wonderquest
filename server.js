const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'wonderquest-data.json');
const sitePassword = process.env.SITE_PASSWORD || 'ohana';
const sessionSecret = process.env.SESSION_SECRET || `${sitePassword}-wonderquest-session`;
const cookieName = 'wq_session';

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({ profiles: [], activity: [] }, null, 2));
}

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '100kb' }));

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index > -1) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return cookies;
}

function sign(value) {
  return crypto.createHmac('sha256', sessionSecret).update(value).digest('hex');
}

function createToken() {
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const value = String(expires);
  return `${value}.${sign(value)}`;
}

function validToken(token = '') {
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isAuthenticated(req) {
  return validToken(parseCookies(req)[cookieName]);
}

function loginPage(message = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Enter WonderQuest</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;background:linear-gradient(145deg,#7c5cff,#33c6d9);padding:20px}.card{width:min(440px,100%);background:#fff;border-radius:30px;padding:28px;box-shadow:0 24px 70px #2b176866;text-align:center}.characters{height:155px;display:flex;justify-content:center;align-items:flex-end;gap:22px}.characters img{height:150px;max-width:155px;object-fit:contain}.blue-friend{width:118px;height:104px;background:#72c9f4;border:5px solid #276b9a;border-radius:48% 48% 42% 42%;position:relative;color:#123f63;display:grid;place-items:center;font-size:42px}.blue-friend:before,.blue-friend:after{content:"";position:absolute;top:8px;width:55px;height:75px;background:#72c9f4;border:5px solid #276b9a;border-radius:70% 20% 70% 20%;z-index:-1}.blue-friend:before{left:-36px;transform:rotate(-25deg)}.blue-friend:after{right:-36px;transform:scaleX(-1) rotate(-25deg)}h1{color:#5536c9;margin:12px 0 6px}p{color:#5c5870}.error{background:#fff0f0;color:#a51f1f;padding:10px;border-radius:12px;margin:12px 0}label{display:block;text-align:left;font-weight:700;color:#39324e;margin:18px 0 7px}input{width:100%;padding:14px 16px;border:2px solid #d9d1ff;border-radius:15px;font-size:18px}button{width:100%;margin-top:16px;padding:14px;border:0;border-radius:16px;background:#6c4ee8;color:#fff;font-weight:800;font-size:17px;cursor:pointer}small{display:block;margin-top:15px;color:#777}</style></head><body><main class="card"><div class="characters"><img src="/login-lilo" alt="Lilo waving"><img src="/login-stitch" alt="Stitch smiling"></div><h1>Welcome to WonderQuest</h1><p>Lilo and Stitch are ready for your next learning adventure.</p>${message ? `<div class="error">${message}</div>` : ''}<form method="post" action="/login"><label for="password">Family password</label><input id="password" name="password" type="password" required autofocus autocomplete="current-password"><button type="submit">Enter WonderQuest 🚀</button></form><small>Ask a parent or grown-up for the password.</small></main></body></html>`;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'wonderquest', version: '3.1.0' }));
app.get('/login-lilo', (_req, res) => res.sendFile(path.join(publicDir, 'assets', 'lilo.webp')));
app.get('/login-stitch', (_req, res) => res.sendFile(path.join(publicDir, 'assets', 'stitch.png')));
app.get('/login', (req, res) => isAuthenticated(req) ? res.redirect('/') : res.send(loginPage()));
app.post('/login', (req, res) => {
  const supplied = String(req.body.password || '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(sitePassword);
  const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!matches) return res.status(401).send(loginPage('That password was not correct. Please try again.'));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(createToken())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`);
  res.redirect('/');
});
app.get('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.redirect('/login');
});

app.use((req, res, next) => {
  if (isAuthenticated(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Password required.' });
  return res.redirect('/login');
});

app.use(express.static(publicDir));
app.get('/api/data', (_req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(dataFile, 'utf8'))); }
  catch { res.status(500).json({ error: 'Unable to read data.' }); }
});
app.post('/api/data', (req, res) => {
  try { fs.writeFileSync(dataFile, JSON.stringify(req.body || {}, null, 2)); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Unable to save data.' }); }
});
app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.listen(port, '0.0.0.0', () => console.log(`WonderQuest running on port ${port}`));
