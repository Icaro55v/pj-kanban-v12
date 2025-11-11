const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'src')));

// armazenamento em memória (demo). Trocar por DB em produção.
const users = {};   // { username: { email, passwordHash } }
const pending = {}; // { username: { code, passwordHash, email, expiresAt } }

// transporter Gmail SMTP (use App Password ou OAuth2 em produção)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body || {};
  if (!username || !password || !email) return res.status(400).json({ error: 'missing_fields' });

  const u = username.toLowerCase();
  if (users[u]) return res.status(400).json({ error: 'user_exists' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const passwordHash = await bcrypt.hash(password, 10);
  pending[u] = { code, passwordHash, email, expiresAt: Date.now() + 10 * 60 * 1000 };

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
      to: email,
      subject: 'Código de verificação',
      text: `Seu código de verificação: ${code}`
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('mail error', err);
    delete pending[u];
    return res.status(500).json({ error: 'mail_failed' });
  }
});

app.post('/api/verify', (req, res) => {
  const { username, code } = req.body || {};
  const u = (username || '').toLowerCase();
  const p = pending[u];
  if (!p || p.expiresAt < Date.now()) return res.status(400).json({ error: 'invalid_or_expired' });
  if (p.code !== code) return res.status(400).json({ error: 'wrong_code' });

  users[u] = { email: p.email, passwordHash: p.passwordHash };
  delete pending[u];
  return res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const u = (username || '').toLowerCase();
  const user = users[u];
  if (!user) return res.status(400).json({ error: 'invalid_credentials' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'invalid_credentials' });
  return res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server rodando na porta ${port}`));