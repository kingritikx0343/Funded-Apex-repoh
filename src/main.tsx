import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<div style="background:#04080A;color:#00E5B0;padding:24px;font-family:sans-serif;text-align:center;">FUNDED APEX: Root element missing.</div>';
} else {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (err: any) {
    console.error('Fatal initialization error:', err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;background:#04080A;color:#F4FBFA;display:flex;align-items:center;justify-content:center;padding:20px;font-family:sans-serif;text-align:center;">
        <div style="max-width:440px;background:#09181F;border:1px solid rgba(0,229,176,0.3);border-radius:18px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.8);">
          <h2 style="color:#00E5B0;margin-top:0;font-size:22px;">FUNDED APEX</h2>
          <p style="color:#A3BDB8;font-size:14px;line-height:1.6;">Platform loading encountered a display initialization issue.</p>
          <button onclick="window.location.reload()" style="background:#00E5B0;color:#04080A;border:none;border-radius:12px;padding:10px 24px;font-weight:bold;font-size:13px;cursor:pointer;margin-top:14px;">Reload Platform</button>
        </div>
      </div>
    `;
  }
}
