const { admin, adb } = require("./_firebaseAdmin");

async function requireUser(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw Object.assign(new Error("No token"), { status: 401 });

  const decoded = await admin.auth().verifyIdToken(token);
  const uid = decoded.uid;

  const ref = adb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ role: "user", saldo: 0, createdAt: Date.now() }, { merge: true });
    return { uid, role: "user", saldo: 0 };
  }
  const u = snap.data();
  return { uid, role: u.role || "user", saldo: Number(u.saldo || 0) };
}

function requireRole(minRole, role) {
  const rank = { user: 0, reseller: 1, admin: 2 };
  if ((rank[role] ?? 0) < (rank[minRole] ?? 0)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
}

function ok(res, data) { res.status(200).json({ ok: true, ...data }); }
function fail(res, status, msg) { res.status(status).json({ ok: false, msg }); }

module.exports = { requireUser, requireRole, ok, fail };
