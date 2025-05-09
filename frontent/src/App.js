import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('Resume este PDF en puntos clave:');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult('');
    setFileName('');

    try {
      if (!file) throw new Error('Por favor selecciona un archivo PDF.');

      // Subir el archivo PDF al backend
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('userPrompt', prompt);

      const processRes = await fetch('http://localhost:3000/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!processRes.ok) throw new Error('Error al procesar el PDF.');

      const { analysis, fileName: uploadedFileName } = await processRes.json();
      setResult(analysis);
      setFileName(uploadedFileName);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Analizador de PDF con Gemini AI</h1>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="pdf-upload">Selecciona un archivo PDF:</label>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="file-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="prompt">Prompt personalizado:</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows="4"
            placeholder="Ej: Resume este PDF en 5 puntos clave..."
            className="prompt-input"
          />
        </div>

        <button type="submit" disabled={isLoading} className="submit-button">
          {isLoading ? 'Procesando...' : 'Analizar PDF'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="result-container">
          <h2>Resultado del análisis:</h2>
          <div className="result-content">
            {result.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {fileName && (
        <div className="file-info">
          <p>Archivo almacenado en S3 como: <strong>{fileName}</strong></p>
        </div>
      )}
    </div>
  );
}

export default App;
