import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [originalKey, setOriginalKey] = useState('C');
  const [targetKey, setTargetKey] = useState('G');
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [verifiedKey, setVerifiedKey] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const normalizeKey = (key) => {
    const map = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    return map[key] || key;
  };

  const detectKey = async (selectedFile) => {
    setIsDetecting(true);
    setDetectedInfo(null);
    setVerifiedKey(null);
    const formData = new FormData();
    formData.append('song', selectedFile);

    try {
      const response = await axios.post('http://localhost:3001/api/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { key, scale } = response.data;
      const normalizedKey = normalizeKey(key);
      
      if (keys.includes(normalizedKey)) {
        setOriginalKey(normalizedKey);
        setDetectedInfo(`${key} ${scale}`);
      } else {
        setDetectedInfo(`Detected: ${key} ${scale}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setDownloadUrl(null);
      setVerifiedKey(null);
      detectKey(selectedFile);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setVerifiedKey(null);

    const formData = new FormData();
    formData.append('song', file);
    formData.append('originalKey', originalKey);
    formData.append('targetKey', targetKey);

    try {
      const response = await axios.post('http://localhost:3001/api/convert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setDownloadUrl(response.data.downloadUrl);
      } else {
        setError('Conversion failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKey = async () => {
    if (!downloadUrl) return;
    
    setIsVerifying(true);
    setVerifiedKey(null);
    
    const filename = downloadUrl.split('/').pop();
    
    try {
        const response = await axios.get(`http://localhost:3001/api/detect-processed/${filename}`);
        const { key, scale } = response.data;
        setVerifiedKey(`${key} ${scale}`);
    } catch (err) {
        setVerifiedKey('Verification failed');
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg p-4">
        <h1 className="text-center mb-4 text-primary">Song Key Changer</h1>
        
        <div className="mb-3">
          <label htmlFor="fileInput" className="form-label">Upload Song</label>
          <input 
            type="file" 
            className="form-control" 
            id="fileInput" 
            accept="audio/*"
            onChange={handleFileChange} 
          />
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">
              Original Key 
              {isDetecting && <span className="ms-2 badge bg-info">Detecting...</span>}
              {detectedInfo && !isDetecting && <span className="ms-2 badge bg-success">{detectedInfo}</span>}
            </label>
            <select 
              className="form-select" 
              value={originalKey} 
              onChange={(e) => setOriginalKey(e.target.value)}
            >
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Target Key</label>
            <select 
              className="form-select" 
              value={targetKey} 
              onChange={(e) => setTargetKey(e.target.value)}
            >
              {keys.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <div className="d-grid gap-2">
            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleConvert} 
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : 'Convert Key'}
            </button>
        </div>

        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        )}

        {downloadUrl && (
          <div className="mt-4 p-3 bg-light rounded text-center">
            <h4 className="text-success">Success!</h4>
            <p>Your song has been converted.</p>
            <audio controls src={downloadUrl} className="w-100 mb-3"></audio>
            
            <div className="d-flex justify-content-center gap-2">
                <a href={downloadUrl} className="btn btn-success" download>Download Song</a>
                <button 
                    className="btn btn-outline-primary" 
                    onClick={handleVerifyKey}
                    disabled={isVerifying}
                >
                    {isVerifying ? 'Verifying...' : 'Verify New Key'}
                </button>
            </div>
            
            {verifiedKey && (
                <div className="mt-2">
                    <span className="badge bg-primary fs-6">Verified: {verifiedKey}</span>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
