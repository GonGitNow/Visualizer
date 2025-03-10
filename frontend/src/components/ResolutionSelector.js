import React, { useState } from 'react';

const ResolutionSelector = ({ onResolutionChange, currentResolution }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const resolutions = [
    { id: '4K', name: '4K (3840×2160)', description: 'Ultra HD' },
    { id: '1080p', name: '1080p (1920×1080)', description: 'Full HD' },
    { id: '720p', name: '720p (1280×720)', description: 'HD' },
    { id: 'Square', name: 'Square (1080×1080)', description: 'Instagram' },
    { id: 'Vertical', name: 'Vertical (1080×1920)', description: 'Stories/TikTok' }
  ];
  
  const handleResolutionSelect = (resolutionId) => {
    onResolutionChange(resolutionId);
    setIsOpen(false);
  };
  
  // Find current resolution details
  const currentResDetails = resolutions.find(r => r.id === currentResolution) || resolutions[1]; // Default to 1080p
  
  return (
    <div className="resolution-selector">
      <button 
        className="resolution-dropdown"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="resolution-icon">📐</span>
        {currentResDetails.name}
      </button>
      
      {isOpen && (
        <div className="resolution-options">
          {resolutions.map(resolution => (
            <button
              key={resolution.id}
              className={`resolution-option ${currentResolution === resolution.id ? 'active' : ''}`}
              onClick={() => handleResolutionSelect(resolution.id)}
            >
              <div className="resolution-option-name">{resolution.name}</div>
              <div className="resolution-option-desc">{resolution.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResolutionSelector; 