const { Router } = require("express");

const router = Router();

const { setCurrentPool } = require("../controllers/region.js");

router.get("/:region_id", setCurrentPool);

module.exports = router;
