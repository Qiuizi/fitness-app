import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import CryptoJS from 'crypto-js';

const FEATURES = [
  { icon: '📈', text: '追踪每次训练的进步曲线' },
  { icon: '🔥', text: '连续打卡，养成运动习惯' },
  { icon: '🏆', text: '个人最佳记录，见证突破' },
  { icon: '⚖️', text: '体重趋势，全面掌控身材' },
];

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setMsg({ type: 'error', text: '密码至少需要6位' }); return; }
    setMsg({ type: '', text: '' });
    setLoading(true);
    const hashedPassword = CryptoJS.SHA256(password).toString();
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: hashedPassword }),
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
      background: 'var(--bg)', padding: '24px 20px', gap: 60,
    }}>
      {/* 左侧品牌 */}
      <div style={{ textAlign: 'left', maxWidth: 320, display: 'none' }} className="auth-brand-block">
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 16 }}>IRON</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', color: 'var(--text-1)', lineHeight: 1.1 }}>专为认真<br />训练的人</h1>
        <p style={{ fontSize: 16, color: 'var(--text-3)', margin: '0 0 32px' }}>简洁、纯粹，不干扰你的注意力</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 500, color: 'var(--text-1)' }}>
              <span style={{ fontSize: 20, width: 36, height: 36, background: 'var(--surface)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-s)', flexShrink: 0 }}>{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 注册表单 */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>IRON</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--text-1)' }}>创建账号</h1>
          <p style={{ fontSize: 15, color: 'var(--text-3)', margin: 0 }}>免费使用，无需绑定任何信息</p>
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-xl)',
          padding: '32px 28px', boxShadow: 'var(--shadow-l)', border: '1px solid var(--border)',
        }}>
          {msg.text && (
            <div style={{
              background: msg.type === 'error' ? 'var(--c-red-dim)' : 'var(--c-green-dim)',
              color: msg.type === 'error' ? '#c0392b' : '#1a7a35',
              border: `1px solid ${msg.type === 'error' ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.25)'}`,
              borderRadius: 'var(--r-s)', padding: '10px 14px', fontSize: 14, fontWeight: 500, marginBottom: 20,
            }}>{msg.text}</div>
          )}

          <form onSubmit={handleSubmit}>
            <label>用户名</label>
            <input
              type="text" placeholder="设置你的用户名"
              value={username} onChange={e => setUsername(e.target.value)}
              required autoFocus autoComplete="username"
            />
            <label>密码</label>
            <input
              type="password" placeholder="至少6位"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="new-password"
              style={{ marginBottom: 24 }}
            />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-l)', opacity: loading ? 0.6 : 1 }}>
              {loading ? '注册中…' : '免费注册'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-3)' }}>
            已有账号？<Link to="/login" style={{ color: 'var(--c-blue)', fontWeight: 600 }}>直接登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
