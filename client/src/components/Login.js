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

    // 前端哈希，避免明文传输
    const hashedPassword = CryptoJS.SHA256(password).toString();

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: hashedPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token);
        navigate('/');
      } else {
        setErrorMsg('用户名或密码错误，请重试');
      }
    } catch {
      setErrorMsg('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-logo">💪</div>
        <h1 className="auth-title">FitTrack</h1>
        <p className="auth-subtitle">记录每一次进步，成为更好的自己</p>
      </div>

      <div className="form-container auth-card">
        <h2>登录</h2>

        {errorMsg && (
          <div className="auth-error">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label>用户名</label>
          <input
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />
          <label>密码</label>
          <input
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 14, color: 'var(--apple-text-secondary)' }}>
          还没有账号？<Link to="/register">免费注册</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
