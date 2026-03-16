const express = require('express');
const jwt     = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const User    = require('../models/User');
const router  = express.Router();

// ─── AES 解密中间件 ─────────────────────────────────────────────────────────
const PAYLOAD_KEY = (process.env.PAYLOAD_KEY || 'fallback-dev-key')
  .padEnd(32, '0')
  .slice(0, 32);

const decryptPayload = (req, res, next) => {
  const { data } = req.body || {};

  // 若没有 data 字段（如旧版客户端），直接放行让后续报错
  if (!data) {
    return res.status(400).json({ msg: 'Missing encrypted payload' });
  }

  try {
    const [ivHex, ciphertext] = data.split(':');
    if (!ivHex || !ciphertext) throw new Error('bad format');

    const iv  = CryptoJS.enc.Hex.parse(ivHex);
    const key = CryptoJS.enc.Utf8.parse(PAYLOAD_KEY);

    const decrypted = CryptoJS.AES.decrypt(
      ciphertext,
      key,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plain) throw new Error('empty after decrypt');

    const parsed = JSON.parse(plain);
    if (!parsed.username || !parsed.password) throw new Error('missing fields');

    // 把解密后的字段挂到 req 上供后续路由使用
    req.decrypted = parsed;
    next();
  } catch (err) {
    console.error('[auth] decrypt failed:', err.message);
    return res.status(400).json({ msg: 'Invalid payload' });
  }
};

// ─── JWT 鉴权中间件 ─────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// ─── 获取当前用户 ───────────────────────────────────────────────────────────
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ─── 注册 ───────────────────────────────────────────────────────────────────
router.post('/register', decryptPayload, async (req, res) => {
  const { username, password } = req.decrypted;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ username, password });
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ─── 登录 ───────────────────────────────────────────────────────────────────
router.post('/login', decryptPayload, async (req, res) => {
  const { username, password } = req.decrypted;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
