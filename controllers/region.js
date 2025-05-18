const config = require("../config/config.js");

const sql = require("mssql");

const pools = {}; // cache cho mỗi region

async function setCurrentPool(req, res, next) {
    const region = req.params.region_id;

    if (!config[region]) {
        return res
            .status(400)
            .json({ error: `Region "${region}" is not configured.` });
    }

    if (pools[region]) {
        req.currentPool = pools[region];
        console.log(`Using cached pool for region ${region}`);
        return next();
    }
    // Nếu chưa có pool thì tạo mới
    try {
        const pool = await new sql.ConnectionPool(config[region]).connect();
        pools[region] = pool;
        req.currentPool = pool;
        console.log(`Connected to DB in region ${region}`);
        return next();
    } catch (err) {
        console.error(`Failed to connect to DB in region ${region}:`, err);
        return res.status(500).json({ error: "Failed to connect to DB" });
    }
}

module.exports = { setCurrentPool };
