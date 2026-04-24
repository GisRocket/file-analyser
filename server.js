import express from "express";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import XLSX from "xlsx";

const app = express();

// 🔥 важно за Render + големи файлове
app.use(express.json({ limit: "50mb" }));

// health check (Render го ползва понякога)
app.get("/", (req, res) => {
  res.send("Botpress File Parser is running");
});

// 📦 основен endpoint
app.post("/parse", async (req, res) => {
  try {
    const { base64, mime } = req.body;

    if (!base64) {
      return res.status(400).json({ error: "No file provided" });
    }

    const buffer = Buffer.from(base64, "base64");

    let fileData = {};

    // 📄 PDF
    if (mime?.includes("pdf")) {
      const data = await pdf(buffer);
      fileData = {
        type: "pdf",
        text: data.text
      };
    }

    // 📄 DOCX
    else if (mime?.includes("word") || mime?.includes("docx")) {
      const result = await mammoth.extractRawText({ buffer });
      fileData = {
        type: "docx",
        text: result.value
      };
    }

    // 📊 XLSX
    else if (
      mime?.includes("excel") ||
      mime?.includes("spreadsheet") ||
      mime?.includes("xlsx")
    ) {
      const workbook = XLSX.read(buffer);
      const sheets = {};

      workbook.SheetNames.forEach(name => {
        sheets[name] = XLSX.utils.sheet_to_json(
          workbook.Sheets[name],
          { header: 1 }
        );
      });

      fileData = {
        type: "xlsx",
        sheets
      };
    }

    // fallback
    else {
      fileData = {
        type: "unknown",
        size: buffer.length
      };
    }

    return res.json(fileData);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
});

// 🔥 Render dynamic port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});