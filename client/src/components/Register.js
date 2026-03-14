import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

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
    if (password.length < 6) {
      setMsg({ type: 'error', text: '密码至少需要6位' });
      return;
    }
    setMsg({ type: '', text: '' });
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: '注册成功，正在跳转...' });
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setMsg({ type: 'error', text: data.msg === 'User already exists' ? '该用户名已被使用' : data.msg });
      }
    } catch {
      setMsg({ type: 'error', text: '网络错误，请稍后再试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
      {/* 左侧：产品价值主张 */}
      <div className="auth-value-prop">
        <div className="auth-logo">💪</div>
        <h1 className="auth-title">FitTrack</h1>
        <p className="auth-tagline">专为认真训练的人打造</p>
        <ul className="feature-list">
          {FEATURES.map((f, i) => (
            <li key={i} className="feature-item">
              <span className="feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 右侧：注册表单 */}
      <div className="form-container auth-card">
        <h2>创建账号</h2>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: 14, marginBottom: 24, marginTop: -16 }}>
          免费使用，无需绑定任何信息
        </p>

        {msg.text && (
          <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>用户名</label>
          <input
            type="text"
            placeholder="设置你的用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />
          <label>密码</label>
          <input
            type="password"
            placeholder="至少6位"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '注册中...' : '免费注册'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 14, color: 'var(--apple-text-secondary)' }}>
          已有账号？<Link to="/login">直接登录</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
