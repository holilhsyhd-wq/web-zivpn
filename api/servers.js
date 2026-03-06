const { adb } = require("./_firebaseAdmin");
const { requireUser, ok, fail } = require("./_auth");

module.exports = async (req, res) => {
  try {
    const me = await requireUser(req);
    const snap = await adb.collection("servers").get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // resellerOnly filter
    const filtered = list.filter(s => !s.resellerOnly || me.role === "reseller" || me.role === "admin");
    ok(res, { servers: filtered, me });
  } catch (e) {
    fail(res, e.status || 500, e.message);
  }
};
