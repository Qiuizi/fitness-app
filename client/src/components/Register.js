import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
const PasswordInput = ({ value, onChange, placeholder, autoComplete }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', margin: '6px 0 0' }}>
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
          boxSizing: 'border-box',
          letterSpacing: show ? 'normal' : '0.1em',
          margin: 0,
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
          transform: 'translateY(-50%)',
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

// 密码强度计算
const getStrength = (pwd) => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: '弱', color: 'var(--c-red)' };
  if (score <= 2) return { score, label: '一般', color: 'var(--c-orange)' };
  if (score <= 3) return { score, label: '中等', color: '#f0c000' };
  if (score <= 4) return { score, label: '强', color: 'var(--c-green)' };
  return { score, label: '很强', color: 'var(--c-green)' };
};

// 密码强度条
const StrengthBar = ({ password }) => {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  const total = 5;
  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < score ? color : 'var(--border)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'right' }}>{label}</div>
    </div>
  );
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg]           = useState({ type: '', text: '' });
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setMsg({ type: 'error', text: '密码至少需要6位' }); return; }
    setMsg({ type: '', text: '' });
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: encryptPayload({ username, password }) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: '注册成功，正在跳转…' });
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setMsg({ type: 'error', text: data.msg === 'User already exists' ? '该用户名已被使用' : (data.msg || '注册失败') });
      }
    } catch { setMsg({ type: 'error', text: '网络错误，请稍后再试' }); }
    finally { setLoading(false); }
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
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--text-1)' }}>创建账号</h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', margin: 0 }}>免费使用，无需绑定任何信息</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-xl)',
          padding: '28px 24px 24px', boxShadow: 'var(--shadow-l)', border: '1px solid var(--border)',
        }}>
          {msg.text && (
            <div style={{
              background: msg.type === 'error' ? 'var(--c-red-dim)' : 'var(--c-green-dim)',
              color: msg.type === 'error' ? '#c0392b' : '#1a7a35',
              border: `1px solid ${msg.type === 'error' ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.25)'}`,
              borderRadius: 'var(--r-s)', padding: '10px 14px', fontSize: 14, fontWeight: 500, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{msg.type === 'error' ? '⚠️' : '✅'}</span> {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>用户名</label>
            <input
              type="text" placeholder="设置你的用户名"
              value={username} onChange={e => setUsername(e.target.value)}
              required autoFocus autoComplete="username"
              style={{ marginBottom: 16 }}
            />

            <label>密码</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少6位"
              autoComplete="new-password"
            />
            <StrengthBar password={password} />

            <div style={{ marginBottom: 20 }} />

            <button
              type="submit"
              disabled={loading || password.length < 6}
              style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-l)', opacity: (loading || password.length < 6) ? 0.5 : 1 }}
            >
              {loading ? '注册中…' : '免费注册'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-3)', margin: '20px 0 0' }}>
            已有账号？<Link to="/login" style={{ color: 'var(--c-blue)', fontWeight: 600 }}>直接登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
