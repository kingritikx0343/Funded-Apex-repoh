var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// src/engine/userVault.ts
function normalizeUserEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function mergeUserProfileRecords(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      email: normalizeUserEmail(incoming.email) || incoming.email
    };
  }
  const existingEmail = normalizeUserEmail(existing.email);
  const incomingEmail = normalizeUserEmail(incoming.email);
  const email = incomingEmail || existingEmail;
  const existingIsSeed = Boolean(existing.isSeedDefault);
  const incomingIsSeed = Boolean(incoming.isSeedDefault);
  const existingHasHash = Boolean(existing.passwordHash);
  const incomingHasHash = Boolean(incoming.passwordHash);
  const existingPwTs = typeof existing.passwordUpdatedAt === "number" ? existing.passwordUpdatedAt : existingIsSeed ? 0 : 1;
  const incomingPwTs = typeof incoming.passwordUpdatedAt === "number" ? incoming.passwordUpdatedAt : incomingIsSeed ? 0 : 1;
  let resolvedPasswordHash = existing.passwordHash;
  let resolvedPwTs = existing.passwordUpdatedAt;
  let resolvedIsSeed = existing.isSeedDefault;
  if (!existingHasHash && incomingHasHash) {
    resolvedPasswordHash = incoming.passwordHash;
    resolvedPwTs = incoming.passwordUpdatedAt;
    resolvedIsSeed = incoming.isSeedDefault;
  } else if (existingHasHash && !incomingHasHash) {
    resolvedPasswordHash = existing.passwordHash;
    resolvedPwTs = existing.passwordUpdatedAt;
    resolvedIsSeed = existing.isSeedDefault;
  } else if (existingHasHash && incomingHasHash) {
    if (existingIsSeed && !incomingIsSeed) {
      resolvedPasswordHash = incoming.passwordHash;
      resolvedPwTs = incoming.passwordUpdatedAt ?? Date.now();
      resolvedIsSeed = false;
    } else if (!existingIsSeed && incomingIsSeed) {
      resolvedPasswordHash = existing.passwordHash;
      resolvedPwTs = existing.passwordUpdatedAt;
      resolvedIsSeed = false;
    } else if (incomingPwTs > existingPwTs) {
      resolvedPasswordHash = incoming.passwordHash;
      resolvedPwTs = incoming.passwordUpdatedAt;
      resolvedIsSeed = incoming.isSeedDefault;
    } else {
      resolvedPasswordHash = existing.passwordHash;
      resolvedPwTs = existing.passwordUpdatedAt ?? incoming.passwordUpdatedAt;
      resolvedIsSeed = existing.isSeedDefault ?? incoming.isSeedDefault;
    }
  }
  const incomingCountry = incoming.country && incoming.country !== "United States" ? incoming.country : existing.country || incoming.country || "United States";
  const rolePriority = {
    user: 0,
    admin: 1,
    super_admin: 2
  };
  const resolvedRole = (rolePriority[incoming.role] ?? 0) >= (rolePriority[existing.role] ?? 0) ? incoming.role || existing.role : existing.role;
  const createdA = existing.createdAt ? Date.parse(existing.createdAt) : Number.MAX_SAFE_INTEGER;
  const createdB = incoming.createdAt ? Date.parse(incoming.createdAt) : Number.MAX_SAFE_INTEGER;
  const earliestCreatedAt = Number.isFinite(createdA) && Number.isFinite(createdB) ? createdA <= createdB ? existing.createdAt : incoming.createdAt : existing.createdAt || incoming.createdAt;
  return {
    ...existing,
    ...incoming,
    uid: existing.uid && !existing.isSeedDefault ? existing.uid : incoming.uid || existing.uid,
    email,
    fullName: incoming.fullName && (!existing.fullName || !incomingIsSeed) ? incoming.fullName : existing.fullName || incoming.fullName,
    country: incomingCountry,
    referralCode: existing.referralCode || incoming.referralCode,
    role: resolvedRole,
    rewardPoints: Math.max(Number(existing.rewardPoints || 0), Number(incoming.rewardPoints || 0)),
    lastSpinDate: incoming.lastSpinDate || existing.lastSpinDate,
    mfaEnabled: Boolean(existing.mfaEnabled || incoming.mfaEnabled),
    deletionRequested: Boolean(incoming.deletionRequested ?? existing.deletionRequested),
    avatarUrl: incoming.avatarUrl || existing.avatarUrl,
    passwordHash: resolvedPasswordHash,
    passwordUpdatedAt: resolvedPwTs,
    isSeedDefault: resolvedIsSeed,
    createdAt: earliestCreatedAt,
    kycStatus: incoming.kycStatus || existing.kycStatus,
    kycDocType: incoming.kycDocType || existing.kycDocType,
    kycSubmittedAt: incoming.kycSubmittedAt || existing.kycSubmittedAt
  };
}
function mergeUserDirectories(existingUsers = [], incomingUsers = []) {
  const byKey = /* @__PURE__ */ new Map();
  const upsert = (userRecord) => {
    if (!userRecord) return;
    const normEmail = normalizeUserEmail(userRecord.email);
    const key = normEmail || String(userRecord.uid || "");
    if (!key) return;
    const prev = byKey.get(key);
    byKey.set(key, mergeUserProfileRecords(prev, userRecord));
  };
  for (const u of existingUsers) upsert(u);
  for (const u of incomingUsers) upsert(u);
  return Array.from(byKey.values());
}

// server.ts
var PORT = Number(process.env.PORT) || 3e3;
var HOST = "0.0.0.0";
var isBundledProdServer = typeof __filename !== "undefined" && __filename.endsWith("server.cjs");
var isProduction = isBundledProdServer || process.env.NODE_ENV === "production";
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "15mb" }));
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "fundedapex.com",
      supportEmail: "fundedapexsupport@gmail.com",
      mode: isProduction ? "production" : "development",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/healthz", (_req, res) => {
    res.status(200).send("ok");
  });
  const DATA_DIR = import_node_path.default.resolve(process.cwd(), ".data");
  const VAULT_FILE = import_node_path.default.join(DATA_DIR, "apex_vault.json");
  function readServerVault() {
    try {
      if (import_node_fs.default.existsSync(VAULT_FILE)) {
        const raw = import_node_fs.default.readFileSync(VAULT_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
    }
    return {};
  }
  function writeServerVault(incoming) {
    try {
      if (!import_node_fs.default.existsSync(DATA_DIR)) {
        import_node_fs.default.mkdirSync(DATA_DIR, { recursive: true });
      }
      const existing = readServerVault();
      const mergeById = (arrA = [], arrB = [], keyField = "id") => {
        const map = /* @__PURE__ */ new Map();
        for (const item of arrA) {
          if (item && item[keyField]) map.set(String(item[keyField]), item);
        }
        for (const item of arrB) {
          if (item && item[keyField]) {
            const prev = map.get(String(item[keyField]));
            map.set(String(item[keyField]), prev ? { ...prev, ...item } : item);
          }
        }
        return Array.from(map.values());
      };
      let incomingPurchaseRequests = incoming.purchaseRequests || incoming.purchase_requests || [];
      if (incoming.purchaseRequest && typeof incoming.purchaseRequest === "object") {
        incomingPurchaseRequests = [incoming.purchaseRequest, ...Array.isArray(incomingPurchaseRequests) ? incomingPurchaseRequests : []];
      }
      const merged = {
        ...existing,
        ...incoming,
        users: mergeUserDirectories(existing.users, incoming.users),
        accounts: mergeById(existing.accounts, incoming.accounts || incoming.trading_accounts, "id"),
        orders: mergeById(existing.orders, incoming.orders, "id"),
        purchaseRequests: mergeById(existing.purchaseRequests, incomingPurchaseRequests, "id"),
        coupons: mergeById(existing.coupons, incoming.coupons, "id"),
        adminCoupons: mergeById(existing.adminCoupons, incoming.adminCoupons, "id"),
        payouts: mergeById(existing.payouts, incoming.payouts, "id"),
        emailNotifications: mergeById(
          existing.emailNotifications,
          incoming.emailNotifications,
          "id"
        ),
        paymentSettings: incoming.paymentSettings ? { ...existing.paymentSettings || {}, ...incoming.paymentSettings } : existing.paymentSettings,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      import_node_fs.default.writeFileSync(VAULT_FILE, JSON.stringify(merged), "utf-8");
      return merged;
    } catch {
      return incoming;
    }
  }
  app.get("/api/vault/sync", (_req, res) => {
    const data = readServerVault();
    res.status(200).json({ ok: true, vault: data });
  });
  app.post("/api/vault/sync", (req, res) => {
    const merged = writeServerVault(req.body || {});
    res.status(200).json({ ok: true, vault: merged });
  });
  app.post("/api/vault/save", (req, res) => {
    const merged = writeServerVault(req.body || {});
    res.status(200).json({ ok: true, vault: merged });
  });
  app.post("/api/vault/purchase-request", (req, res) => {
    const payload = req.body;
    if (!payload || !payload.id && !payload.orderNumber) {
      res.status(400).json({ ok: false, error: "Invalid purchase request payload." });
      return;
    }
    const merged = writeServerVault({ purchaseRequest: payload });
    res.status(200).json({
      ok: true,
      message: "Purchase request received and secured in institutional vault.",
      purchaseRequests: merged.purchaseRequests
    });
  });
  app.get("/api/vault/purchase-requests", (_req, res) => {
    const data = readServerVault();
    res.status(200).json({
      ok: true,
      purchaseRequests: Array.isArray(data.purchaseRequests) ? data.purchaseRequests : []
    });
  });
  app.post("/api/email/dispatch", (req, res) => {
    const mail = req.body;
    if (!mail || !mail.to || !mail.subject) {
      res.status(400).json({ ok: false, error: "Missing required email fields (to, subject)." });
      return;
    }
    const existing = readServerVault();
    const list = Array.isArray(existing.emailNotifications) ? existing.emailNotifications : [];
    const enriched = {
      ...mail,
      id: mail.id || `mail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sentAt: mail.sentAt || (/* @__PURE__ */ new Date()).toISOString(),
      deliveryStatus: "delivered"
    };
    writeServerVault({ emailNotifications: [enriched, ...list.slice(0, 199)] });
    res.status(200).json({
      ok: true,
      email: enriched,
      provider: "FUNDED APEX Transactional Mail Relay (fundedapexsupport@gmail.com)"
    });
  });
  app.get("/api/email/inbox", (req, res) => {
    const emailFilter = String(req.query.email || "").trim().toLowerCase();
    const existing = readServerVault();
    const list = Array.isArray(existing.emailNotifications) ? existing.emailNotifications : [];
    const filtered = emailFilter ? list.filter(
      (m) => String(m.to || "").toLowerCase() === emailFilter || String(m.to || "").toLowerCase() === "all@fundedapex.com"
    ) : list;
    res.status(200).json({ ok: true, emails: filtered });
  });
  app.get("/api/market/quotes", async (_req, res) => {
    const symbolsParam = encodeURIComponent(
      JSON.stringify([
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "BNBUSDT",
        "PAXGUSDT"
      ])
    );
    const swissquotePairs = [
      ["XAUUSD", "XAU/USD"],
      ["XAGUSD", "XAG/USD"],
      ["EURUSD", "EUR/USD"],
      ["GBPUSD", "GBP/USD"],
      ["USDJPY", "USD/JPY"],
      ["USDCHF", "USD/CHF"],
      ["AUDUSD", "AUD/USD"],
      ["USDCAD", "USD/CAD"],
      ["NZDUSD", "NZD/USD"],
      ["EURGBP", "EUR/GBP"],
      ["EURJPY", "EUR/JPY"],
      ["GBPJPY", "GBP/JPY"]
    ];
    const spotQuotes = {};
    const fetchSwissquote = async () => {
      await Promise.all(
        swissquotePairs.map(async ([sym, sqPath]) => {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2200);
            const r = await fetch(
              `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${sqPath}`,
              { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } }
            );
            clearTimeout(timer);
            if (r.ok) {
              const j = await r.json();
              const prices = j?.[0]?.spreadProfilePrices;
              const best = prices?.find(
                (p) => /zero|prime|premium|standard|elite/i.test(p.spreadProfile || "")
              ) || prices?.[0];
              if (best && Number(best.bid) > 0 && Number(best.ask) > 0) {
                spotQuotes[sym] = {
                  bid: Number(best.bid),
                  ask: Number(best.ask)
                };
              }
            }
          } catch {
          }
        })
      );
      if (!spotQuotes.XAUUSD) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2e3);
          const r = await fetch("https://api.gold-api.com/price/XAU", { signal: ctrl.signal });
          clearTimeout(timer);
          if (r.ok) {
            const j = await r.json();
            const price = Number(j?.price);
            if (price > 0) {
              spotQuotes.XAUUSD = { bid: price - 0.18, ask: price + 0.18 };
            }
          }
        } catch {
        }
      }
    };
    const fetchBinance = async () => {
      for (const host of ["https://data-api.binance.vision", "https://api.binance.com"]) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const r = await fetch(`${host}/api/v3/ticker/24hr?symbols=${symbolsParam}`, {
            signal: ctrl.signal
          });
          clearTimeout(timer);
          if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data)) return data;
          }
        } catch {
        }
      }
      return [];
    };
    const [, tickers] = await Promise.all([fetchSwissquote(), fetchBinance()]);
    res.status(200).json({
      ok: tickers.length > 0 || Object.keys(spotQuotes).length > 0,
      tickers,
      spotQuotes
    });
  });
  app.get("/api/market/klines", async (req, res) => {
    const rawSymbol = String(req.query.symbol || "XAUUSD").toUpperCase();
    const interval = String(req.query.interval || "15m");
    const limit = Math.min(500, Math.max(20, Number(req.query.limit) || 350));
    const yahooSymbolMap = {
      XAUUSD: "GC=F",
      GOLD: "GC=F",
      PAXGUSDT: "GC=F",
      XAGUSD: "SI=F",
      USOIL: "CL=F",
      UKOIL: "BZ=F",
      EURUSD: "EURUSD=X",
      GBPUSD: "GBPUSD=X",
      USDJPY: "JPY=X",
      USDCHF: "CHF=X",
      AUDUSD: "AUDUSD=X",
      USDCAD: "CAD=X",
      NZDUSD: "NZDUSD=X",
      EURGBP: "EURGBP=X",
      EURJPY: "EURJPY=X",
      GBPJPY: "GBPJPY=X",
      NAS100: "NQ=F",
      US30: "YM=F",
      US500: "ES=F",
      GER40: "^GDAXI",
      UK100: "^FTSE"
    };
    const yahooTicker = yahooSymbolMap[rawSymbol];
    if (yahooTicker) {
      try {
        const normInt = interval === "1M" ? "1mo" : interval.toLowerCase();
        const is4h = normInt === "4h";
        const yfInterval = normInt === "1m" ? "1m" : normInt === "5m" ? "5m" : normInt === "15m" ? "15m" : normInt === "30m" ? "30m" : normInt === "1h" || is4h ? "60m" : normInt === "1w" ? "1wk" : normInt === "1mo" ? "1mo" : "1d";
        const yfRange = normInt === "1m" ? "5d" : normInt === "5m" || normInt === "15m" || normInt === "30m" ? "1mo" : normInt === "1h" || is4h ? "6mo" : normInt === "1w" || normInt === "1mo" ? "5y" : "2y";
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3200);
        const yfRes = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            yahooTicker
          )}?interval=${yfInterval}&range=${yfRange}`,
          {
            signal: ctrl.signal,
            headers: { "User-Agent": "Mozilla/5.0" }
          }
        );
        clearTimeout(timer);
        if (yfRes.ok) {
          const yfJson = await yfRes.json();
          const result = yfJson?.chart?.result?.[0];
          const timestamps = result?.timestamp || [];
          const quoteObj = result?.indicators?.quote?.[0] || {};
          const opens = quoteObj.open || [];
          const highs = quoteObj.high || [];
          const lows = quoteObj.low || [];
          const closes = quoteObj.close || [];
          const volumes = quoteObj.volume || [];
          const parsedBars = [];
          for (let i = 0; i < timestamps.length; i++) {
            const o = opens[i];
            const h = highs[i];
            const l = lows[i];
            const c = closes[i];
            if (o === null || h === null || l === null || c === null || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c) || o <= 0 || c <= 0) {
              continue;
            }
            const v = volumes[i] && Number.isFinite(volumes[i]) && Number(volumes[i]) > 0 ? Number(volumes[i]) : 120;
            parsedBars.push([
              timestamps[i] * 1e3,
              String(o),
              String(h),
              String(l),
              String(c),
              String(v)
            ]);
          }
          if (parsedBars.length >= 25) {
            if (parsedBars.length >= 2) {
              const lastBar = parsedBars[parsedBars.length - 1];
              const prevBar = parsedBars[parsedBars.length - 2];
              const lastO = parseFloat(lastBar[1]);
              const lastH = parseFloat(lastBar[2]);
              const lastL = parseFloat(lastBar[3]);
              const lastC = parseFloat(lastBar[4]);
              if (lastO === lastH && lastH === lastL && lastL === lastC) {
                prevBar[2] = String(Math.max(parseFloat(prevBar[2]), lastC));
                prevBar[3] = String(Math.min(parseFloat(prevBar[3]), lastC));
                prevBar[4] = String(lastC);
                parsedBars.pop();
              }
            }
            if (is4h) {
              const agg4h = [];
              for (let i = 0; i < parsedBars.length; i += 4) {
                const chunk = parsedBars.slice(i, i + 4);
                if (chunk.length === 0) continue;
                const open = chunk[0][1];
                const close = chunk[chunk.length - 1][4];
                const high = String(Math.max(...chunk.map((b) => parseFloat(b[2]))));
                const low = String(Math.min(...chunk.map((b) => parseFloat(b[3]))));
                const vol = String(chunk.reduce((s, b) => s + parseFloat(b[5]), 0));
                agg4h.push([chunk[0][0], open, high, low, close, vol]);
              }
              res.status(200).json({ ok: true, klines: agg4h.slice(-limit), source: "yahoo" });
              return;
            }
            res.status(200).json({ ok: true, klines: parsedBars.slice(-limit), source: "yahoo" });
            return;
          }
        }
      } catch {
      }
    }
    const binanceSymbol = rawSymbol === "XAUUSD" || rawSymbol === "GOLD" ? "PAXGUSDT" : rawSymbol === "BTCUSD" ? "BTCUSDT" : rawSymbol === "ETHUSD" ? "ETHUSDT" : rawSymbol === "SOLUSD" ? "SOLUSDT" : rawSymbol === "XRPUSD" ? "XRPUSDT" : rawSymbol === "BNBUSD" ? "BNBUSDT" : rawSymbol;
    for (const host of ["https://data-api.binance.vision", "https://api.binance.com"]) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3e3);
        const r = await fetch(
          `${host}/api/v3/klines?symbol=${encodeURIComponent(
            binanceSymbol
          )}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
          { signal: ctrl.signal }
        );
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          res.status(200).json({ ok: true, klines: data, source: "binance" });
          return;
        }
      } catch {
      }
    }
    res.status(200).json({ ok: false, klines: [] });
  });
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const candidateDist = import_node_path.default.resolve(process.cwd(), "dist");
    const distPath = import_node_fs.default.existsSync(import_node_path.default.join(candidateDist, "index.html")) ? candidateDist : process.cwd();
    app.use(
      import_express.default.static(distPath, {
        index: false,
        maxAge: "1h"
      })
    );
    app.get("*", (_req, res) => {
      const indexFile = import_node_path.default.join(distPath, "index.html");
      if (import_node_fs.default.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(200).send("FUNDED APEX Platform is running.");
      }
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(
      `[FUNDED APEX] Server listening on http://${HOST}:${PORT} (mode: ${isProduction ? "production" : "development"})`
    );
  });
}
startServer().catch((err) => {
  console.error("[FUNDED APEX] Failed to start server:", err);
  process.exit(1);
});
