#!/usr/bin/env node
/**
 * Run: npm run doctor
 * Use PORT=3010 npm run doctor for another port.
 * Use when the browser shows ERR_CONNECTION_REFUSED, or the site loads with no Tailwind styles.
 */
import { execSync } from "node:child_process";
import http from "node:http";

const port = process.env.PORT || "3000";

const parts = process.versions.node.split(".").map(Number);
const major = parts[0] ?? 0;
const minor = parts[1] ?? 0;
const nodeOk = major > 18 || (major === 18 && minor >= 17);

console.log("\n=== Dentily doctor ===\n");
console.log("Node:", process.version, nodeOk ? "(OK for Next 14)" : "(TOO OLD — need >= 18.17)");
console.log("");

let listen = "";
try {
  listen = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
    encoding: "utf8",
  }).trim();
} catch {
  listen = "";
}
if (listen) {
  console.log(`Port ${port} LISTEN:\n${listen}\n`);
} else {
  console.log(`Port ${port}: nothing listening — the dev server is NOT running.\n`);
  console.log(`  Fix: cd to the project, run  npm run dev  (or npm run dev:boot) and leave that terminal open.`);
  if (port === "3000") {
    console.log(`       If something might be stuck on 3000:  npm run free:3000  then  npm run dev`);
  }
  console.log(`       Wait for "✓ Ready", then open http://127.0.0.1:${port} in the browser.\n`);
}

await new Promise((resolve) => {
  const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
    let b = "";
    res.on("data", (c) => (b += c));
    res.on("end", () => {
      console.log(`GET /api/health → HTTP ${res.statusCode} ${b.slice(0, 80)}`);
      resolve();
    });
  });
  req.on("error", (e) => {
    console.log(`GET /api/health → ${e.code || e.message} (server not up)`);
    resolve();
  });
  req.setTimeout(2000, () => {
    req.destroy();
    console.log("GET /api/health → timeout");
    resolve();
  });
});

/** If this returns non-200, the HTML loads but Tailwind/global CSS does not (unstyled page). */
try {
  const base = `http://127.0.0.1:${port}`;
  const home = await fetch(`${base}/`);
  if (!home.ok) {
    console.log(`GET / → HTTP ${home.status} (stylesheet check skipped)`);
  } else {
    const html = await home.text();
    const m = html.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/);
    if (!m) {
      console.log(
        'GET / → no app stylesheet link found (expected href="/_next/static/css/....css")',
      );
    } else {
      const cssPath = m[1];
      const cssRes = await fetch(`${base}${cssPath}`);
      const ok = cssRes.ok ? "OK" : "FAIL — page will look unstyled";
      console.log(`GET ${cssPath} → HTTP ${cssRes.status} (${ok})`);
      if (!cssRes.ok) {
        console.log(
          `  Fix: stop all Next processes, then: npm run clean && npm run build && npx next start -p ${port}`,
        );
      }
    }
  }
} catch (e) {
  const code = e?.cause?.code || e?.code;
  if (code === "ECONNREFUSED") {
    console.log("Stylesheet check → skipped (nothing listening on this port)");
  } else {
    console.log(`Stylesheet check → ${e?.message || e}`);
  }
}

console.log(`
What to do:
  1. Terminal:  cd /path/to/Dentily
  2. nvm use && node -v   (must be v22.x or v20.x / 18.17+)
  3. npm run dev:boot     (loads nvm, then starts Next — use if IDE shows old Node)
  4. Wait for:  ✓ Ready
  5. Browser:    http://127.0.0.1:${port}  (avoid http://localhost — macOS may use IPv6 ::1 first → "refused")
  6. Keep the dev terminal OPEN while you browse.
  7. Unstyled page? Run PORT=${port} npm run doctor — if GET /_next/static/css/... fails, clean + rebuild + one server only.
`);
console.log("=== end ===\n");
