import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';
import { encryptPayload } from '../crypto';

// 眼睛图标
const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// 密码输入框（含显示/隐藏）
const PasswordInput = ({ value, onChange, placeholder, autoComplete, style }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', marginBottom: style?.marginBottom ?? 16 }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        style={{
          width: '100%',
          fontSize: 16,
          padding: '12px 44px 12px 14px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-m)',
          background: 'var(--surface)',
          color: 'var(--text-1)',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          appearance: 'none',
          WebkitAppearance: 'none',
          margin: '6px 0 0',
          boxSizing: 'border-box',
          fontFamily: show ? 'inherit' : 'inherit',
          letterSpacing: show ? 'normal' : '0.1em',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--c-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.18)'; }}
        onBlur={e =>  { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-30%)',
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: 'var(--text-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          transition: 'color 0.15s',
          lineHeight: 1,
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
        aria-label={show ? '隐藏密码' : '显示密码'}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: encryptPayload({ username, password }) }),
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
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 12 }}>IRON</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--text-1)' }}>欢迎回来</h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', margin: 0 }}>记录每一次进步</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-xl)',
          padding: '28px 24px 24px', boxShadow: 'var(--shadow-l)', border: '1px solid var(--border)',
        }}>
          {errorMsg && (
            <div style={{
              background: 'var(--c-red-dim)', color: 'var(--c-red)',
              border: '1px solid rgba(255,59,48,0.2)', borderRadius: 'var(--r-s)',
              padding: '10px 14px', fontSize: 14, fontWeight: 500, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>用户名</label>
            <input
              type="text" placeholder="请输入用户名"
              value={username} onChange={e => setUsername(e.target.value)}
              required autoFocus autoComplete="username"
              style={{ marginBottom: 16 }}
            />

            <label>密码</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{ marginBottom: 24 }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-l)', marginTop: 8, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-3)', margin: '20px 0 0' }}>
            还没有账号？<Link to="/register" style={{ color: 'var(--c-blue)', fontWeight: 600 }}>免费注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
