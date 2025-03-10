import React, { useRef, useState } from 'react';
import './AudioUploader.css';

const AudioUploader = ({ onUpload }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset error state
    setError(null);
    setIsUploading(true);

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid audio file (MP3, WAV, or OGG)');
      setIsUploading(false);
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('http://localhost:5001/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUpload(data);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="audio-uploader">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/mpeg,audio/wav,audio/ogg"
        style={{ display: 'none' }}
        disabled={isUploading}
      />
      <button
        className={`upload-button ${isUploading ? 'uploading' : ''}`}
        onClick={() => fileInputRef.current.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload Audio File'}
      </button>
      <p className="file-types">Supported formats: MP3, WAV, OGG (max 50MB)</p>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default AudioUploader; 