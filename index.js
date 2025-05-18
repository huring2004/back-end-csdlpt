const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const config = require("./config/config");
const idColumn = require("./config/idColumn");

const { setCurrentPool } = require("./controllers/region.js");

const app = express();
app.use(cors());
app.use(express.json());

//Lấy dữ liệu theo bảng
app.get("/:region_id/get_tables/:table", setCurrentPool, async (req, res) => {
  const table = req.params.table;
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }
  try {
    const pool = req.currentPool;

    const data = pool.request().query(`SELECT * FROM ${table}`);
    console.log("data", data);
    data.then((res1) => {
      return res.json(res1);
    });
  } catch (err) {
    console.log(err);
  }
});

// insert dữ liệu theo bảng
app.post(
  "/:region_id/insert_table/:table",
  setCurrentPool,
  async (req, res) => {
    const { table } = req.params;
    const data = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return res.status(400).json({ error: "Invalid table name" });
    }
    try {
      const pool = req.currentPool;

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
  }
);

// DELETE endpoint theo chuẩn RESTful
app.delete(
  "/:region_id/delete_table/:table/:id",
  setCurrentPool,
  async (req, res) => {
    const { table, id } = req.params;

    // Kiểm tra tên bảng hợp lệ để tránh SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return res.status(400).json({ error: "Invalid table name" });
    }

    // Kiểm tra id là số hoặc chuỗi không chứa ký tự nguy hiểm
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    try {
      const pool = req.currentPool;

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
        .json({ error: "Delete fail ed", detail: err.message });
    }
  }
);

app.get(
  "/:region_id/:region_id_1/get_tables/:table",
  setCurrentPool,
  async (req, res) => {
    const { region_id_1, table } = req.params;
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return res.status(400).json({ error: "Invalid table name" });
    }
    try {
      const pool = req.currentPool;
      const data = pool.request().query(`select *
                                        from [link_${region_id_1}].[LogisticDB].[dbo].[${table}]`);
      console.log("data", data);
      data.then((res1) => {
        return res.json(res1);
      });
    } catch (err) {
      console.log(err);
    }
  }
);
//Câu truy vấn 1

app.get("/:region_id/query1", setCurrentPool, async (req, res) => {
  try {
    const pool = req.currentPool;
    const data = pool
      .request()
      .query(
        `SELECT *  FROM [link_global].[LogisticDB].[dbo].[Orders] AS TMP WHERE TMP.[status] = 'Processing' AND TMP.[created_at] >= '2025-05-01'`
      );

    console.log("data", data);
    data.then((res1) => {
      return res.json(res1);
    });
  } catch (err) {
    console.log(err);
  }
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
  sql.on("error", (err) => {
    console.error("SQL error:", err);
  });
});
