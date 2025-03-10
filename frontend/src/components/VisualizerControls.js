import React, { useState, useEffect } from 'react';
import './VisualizerControls.css';

const VisualizerControls = ({ template, onParametersChange, initialParameters }) => {
  // Define default parameters for each visualization type
  const defaultParameters = {
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

  // Initialize parameters state based on initialParameters or template defaults
  const [parameters, setParameters] = useState(() => {
    return initialParameters && Object.keys(initialParameters).length > 0
      ? initialParameters
      : defaultParameters[template] || defaultParameters.waveform;
  });

  // Update parameters when template changes, but preserve user settings if available
  useEffect(() => {
    console.log("Template changed to:", template);
    // Only reset to defaults if no initialParameters are provided
    if (!initialParameters || Object.keys(initialParameters).length === 0) {
      const newParams = defaultParameters[template] || defaultParameters.waveform;
      setParameters(prevParams => ({
        ...defaultParameters[template] || defaultParameters.waveform,
        color: prevParams.color, // Preserve color
        reactivity: prevParams.reactivity // Preserve reactivity
      }));
      onParametersChange(newParams);
    }
  }, [template, onParametersChange, initialParameters]);

  // Update local state when initialParameters change from parent
  useEffect(() => {
    if (initialParameters && Object.keys(initialParameters).length > 0) {
      console.log("Received updated parameters from parent:", initialParameters);
      setParameters(initialParameters);
    }
  }, [initialParameters]);

  // Handle parameter change
  const handleParameterChange = (param, value) => {
    console.log(`Changing parameter ${param} to ${value}`);
    const newParameters = { ...parameters, [param]: value };
    setParameters(newParameters);
    onParametersChange(newParameters);
  };

  // Get controls based on template
  const getControls = () => {
    // Common controls for all visualizations
    const commonControls = (
      <>
        <div className="parameter-group">
          <label>Reactivity</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={parameters.reactivity}
              onChange={(e) => handleParameterChange('reactivity', parseInt(e.target.value))}
            />
            <span className="slider-value">{parameters.reactivity}%</span>
          </div>
        </div>
        
        <div className="parameter-group">
          <label>Color</label>
          <input
            type="color"
            value={parameters.color}
            onChange={(e) => handleParameterChange('color', e.target.value)}
            className="color-picker"
          />
        </div>
      </>
    );

    // Template-specific controls
    switch (template) {
      case 'waveform':
      case 'waveform3d':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Line Width</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={parameters.lineWidth}
                  onChange={(e) => handleParameterChange('lineWidth', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.lineWidth}px</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Smoothing</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.smoothing}
                  onChange={(e) => handleParameterChange('smoothing', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.smoothing}%</span>
              </div>
            </div>
          </>
        );
        
      case 'bars':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Bar Width</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.barWidth}
                  onChange={(e) => handleParameterChange('barWidth', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.barWidth}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Spacing</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.spacing}
                  onChange={(e) => handleParameterChange('spacing', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.spacing}%</span>
              </div>
            </div>
          </>
        );
        
      case 'circles':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Radius</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.radius}
                  onChange={(e) => handleParameterChange('radius', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.radius}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Count</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={parameters.count}
                  onChange={(e) => handleParameterChange('count', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.count}</span>
              </div>
            </div>
          </>
        );
        
      case 'kaleidoscope':
      case 'kaleidoscope3d':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>{template === 'kaleidoscope' ? 'Segments' : 'Complexity'}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min={template === 'kaleidoscope' ? '3' : '1'}
                  max={template === 'kaleidoscope' ? '16' : '100'}
                  value={template === 'kaleidoscope' ? parameters.segments : parameters.complexity}
                  onChange={(e) => 
                    handleParameterChange(
                      template === 'kaleidoscope' ? 'segments' : 'complexity', 
                      parseInt(e.target.value)
                    )
                  }
                />
                <span className="slider-value">
                  {template === 'kaleidoscope' ? parameters.segments : parameters.complexity}
                  {template === 'kaleidoscope' ? '' : '%'}
                </span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
          </>
        );
        
      case 'spiral':
      case 'spiral3d':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Arms</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={parameters.arms}
                  onChange={(e) => handleParameterChange('arms', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.arms}</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
            {template === 'spiral3d' && (
              <div className="parameter-group">
                <label>Radius</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={parameters.radius}
                    onChange={(e) => handleParameterChange('radius', parseInt(e.target.value))}
                  />
                  <span className="slider-value">{parameters.radius}%</span>
                </div>
              </div>
            )}
          </>
        );
        
      case 'ripple':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Density</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.density}
                  onChange={(e) => handleParameterChange('density', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.density}%</span>
              </div>
            </div>
          </>
        );
        
      case 'terrain':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Detail</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.detail}
                  onChange={(e) => handleParameterChange('detail', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.detail}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
          </>
        );
        
      case 'starburst':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Count</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.count}
                  onChange={(e) => handleParameterChange('count', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.count}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Size</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.size}
                  onChange={(e) => handleParameterChange('size', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.size}%</span>
              </div>
            </div>
          </>
        );
        
      case 'fractal':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Complexity</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.complexity}
                  onChange={(e) => handleParameterChange('complexity', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.complexity}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Variation</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.variation}
                  onChange={(e) => handleParameterChange('variation', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.variation}%</span>
              </div>
            </div>
          </>
        );
        
      case 'liquid':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Complexity</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.complexity}
                  onChange={(e) => handleParameterChange('complexity', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.complexity}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
          </>
        );
        
      case 'mesh':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Density</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.density}
                  onChange={(e) => handleParameterChange('density', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.density}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Perspective</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.perspective}
                  onChange={(e) => handleParameterChange('perspective', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.perspective}%</span>
              </div>
            </div>
          </>
        );
        
      case 'clock':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Detail</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.detail}
                  onChange={(e) => handleParameterChange('detail', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.detail}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
          </>
        );
        
      case 'particles':
      case 'particles3d':
        return (
          <>
            {commonControls}
            <div className="parameter-group">
              <label>Count</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.count}
                  onChange={(e) => handleParameterChange('count', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.count}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Size</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={parameters.size}
                  onChange={(e) => handleParameterChange('size', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.size}%</span>
              </div>
            </div>
            <div className="parameter-group">
              <label>Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                />
                <span className="slider-value">{parameters.speed}%</span>
              </div>
            </div>
          </>
        );
        
      default:
        return commonControls;
    }
  };

  return (
    <div className="visualizer-controls">
      <h3>Customize Visualization</h3>
      <div className="parameters-container">
        {getControls()}
      </div>
      <div className="controls-buttons">
        <button 
          className="reset-button"
          onClick={() => {
            setParameters(defaultParameters[template] || defaultParameters.waveform);
            onParametersChange(defaultParameters[template] || defaultParameters.waveform);
          }}
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};

export default VisualizerControls; 