const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());

const config = {
  user: "sa",
  password: "123456",
  server: "26.254.73.141",
  database: "LogisticDB",
  options: {
    trustServerCertificate: true, // bypass SSL warning
  },
  port: 1433,
};

app.get("/", (req, res) => {
  return res.json("hi i'm back-end");
});

app.get("/Country", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const data = pool.request().query("SELECT * FROM COUNTRY");
    data.then((res1) => {
      return res.json(res1);
    });
  } catch (err) {
    console.log(err);
  }
});

app.listen(8080, () => {});
