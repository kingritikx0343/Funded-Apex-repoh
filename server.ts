import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// When running via `node dist/server.cjs` (production start script), __filename ends with 'server.cjs'.
// When running via `tsx server.ts` (`npm run dev`), it runs in development mode with Vite middleware.
const isBundledProdServer =
  typeof __filename !== 'undefined' && __filename.endsWith('server.cjs');

const isProduction =
  isBundledProdServer || process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Cloud Run & Load Balancer Health Check Endpoints
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'fundedapex.com',
      supportEmail: 'fundedapexsupport@gmail.com',
      mode: isProduction ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/healthz', (_req, res) => {
    res.status(200).send('ok');
  });

  // Server-side live market quotes proxy (bypasses mobile carrier DNS blocks on exchange APIs)
  app.get('/api/market/quotes', async (_req, res) => {
    const symbolsParam = encodeURIComponent(
      JSON.stringify([
        'BTCUSDT',
        'ETHUSDT',
        'SOLUSDT',
        'XRPUSDT',
        'BNBUSDT',
        'ADAUSDT',
        'DOGEUSDT',
        'AVAXUSDT',
        'LINKUSDT',
        'PAXGUSDT',
      ])
    );
    for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const r = await fetch(`${host}/api/v3/ticker/24hr?symbols=${symbolsParam}`, {
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          res.status(200).json({ ok: true, tickers: data });
          return;
        }
      } catch {
        // try next host
      }
    }
    res.status(200).json({ ok: false, tickers: [] });
  });

  // Server-side live historical klines proxy for all timeframes (1m, 5m, 15m, 30m, 1h, 4h)
  app.get('/api/market/klines', async (req, res) => {
    const symbol = String(req.query.symbol || 'PAXGUSDT').toUpperCase();
    const interval = String(req.query.interval || '15m');
    const limit = Math.min(120, Math.max(20, Number(req.query.limit) || 80));

    for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const r = await fetch(
          `${host}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(
            interval
          )}&limit=${limit}`,
          { signal: ctrl.signal }
        );
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          res.status(200).json({ ok: true, klines: data });
          return;
        }
      } catch {
        // try next host
      }
    }
    res.status(200).json({ ok: false, klines: [] });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidateDist = path.resolve(process.cwd(), 'dist');
    const distPath = fs.existsSync(path.join(candidateDist, 'index.html'))
      ? candidateDist
      : process.cwd();

    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1h',
      })
    );

    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(200).send('FUNDED APEX Platform is running.');
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(
      `[FUNDED APEX] Server listening on http://${HOST}:${PORT} (mode: ${
        isProduction ? 'production' : 'development'
      })`
    );
  });
}

startServer().catch((err) => {
  console.error('[FUNDED APEX] Failed to start server:', err);
  process.exit(1);
});
