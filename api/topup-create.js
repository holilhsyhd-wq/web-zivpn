const { adb } = require("./_firebaseAdmin");
const { requireUser, ok, fail } = require("./_auth");

module.exports = async (req, res) => {
  try{
    if (req.method !== "POST") return fail(res, 405, "Method not allowed");
    const me = await requireUser(req);

    const { amount, ewalletName, ewalletNumber, proofUrl } = req.body || {};
    const a = Number(amount || 0);
    if (!ewalletName || !ewalletNumber) return fail(res,400,"Ewallet wajib diisi");
    if (!proofUrl || !/^https?:\/\//i.test(proofUrl)) return fail(res,400,"Link bukti wajib");
    if (a < 1) return fail(res,400,"Nominal tidak valid");

    const ref = adb.collection("topups").doc();
    await ref.set({
      uid: me.uid,
      requestedAmount: a,
      ewalletName: String(ewalletName),
      ewalletNumber: String(ewalletNumber),
      proofUrl: String(proofUrl),
      status: "pending",
      createdAt: Date.now()
    });

    ok(res, { msg: "Topup berhasil dibuat (pending). Tunggu admin.", topupId: ref.id });
  }catch(e){
    fail(res, e.status || 500, e.message);
  }
};
