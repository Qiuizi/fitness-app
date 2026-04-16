import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(list => list.map(t => t.id === id ? { ...t, leaving: true } : t));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setTimeout(() => {
      setToasts(list => list.filter(t => t.id !== id));
    }, 220);
  }, []);

  const push = useCallback((message, opts = {}) => {
    const id = ++idCounter;
    const duration = opts.duration ?? 2600;
    const variant = opts.variant || 'info';
    setToasts(list => [...list, { id, message, variant, leaving: false }]);
    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const api = useRef({
    show:    (msg, opts) => push(msg, opts),
    success: (msg, opts) => push(msg, { ...opts, variant: 'success' }),
    error:   (msg, opts) => push(msg, { ...opts, variant: 'error', duration: opts?.duration ?? 3800 }),
    info:    (msg, opts) => push(msg, { ...opts, variant: 'info' }),
    dismiss,
  });
  api.current.show = (msg, opts) => push(msg, opts);
  api.current.success = (msg, opts) => push(msg, { ...opts, variant: 'success' });
  api.current.error = (msg, opts) => push(msg, { ...opts, variant: 'error', duration: opts?.duration ?? 3800 });
  api.current.info = (msg, opts) => push(msg, { ...opts, variant: 'info' });
  api.current.dismiss = dismiss;

  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.variant}${t.leaving ? ' leaving' : ''}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="toast-icon" aria-hidden="true">{iconFor(t.variant)}</span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {}, success: () => {}, error: () => {}, info: () => {}, dismiss: () => {},
    };
  }
  return ctx;
};

const iconFor = (variant) => {
  if (variant === 'success') return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".18"/><path d="M5.5 10.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (variant === 'error') return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".18"/><path d="M10 6v5M10 14v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".18"/><path d="M10 9v5M10 6v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
};

export default ToastProvider;
