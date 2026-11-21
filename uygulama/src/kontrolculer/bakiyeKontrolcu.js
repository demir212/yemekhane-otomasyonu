// Controller · bakiye
const bakiyeServisi = require('../servisler/bakiyeServisi');

async function ozet(req, res) {
  res.json(await bakiyeServisi.ozet(req.oturum));
}

async function yukle(req, res) {
  res.json(await bakiyeServisi.yukle(req.oturum, req.body));
}

module.exports = { ozet, yukle };
