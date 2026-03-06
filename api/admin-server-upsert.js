const { adb } = require("./_firebaseAdmin");
const { requireUser, requireRole, ok, fail } = require("./_auth");

module.exports = async (req, res) => {
  try{
    if (req.method !== "POST") return fail(res,405,"Method not allowed");
    const me = await requireUser(req);
    requireRole("admin", me.role);

    const { serverId, name, domain, auth, harga, hargaRenew, resellerOnly } = req.body || {};
    if (!name || !domain || !auth) return fail(res,400,"name/domain/auth wajib");

    const data = {
      name: String(name),
      domain: String(domain),
      auth: String(auth),
      harga: Number(harga || 0),
      hargaRenew: Number(hargaRenew || 0),
      resellerOnly: !!resellerOnly,
      updatedAt: Date.now()
    };

    if (serverId) {
      await adb.collection("servers").doc(serverId).set(data, { merge:true });
      return ok(res,{ msg:"Server updated" });
    }
    await adb.collection("servers").doc().set({ ...data, createdAt: Date.now() });
    ok(res,{ msg:"Server created" });
  }catch(e){
    fail(res, e.status || 500, e.message);
  }
};
