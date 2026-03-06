const { adb } = require("./_firebaseAdmin");
const { requireUser, requireRole, ok, fail } = require("./_auth");

module.exports = async (req, res) => {
  try{
    const me = await requireUser(req);
    requireRole("admin", me.role);

    const status = String(req.query.status || "pending");
    const snap = await adb.collection("topups").where("status","==",status).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    ok(res, { items });
  }catch(e){
    fail(res, e.status || 500, e.message);
  }
};
