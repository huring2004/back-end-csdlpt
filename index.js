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
// đứng từ region_id hiển thị table của region_id_1
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
      const data = pool
        .request()
        .query(
          `select * from [link_${region_id_1}].[LogisticDB].[dbo].[${table}]`
        );
      console.log("data", data);
      data.then((res1) => {
        return res.json(res1);
      });
    } catch (err) {
      console.log(err);
    }
  }
);

//đúng ở region_id insert dữ liệu ở region_id_1 ở bảng table
app.post(
  "/:region_id/:region_id_1/insert_table/:table",
  setCurrentPool,
  async (req, res) => {
    const { region_id_1, table } = req.params;
    const data = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return res.status(400).json({ error: "Invalid table name" });
    }
    try {
      const pool = req.currentPool;
      // Lấy danh sách cột và tạo parameter placeholders
      const columns = Object.keys(data);
      const placeholders = columns.map((col) => `@${col}`);

      const query = `INSERT INTO [LINK_${region_id_1}].[LogisticDB].[dbo].[${table}] (${columns.join(
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

//đúng ở region_id sửa dữ liệu ở region_id_1 ở bảng table
app.post(
  "/:region_id/:region_id_1/update_table/:table",
  setCurrentPool,
  async (req, res) => {
    const { region_id_1, table } = req.params;
    const data = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return res.status(400).json({ error: "Invalid table name" });
    }
    const id_Column = `${idColumn[table]}`;

    try {
      const pool = req.currentPool;

      // Lấy danh sách cột cần cập nhật, loại bỏ cột khóa chính
      const columns = Object.keys(data).filter((col) => col !== id_Column);
      if (columns.length === 0) {
        return res
          .status(400)
          .json({ error: "Không có cột hợp lệ để cập nhật" });
      }

      // Tạo SET clause cho câu query
      const setClause = columns.map((col) => `[${col}] = @${col}`).join(", ");

      // Tạo câu query SQL
      const query = `
        UPDATE [LINK_${region_id_1}].[LogisticDB].[dbo].[${table}]
        SET ${setClause}
        WHERE [${id_Column}] = @${id_Column}
      `;

      const request = pool.request();

      // Gán dữ liệu vào parameters
      for (const col of Object.keys(data)) {
        request.input(col, data[col]);
      }

      const result = await request.query(query);
      return res.json({ message: "Updated successfully", result });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Update failed" });
    }
  }
);

//Câu truy vấn 0
app.get("/:region_id/query0", setCurrentPool, async (req, res) => {
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

//Câu truy vấn 1: Top 3 khách hàng có nhiều đơn hàng nhất mỗi vùng
// câu truy vấn 2: tổng số đơn hàng của mỗi vùng

app.get("/:region_id/query2", setCurrentPool, async (req, res) => {
  try {
    const pool = req.currentPool;

    const result = await pool.request().query(`
      SELECT 'EU' AS region, COUNT(*) AS num_orders FROM [LINK_EU].[LogisticDB].[dbo].[Orders]
      UNION ALL
      SELECT 'AS' AS region, COUNT(*) AS num_orders FROM [LINK_AS].[LogisticDB].[dbo].[Orders]
      UNION ALL
      SELECT 'AU' AS region, COUNT(*) AS num_orders FROM [LINK_AU].[LogisticDB].[dbo].[Orders]
      UNION ALL
      SELECT 'AF' AS region, COUNT(*) AS num_orders FROM [LINK_AF].[LogisticDB].[dbo].[Orders]
    `);

    res.json(result); // hoặc res.json(result.recordset);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//câu truy vấn 3: tổng giá trị hóa đơn (bao gồm cả thuế vat) của mỗi vùng
app.get("/:region_id/query3", setCurrentPool, async (req, res) => {
  try {
    const pool = req.currentPool;

    const result = await pool.request().query(`
      SELECT 'EU' AS region, sum(o.amount+ i.vat) AS num_orders
      FROM [LINK_EU].[LogisticDB].[dbo].[Invoice] i 
      JOIN [LINK_EU].[LogisticDB].[dbo].[Orders] o ON i.order_id = o.order_id
      UNION ALL
      SELECT 'AS' AS region, sum(o.amount+ i.vat) AS num_orders
      FROM [LINK_AS].[LogisticDB].[dbo].[Invoice] i 
      JOIN [LINK_AS].[LogisticDB].[dbo].[Orders] o ON i.order_id = o.order_id
      UNION ALL
      SELECT 'AU' AS region, sum(o.amount+ i.vat) AS num_orders
      FROM [LINK_AU].[LogisticDB].[dbo].[Invoice] i 
      JOIN [LINK_AU].[LogisticDB].[dbo].[Orders] o ON i.order_id = o.order_id
      UNION ALL
      SELECT 'AF' AS region, sum(o.amount+ i.vat) AS num_orders
      FROM [LINK_AF].[LogisticDB].[dbo].[Invoice] i 
      JOIN [LINK_AF].[LogisticDB].[dbo].[Orders] o ON i.order_id = o.order_id
    `);

    res.json(result.recordset); // trả về dữ liệu chính xác
  } catch (err) {
    console.error("Query3 error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//câu truy vấn 4: Trung bình thời gian xử lý hải quan mỗi vùng

app.get("/:region_id/query4", setCurrentPool, async (req, res) => {
  try {
    const pool = req.currentPool;

    const result = await pool.request().query(`
      
        SELECT 'EU' AS region, AVG(c.processing_time) AS avg_processing_time
        FROM [LINK_EU].[LogisticDB].[dbo].[Customs] c
      
      UNION ALL
      
        SELECT 'AS' AS region, AVG(c.processing_time) AS avg_processing_time
        FROM [LINK_AS].[LogisticDB].[dbo].[Customs] c
      
      UNION ALL
      
        SELECT 'AU' AS region, AVG(c.processing_time) AS avg_processing_time
        FROM [LINK_AU].[LogisticDB].[dbo].[Customs] c
      
      UNION ALL
      
        SELECT 'AF' AS region, AVG(c.processing_time) AS avg_processing_time
        FROM [LINK_AF].[LogisticDB].[dbo].[Customs] c
      
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Query4 error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/:region_id/query5", setCurrentPool, async (req, res) => {
  try {
    const pool = req.currentPool;

    const query = `
      SELECT 'EU' AS region, 
		ROUND( CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) 
		FROM [LINK_EU].[LogisticDB].[dbo].[Customer] c
		JOIN [LINK_EU].[LogisticDB].[dbo].[Country] co ON c.country_id = co.country_id
		), 2) AS Ti_Le
		FROM [LINK_EU].[LogisticDB].[dbo].[Orders]
    UNION ALL
    SELECT 'AS' AS region, 
        ROUND( CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) 
        FROM [LINK_AS].[LogisticDB].[dbo].[Customer] c
        JOIN [LINK_AS].[LogisticDB].[dbo].[Country] co ON c.country_id = co.country_id
        ), 2) AS Ti_Le
        FROM [LINK_AS].[LogisticDB].[dbo].[Orders]
    UNION ALL
    SELECT 'AU' AS region, 
        ROUND( CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) 
        FROM [LINK_AU].[LogisticDB].[dbo].[Customer] c
        JOIN [LINK_AU].[LogisticDB].[dbo].[Country] co ON c.country_id = co.country_id
        ), 2) AS Ti_Le
        FROM [LINK_AU].[LogisticDB].[dbo].[Orders]
    UNION ALL
    SELECT 'AF' AS region, ROUND( CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) 
    FROM [LINK_AF].[LogisticDB].[dbo].[Customer] c JOIN [LINK_AF].[LogisticDB].[dbo].[Country] co ON c.country_id = co.country_id), 2) AS Ti_Le
    FROM [LINK_AF].[LogisticDB].[dbo].[Orders]
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Query5 error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
  sql.on("error", (err) => {
    console.error("SQL error:", err);
  });
});
