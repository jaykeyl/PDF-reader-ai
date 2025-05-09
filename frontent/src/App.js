import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch('http://localhost:3000/gemini', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    setResult(data.geminiFile);
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Procesar PDF</button>
      </form>
      <div className="result">
        <h3>Resultado:</h3>
        <p>{result}</p>
      </div>
    </div>
  );
}

export default App;