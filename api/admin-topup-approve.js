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

    const userRef = adb.collection("users").doc(top.uid);

    await adb.runTransaction(async(tx)=>{
      const uSnap = await tx.get(userRef);
      const saldo = uSnap.exists ? Number(uSnap.data().saldo||0) : 0;
      const amt = Number(top.requestedAmount||0);
      tx.set(userRef, { saldo: saldo + amt }, { merge:true });
      tx.set(topRef, { status:"approved", handledAt: Date.now(), adminUid: me.uid, note: String(note||"") }, { merge:true });
      tx.set(adb.collection("transactions").doc(), { uid: top.uid, type:"deposit", amount: amt, ref:`approve-${topupId}`, createdAt: Date.now() });
    });

    ok(res,{ msg:"Approved. Saldo masuk." });
  }catch(e){
    fail(res, e.status || 500, e.message);
  }
};
