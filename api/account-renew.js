const axios = require("axios");
const { adb } = require("./_firebaseAdmin");
const { requireUser, ok, fail } = require("./_auth");

function normalizeDomain(d){ return String(d||"").trim().replace(/^https?:\/\//i,"").replace(/\/+$/g,""); }
function splitHostPort(domain){
  let host = normalizeDomain(domain);
  let port = Number(process.env.ZIVPN_PORT || 5888);
  if (host.includes(":")) {
    const idx = host.lastIndexOf(":");
    const p = host.slice(idx+1), h = host.slice(0, idx);
    if (/^\d+$/.test(p)) { host = h; port = parseInt(p,10); }
  }
  return { host, port };
}

async function zivpnRenew(domain, auth, password, days){
  const { host, port } = splitHostPort(domain);
  const url = `http://${host}:${port}${process.env.ZIVPN_RENEW_PATH || "/renew/zivpn"}`;
  const res = await axios.get(url, { params:{ password, exp:String(days), auth }, timeout:15000, validateStatus:()=>true });
  if (res.status === 403) throw new Error("403 panel menolak (auth salah / IP whitelist)");
  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (!data || String(data.status).toLowerCase() !== "success") throw new Error(data?.message || "Renew gagal");
  return data.message || "Success";
}

module.exports = async (req, res) => {
  try{
    if (req.method !== "POST") return fail(res, 405, "Method not allowed");
    const me = await requireUser(req);
    const { serverId, password, days } = req.body || {};
    const d = Number(days||0);
    if (!serverId || !password || d<1 || d>365) return fail(res,400,"Input tidak valid");

    const srvSnap = await adb.collection("servers").doc(serverId).get();
    if (!srvSnap.exists) return fail(res,404,"Server not found");
    const srv = srvSnap.data();

    const hargaRenew = Number((srv.hargaRenew ?? srv.harga) || 0);
    const total = hargaRenew * d;
    if (me.saldo < total) return fail(res,400,"Saldo tidak cukup");

    const msg = await zivpnRenew(srv.domain, srv.auth, password, d);

    const userRef = adb.collection("users").doc(me.uid);
    await adb.runTransaction(async (tx)=>{
      const u = await tx.get(userRef);
      const saldo = u.exists ? Number(u.data().saldo||0) : 0;
      if (saldo < total) throw new Error("Saldo berubah, coba lagi");
      tx.set(userRef, { saldo: saldo - total }, { merge:true });
      tx.set(adb.collection("transactions").doc(), {
        uid: me.uid, type:"renew", amount: total, ref:`renew-${Date.now()}`, createdAt: Date.now()
      });
    });

    ok(res,{ msg });
  }catch(e){
    fail(res,400,e.message);
  }
};
