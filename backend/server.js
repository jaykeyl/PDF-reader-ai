const express = require("express");
const AWS = require("aws-sdk");
const pdf = require("pdf-parse");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(cors());

// AWS S3 config con IAM
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,  
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  
  region: process.env.AWS_REGION,  
});

// Crear una instancia de S3
const s3 = new AWS.S3();

// gemini config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const generationConfig = {
  temperature: 0.8,
  topP: 0.9,
  maxOutputTokens: 2048,
};

const storage = multer.memoryStorage();  
const upload = multer({ storage: storage });

// subir el PDF a S3
async function uploadPdfToS3(pdfBuffer, fileName) {
  const params = {
    Bucket: process.env.S3_BUCKET, 
    Key: fileName,  
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  };

  try {
    const data = await s3.upload(params).promise();
    console.log("Archivo subido a S3:", data);
    return data.Key; 
  } catch (err) {
    console.error("Error al subir el archivo a S3:", err);
    throw err;
  }
}

// extraer texto del PDF
async function extractPdfFromS3(bucket, key) {
  const s3Object = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  const pdfBuffer = s3Object.Body;
  const data = await pdf(pdfBuffer);
  return data.text;
}

// procesar el archivo PDF
app.post("/process-pdf", upload.single("pdf"), async (req, res) => {
  const { userPrompt } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Por favor selecciona un archivo PDF." });
  }

  if (!userPrompt) {
    return res.status(400).json({ message: "Falta el prompt personalizado." });
  }

  try {
    // Subir el archivo PDF a S3
    const pdfKey = await uploadPdfToS3(req.file.buffer, req.file.originalname);

    // Extraer el texto del PDF desde S3
    const text = await extractPdfFromS3(process.env.S3_BUCKET, pdfKey);
    console.log("Texto extraído del PDF:", text.substring(0, 100));  // Para debug

    const prompt = `${userPrompt}\n\nContenido del PDF:\n${text}`;

    // Llamar al modelo de Gemini para analizar el PDF
    const result = await model.generateContent([prompt], generationConfig);
    const output = result.response.text();

    res.status(200).json({ analysis: output });
  } catch (error) {
    console.error("Error al procesar el PDF:", error);
    res.status(500).json({ message: "Error procesando el PDF." });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
