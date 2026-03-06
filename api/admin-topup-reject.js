const { adb } = require("./_firebaseAdmin");
const { requireUser, requireRole, ok, fail } = require("./_auth");

module.exports = async (req, res) => {
  try{
    if (req.method !== "POST") return fail(res, 405, "Method not allowed");
    const me = await requireUser(req);
    requireRole("admin", me.role);

    const { topupId, note } = req.body || {};
    if (!topupId) return fail(res,400,"topupId required");

    const topRef = adb.collection("topups").doc(topupId);
    const topSnap = await topRef.get();
    if (!topSnap.exists) return fail(res,404,"Topup not found");
    const top = topSnap.data();
    if (top.status !== "pending") return fail(res,400,"Sudah diproses");

    await topRef.set({ status:"rejected", handledAt: Date.now(), adminUid: me.uid, note: String(note||"") }, { merge:true });
    ok(res,{ msg:"Rejected. Saldo tidak masuk." });
  }catch(e){
    fail(res, e.status || 500, e.message);
  }
};
