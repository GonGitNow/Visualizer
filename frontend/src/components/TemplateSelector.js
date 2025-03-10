import React, { useState, useEffect, useRef } from 'react';
import './TemplateSelector.css';

const templates = [
  // 2D Visualizations
  { id: 'waveform', name: 'Waveform', description: 'Classic waveform visualization', icon: '♒' },
  { id: 'bars', name: 'Frequency Bars', description: 'Vertical frequency bars', icon: '▮' },
  { id: 'circles', name: 'Circular', description: 'Circular frequency visualization', icon: '◯' },
  { id: 'kaleidoscope', name: 'Kaleidoscope', description: 'Symmetrical psychedelic patterns', icon: '✺' },
  { id: 'spiral', name: 'Spiral', description: 'Dynamic spiral visualization', icon: '↻' },
  { id: 'ripple', name: 'Ripple', description: 'Concentric circles that respond to beats', icon: '◎' },
  { id: 'terrain', name: 'Terrain', description: 'Dynamic landscape that changes with music', icon: '⛰️' },
  { id: 'starburst', name: 'Starburst', description: 'Particles exploding on strong beats', icon: '✨' },
  { id: 'fractal', name: 'Fractal Tree', description: 'Tree that grows with the music', icon: '🌳' },
  { id: 'liquid', name: 'Liquid Wave', description: 'Fluid simulation responding to audio', icon: '🌊' },
  { id: 'mesh', name: 'Audio Mesh', description: '3D-like mesh deforming with audio', icon: '🕸️' },
  { id: 'clock', name: 'Spectrum Clock', description: 'Clock with frequency band hands', icon: '🕒' },
  { id: 'particles', name: 'Particles', description: 'Interactive particle system', icon: '✧' },
  { id: 'nebula', name: 'Audio Nebula', description: 'Cosmic cloud that reacts to music', icon: '🌌' },
  { id: 'cityscape', name: 'Sound Cityscape', description: 'City skyline that reacts to audio', icon: '🏙️' },
  { id: 'waterfall', name: 'Frequency Waterfall', description: 'Cascading waterfall of frequencies', icon: '⛲' },
  { id: 'constellation', name: 'Audio Constellation', description: 'Star patterns that connect with rhythm', icon: '✦' },
  { id: 'mandala', name: 'Reactive Mandala', description: 'Symmetrical patterns that evolve with music', icon: '❄️' },
  { id: 'ocean', name: 'Sound Waves Ocean', description: 'Ocean waves influenced by audio', icon: '🌊' },
  { id: 'dna', name: 'Audio DNA', description: 'Double helix that morphs with music', icon: '🧬' },
  { id: 'forest', name: 'Frequency Forest', description: 'Forest that grows and sways with music', icon: '🌲' },
  { id: 'snake', name: 'Rainbow Snake', description: 'Classic snake game with audio-reactive rainbow colors', icon: '🐍' },
  
  // 3D Visualizations
  { id: 'particles3d', name: '3D Particles', description: 'Immersive 3D particle system', icon: '✦' },
  { id: 'waveform3d', name: '3D Waveform', description: '3D audio waveform visualization', icon: '⌇' },
  { id: 'spiral3d', name: '3D Spiral', description: 'Dynamic 3D spiral visualization', icon: '⌀' },
  { id: 'kaleidoscope3d', name: '3D Kaleidoscope', description: '3D geometric patterns', icon: '❖' }
];

const TemplateSelector = ({ selectedTemplate, onTemplateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Get the name of the currently selected template
  const selectedTemplateName = templates.find(t => t.id === selectedTemplate)?.name || 'Select Visualizer';
  const selectedTemplateIcon = templates.find(t => t.id === selectedTemplate)?.icon || '✦';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTemplateSelect = (templateId) => {
    onTemplateChange(templateId);
    setIsOpen(false);
  };

  // Group templates by dimension (2D/3D)
  const groupedTemplates = {
    '2D': templates.filter(t => !t.id.includes('3d')),
    '3D': templates.filter(t => t.id.includes('3d'))
  };

  return (
    <div className="template-selector" ref={dropdownRef}>
      <div 
        className={`template-dropdown ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selected-icon">{selectedTemplateIcon}</span>
        {selectedTemplateName}
      </div>
      
      <div className={`template-options ${isOpen ? 'show' : ''}`}>
        {/* 2D Visualizations */}
        <div className="template-group">
          <div className="template-group-header">2D Visualizations</div>
          {groupedTemplates['2D'].map((template) => (
            <button
              key={template.id}
              className={`template-button ${selectedTemplate === template.id ? 'active' : ''}`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <span className="icon">{template.icon}</span>
              {template.name}
            </button>
          ))}
        </div>
        
        {/* 3D Visualizations */}
        <div className="template-group">
          <div className="template-group-header">3D Visualizations</div>
          {groupedTemplates['3D'].map((template) => (
            <button
              key={template.id}
              className={`template-button ${selectedTemplate === template.id ? 'active' : ''}`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <span className="icon">{template.icon}</span>
              {template.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector; 