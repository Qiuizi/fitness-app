import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';
import CryptoJS from 'crypto-js';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const hashedPassword = CryptoJS.SHA256(password).toString();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: hashedPassword }),
      });
      const data = await res.json();
      if (res.ok) { login(data.token); navigate('/'); }
      else setErrorMsg('用户名或密码错误，请重试');
    } catch {
      setErrorMsg('网络错误，请稍后再试');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>IRON</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--text-1)' }}>欢迎回来</h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', margin: 0 }}>记录每一次进步</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-xl)',
          padding: '32px 28px', boxShadow: 'var(--shadow-l)', border: '1px solid var(--border)',
        }}>
          {errorMsg && (
            <div style={{
              background: 'var(--c-red-dim)', color: '#c0392b',
              border: '1px solid rgba(255,59,48,0.2)', borderRadius: 'var(--r-s)',
              padding: '10px 14px', fontSize: 14, fontWeight: 500, marginBottom: 20,
            }}>{errorMsg}</div>
          )}

          <form onSubmit={handleSubmit}>
            <label>用户名</label>
            <input
              type="text" placeholder="请输入用户名"
              value={username} onChange={e => setUsername(e.target.value)}
              required autoFocus autoComplete="username"
            />
            <label>密码</label>
            <input
              type="password" placeholder="请输入密码"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{ marginBottom: 24 }}
            />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-l)', opacity: loading ? 0.6 : 1 }}>
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-3)' }}>
            还没有账号？<Link to="/register" style={{ color: 'var(--c-blue)', fontWeight: 600 }}>免费注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
