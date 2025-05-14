const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const config = require("./config/config");
const idColumn = require("./config/idColumn");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  return res.json("hi i'm back-end");
});

//Lấy dữ liệu theo bảng
app.get("/:region/:table", async (req, res) => {
  const region = req.params.region;
  const table = req.params.table;
  try {
    const pool = await sql.connect(config[region]);
    const data = pool.request().query(`SELECT * FROM ${table}`);
    data.then((res1) => {
      return res.json(res1);
    });
  } catch (err) {
    console.log(err);
  }
});

// insert dữ liệu theo bảng
app.post("/:region/:table", async (req, res) => {
  const { region, table } = req.params;
  const data = req.body;
  if (!config[region]) {
    return res.status(400).json({ error: "Invalid region" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }
  try {
    const pool = await sql.connect(config[region]);

    // Lấy danh sách cột và tạo parameter placeholders
    const columns = Object.keys(data);
    const placeholders = columns.map((col) => `@${col}`);

    const query = `INSERT INTO ${table} (${columns.join(
      ", "
    )}) VALUES (${placeholders.join(", ")})`;
    const request = pool.request();

    // Gán dữ liệu vào parameters
    for (const col of columns) {
      request.input(col, data[col]);
    }
    const result = await request.query(query);
    return res.json({ message: "Inserted successfully", result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Insert failed" });
  }
});

// DELETE endpoint theo chuẩn RESTful
app.delete("/:region/:table/:id", async (req, res) => {
  const { region, table, id } = req.params;

  // Kiểm tra vùng hợp lệ
  if (!config[region]) {
    return res.status(400).json({ error: "Invalid region" });
  }

  // Kiểm tra tên bảng hợp lệ để tránh SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  // Kiểm tra id là số hoặc chuỗi không chứa ký tự nguy hiểm
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const pool = await sql.connect(config[region]);

    // Giả định cột khóa chính là `${table}_id`
    const id_Column = `${idColumn[table]}`;

    const result = await pool
      .request()
      .input("id", id) // không ép kiểu để phù hợp cả chuỗi và số
      .query(`DELETE FROM ${table} WHERE ${id_Column} = @id`);

    return res.json({
      message: "Delete successful",
      affectedRows: result.rowsAffected[0],
    });
  } catch (err) {
    console.error("Delete error:", err);
    return res
      .status(500)
      .json({ error: "Delete failed", detail: err.message });
  }
});

app.listen(8080, () => {});
