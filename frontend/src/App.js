import React, { useState, useRef, useCallback } from 'react';
import AudioUploader from './components/AudioUploader';
import Visualizer from './components/Visualizer';
import TemplateSelector from './components/TemplateSelector';
import ResolutionSelector from './components/ResolutionSelector';
import Controls from './components/Controls';
import VideoExporter from './components/VideoExporter';
import VisualizerControls from './components/VisualizerControls';
import './styles/App.css';

// Define default parameters for each visualization type
const DEFAULT_PARAMETERS = {
  // 2D Visualizations
  waveform: {
    color: '#00aaff',
    lineWidth: 3,
    reactivity: 50,
    smoothing: 50
  },
  bars: {
    color: '#ff5500',
    barWidth: 50,
    spacing: 30,
    reactivity: 50
  },
  circles: {
    color: '#ff00ff',
    radius: 50,
    count: 50,
    reactivity: 50
  },
  kaleidoscope: {
    color: '#ffaa00',
    segments: 8,
    speed: 50,
    reactivity: 50
  },
  spiral: {
    color: '#00ff99',
    arms: 5,
    speed: 50,
    reactivity: 50
  },
  ripple: {
    color: '#00ffff',
    speed: 50,
    density: 50,
    reactivity: 50
  },
  terrain: {
    color: '#33cc33',
    detail: 50,
    speed: 50,
    reactivity: 50
  },
  starburst: {
    color: '#ff9900',
    count: 50,
    size: 50,
    reactivity: 50
  },
  fractal: {
    color: '#66ff66',
    complexity: 50,
    variation: 50,
    reactivity: 50
  },
  liquid: {
    color: '#0099ff',
    complexity: 50,
    speed: 50,
    reactivity: 50
  },
  mesh: {
    color: '#ff00cc',
    density: 50,
    perspective: 50,
    reactivity: 50
  },
  clock: {
    color: '#ffcc00',
    detail: 50,
    speed: 50,
    reactivity: 50
  },
  particles: {
    color: '#ffffff',
    count: 50,
    size: 50,
    speed: 50,
    reactivity: 50
  },
  nebula: {
    color: '#4b0082',
    complexity: 50,
    speed: 50,
    reactivity: 50
  },
  cityscape: {
    color: '#ff9900',
    density: 50,
    detail: 50,
    reactivity: 50
  },
  waterfall: {
    color: '#00ccff',
    speed: 50,
    detail: 50,
    reactivity: 50
  },
  constellation: {
    color: '#ffffff',
    density: 50,
    speed: 50,
    reactivity: 50
  },
  mandala: {
    color: '#ff00ff',
    complexity: 50,
    speed: 50,
    reactivity: 50
  },
  ocean: {
    color: '#0066cc',
    detail: 50,
    speed: 50,
    reactivity: 50
  },
  dna: {
    color: '#00ff99',
    detail: 50,
    speed: 50,
    reactivity: 50
  },
  forest: {
    color: '#33cc33',
    density: 50,
    detail: 50,
    reactivity: 50
  },
  snake: {
    color: '#ff0000',
    speed: 50,
    size: 50,
    reactivity: 50
  },
  
  // 3D Visualizations
  particles3d: {
    color: '#ffffff',
    count: 50,
    size: 50,
    speed: 50,
    reactivity: 50
  },
  waveform3d: {
    color: '#00aaff',
    lineWidth: 3,
    height: 50,
    speed: 50,
    reactivity: 50
  },
  spiral3d: {
    color: '#00ff99',
    arms: 5,
    radius: 50,
    speed: 50,
    reactivity: 50
  },
  kaleidoscope3d: {
    color: '#ffaa00',
    complexity: 50,
    speed: 50,
    reactivity: 50
  }
};

function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('kaleidoscope3d');
  const [selectedResolution, setSelectedResolution] = useState('1080p');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVisualizerControls, setShowVisualizerControls] = useState(true);
  const [visualizerParameters, setVisualizerParameters] = useState(DEFAULT_PARAMETERS.kaleidoscope3d);
  const visualizerRef = useRef(null);
  const audioRef = useRef(null);

  const handleAudioUpload = (file) => {
    setAudioFile(file);
    setIsPlaying(false);
  };

  const handleTemplateChange = (template) => {
    console.log("Template changed to:", template);
    setSelectedTemplate(template);
    
    // Get default parameters for the new template
    const defaultParams = DEFAULT_PARAMETERS[template] || {};
    
    // Preserve common parameters like color and reactivity when switching templates
    const commonParams = ['color', 'reactivity'];
    const newParams = { ...defaultParams };
    
    // Copy over common parameters from current settings if they exist
    commonParams.forEach(param => {
      if (visualizerParameters && visualizerParameters[param] !== undefined) {
        newParams[param] = visualizerParameters[param];
      }
    });
    
    setVisualizerParameters(newParams);
  };

  const handleResolutionChange = (resolution) => {
    setSelectedResolution(resolution);
    // Update visualizer resolution if ref is available
    if (visualizerRef.current && visualizerRef.current.changeResolution) {
      visualizerRef.current.changeResolution(resolution);
    }
  };

  const handleVisualizerParametersChange = (parameters) => {
    console.log("Updating visualizer parameters:", parameters);
    setVisualizerParameters(parameters);
  };

  const toggleVisualizerControls = () => {
    setShowVisualizerControls(!showVisualizerControls);
  };

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        alert('Failed to play audio. Please try again.');
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleAudioElementCreated = useCallback((audioElement) => {
    audioRef.current = audioElement;
    if (audioElement) {
      // Add event listeners for audio state changes
      audioElement.addEventListener('ended', () => setIsPlaying(false));
      audioElement.addEventListener('pause', () => setIsPlaying(false));
      audioElement.addEventListener('play', () => setIsPlaying(true));
    }
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Music Visualizer</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <TemplateSelector 
            selectedTemplate={selectedTemplate} 
            onTemplateChange={handleTemplateChange} 
          />
          <ResolutionSelector
            currentResolution={selectedResolution}
            onResolutionChange={handleResolutionChange}
          />
          <button 
            className="controls-toggle" 
            onClick={toggleVisualizerControls}
            title={showVisualizerControls ? "Hide Controls" : "Show Controls"}
          >
            <svg viewBox="0 0 24 24">
              {showVisualizerControls ? (
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              ) : (
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
              )}
            </svg>
          </button>
        </div>
      </header>
      <main>
        <div className="visualizer-section">
          <Visualizer
            ref={visualizerRef}
            audioFile={audioFile}
            template={selectedTemplate}
            isPlaying={isPlaying}
            onAudioElementCreated={handleAudioElementCreated}
            parameters={visualizerParameters}
          />
          {showVisualizerControls && (
            <VisualizerControls 
              template={selectedTemplate}
              onParametersChange={handleVisualizerParametersChange}
              initialParameters={visualizerParameters}
            />
          )}
        </div>
        <div className="controls-section">
          <div className="controls-container">
            <div className="action-buttons">
              <AudioUploader onUpload={handleAudioUpload} />
              <VideoExporter 
                visualizerRef={visualizerRef} 
                audioFile={audioFile} 
                isPlaying={isPlaying}
                audioRef={audioRef}
              />
            </div>
            <Controls 
              isPlaying={isPlaying} 
              onPlayPause={handlePlayPause} 
              audioElement={audioRef.current}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 