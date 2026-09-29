const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.set("trust proxy", true);

// ====== CẤU HÌNH BẰNG BIẾN MÔI TRƯỜNG (Render -> Environment) ======
const CONFIG = {
  name: process.env.SITE_NAME || "TROLLMODZ",
  sub: process.env.SITE_SUB || "CHIA SẺ TÀI NGUYÊN",
  logo: process.env.LOGO_URL || "/logo.svg",
  image: process.env.IMAGE_URL || "/demo.svg", // ảnh demo
};
const TOTAL = parseInt(process.env.KEY_TOTAL || "100", 10); // tổng số key
// Danh sách link, ngăn cách bằng dấu phẩy:  LINKS=https://a.com/x,https://b.com/y
const LINKS = (process.env.LINKS || "").split(",").map((s) => s.trim()).filter(Boolean);
// ====================================================================

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data.json");
let db = {};
try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (_) {}

function save() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const ipOf = (req) => String(req.ip || req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
const remaining = () => Math.max(0, TOTAL - Object.keys(db).length);

app.use(express.json());
app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

app.get("/api/config", (_req, res) => res.json(CONFIG));

// Số key còn + link (nếu IP này đã bấm Get key)
app.get("/api/status", (req, res) => {
  const mine = db[ipOf(req)];
  res.json({ remaining: remaining(), total: TOTAL, link: mine ? mine.link : null });
});

// Bấm Get key -> cấp 1 link, mỗi IP chỉ 1 lần
app.post("/api/get", (req, res) => {
  const ip = ipOf(req);
  if (!db[ip]) {
    if (remaining() <= 0) return res.status(410).json({ error: "Đã hết key" });
    if (!LINKS.length) return res.status(500).json({ error: "Chưa cấu hình link" });
    db[ip] = { link: LINKS[Math.floor(Math.random() * LINKS.length)], at: new Date().toISOString() };
    save();
  }
  res.json({ remaining: remaining(), total: TOTAL, link: db[ip].link });
});

app.use(express.static(path.join(__dirname, "public")));
app.listen(process.env.PORT || 3000, () => console.log("running"));
