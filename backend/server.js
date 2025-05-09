const express = require("express");
const multer = require("multer");
const fs = require("fs");
const pdf = require("pdf-parse");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const upload = multer({ dest: "uploads/" });

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function run(filePath, filename, mimeType) {
  const extractTextFromPDF = async (filePath) => {
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdf(pdfBuffer);
    return data.text;
  };

  const pdfText = await extractTextFromPDF(filePath);

  try {
    const prompt = `summarize this pdf: `;
    const result = await model.generateContent([prompt, pdfText], generationConfig);
    return result.response.text();
  } catch (error) {
    console.error("Error in model.generateContent:", error);
  }
}

app.post("/gemini", upload.single("pdf"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    if (file.mimetype !== "application/pdf") {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: "Only PDF files are allowed." });
    }

    try {
      const geminiFile = await run(file.path, file.originalname, file.mimetype);
      res.status(200).json({
        message: "File uploaded successfully.",
        geminiFile,
      });
    } catch (error) {
      console.error("Error in model.generateContent:", error);
      res.status(500).json({ message: "Error in model.generateContent" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error with post" });
  }
});

app.use((req, res) => {
  return res.status(404).send({ message: "The url you visited does not exist" });
});

// ✅ ESTO FALTABA
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
