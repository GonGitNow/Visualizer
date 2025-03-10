import React, { useEffect, useRef, forwardRef, useState, useImperativeHandle } from 'react';
import ThreeVisualizer from './ThreeVisualizer';
import './Visualizer.css';

const RESOLUTIONS = {
  '4K': { width: 3840, height: 2160, className: 'aspect-ratio-4k' },
  '1080p': { width: 1920, height: 1080, className: 'aspect-ratio-1080p' },
  '720p': { width: 1280, height: 720, className: 'aspect-ratio-720p' },
  'Square': { width: 720, height: 720, className: 'aspect-ratio-square' },
  'Vertical': { width: 1080, height: 1920, className: 'aspect-ratio-vertical' }
};

const Visualizer = forwardRef(({ audioFile, template, isPlaying, onAudioElementCreated, parameters: initialParameters = {} }, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceRef = useRef(null);
  const audioElementRef = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const [resolution, setResolution] = useState('1080p');
  const [audioData, setAudioData] = useState(null);
  const [use3D, setUse3D] = useState(false);
  const [parameters, setParameters] = useState(initialParameters);
  const [isExporting, setIsExporting] = useState(false); // Add export mode flag

  // Check if template is a 3D visualization
  useEffect(() => {
    // Define which templates should use 3D rendering
    const threeDTemplates = ['particles3d', 'waveform3d', 'spiral3d', 'kaleidoscope3d'];
    setUse3D(threeDTemplates.includes(template));
  }, [template]);

  // Audio initialization effect
  useEffect(() => {
    if (!audioFile) return;

    let isInitialized = false;

    const initAudio = async () => {
      try {
        // Initialize audio context only on first load or if it doesn't exist
        if (!audioContextRef.current) {
          // Create context on user interaction
          const context = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = context;
          
          // Create analyzer with improved settings for better reactivity
          const analyser = context.createAnalyser();
          analyser.fftSize = 2048; // Increased for more detailed frequency data
          analyser.smoothingTimeConstant = 0.8; // Higher smoothing for more consistent movement
          analyserRef.current = analyser;
        }

        // Create and set up audio element
        const audioElement = new Audio();
        audioElement.crossOrigin = "anonymous";
        audioElement.preload = "auto";

        // Set the audio source
        const timestamp = new Date().getTime();
        audioElement.src = `http://localhost:5001${audioFile.path}?t=${timestamp}`;

        // Wait for audio to be loaded enough to play
        await new Promise((resolve, reject) => {
          const loadHandler = () => {
            console.log('Audio loaded, duration:', audioElement.duration);
            resolve();
          };

          const errorHandler = (error) => {
            console.error('Audio load error:', error);
            reject(error);
          };

          audioElement.addEventListener('canplaythrough', loadHandler, { once: true });
          audioElement.addEventListener('error', errorHandler, { once: true });
          audioElement.load();
        });

        // Only create new media source if not already connected
        if (!isInitialized) {
          // Ensure old source is disconnected
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }

          // Create and connect new media source
          const mediaSource = audioContextRef.current.createMediaElementSource(audioElement);
          sourceRef.current = mediaSource;
          mediaSource.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          isInitialized = true;
        }

        // Set up event listeners - REMOVE timeupdate listener which causes visualization restarts
        const onSeeking = () => {
          console.log('Seeking:', audioElement.currentTime);
          if (isPlaying) startVisualization();
        };

        audioElement.addEventListener('seeking', onSeeking);
        audioElement.addEventListener('seeked', onSeeking);
        // Removed timeupdate listener which was causing visualization restarts

        // Store reference and notify parent
        audioElementRef.current = audioElement;
        onAudioElementCreated(audioElement);

        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        return () => {
          console.log('Cleaning up audio element');
          audioElement.removeEventListener('seeking', onSeeking);
          audioElement.removeEventListener('seeked', onSeeking);
          // Removed timeupdate listener cleanup
          audioElement.pause();
          audioElement.src = '';
          onAudioElementCreated(null);
        };
      } catch (error) {
        console.error('Audio initialization error:', error);
        alert('Error loading audio. Please try again.');
      }
    };

    initAudio();
  }, [audioFile]); // Remove isPlaying from dependencies

  // Separate playback control effect
  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    const playAudio = async () => {
      try {
        // Ensure audio context is running
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        console.log('Playing audio...');
        await audioElement.play();
        startVisualization();
      } catch (error) {
        console.error('Playback error:', error);
        alert('Error playing audio. Please try again.');
      }
    };

    if (isPlaying) {
      playAudio();
    } else {
      console.log('Pausing audio...');
      audioElement.pause();
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying]);

  // Add effect to handle template changes
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear the entire canvas
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restart visualization if playing
    if (isPlaying) {
      startVisualization();
    }
  }, [template]);

  // Update canvas size based on selected resolution
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const { width, height } = RESOLUTIONS[resolution];
    
    // Set canvas dimensions to match the selected resolution
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas with new dimensions
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Adjust container styles based on aspect ratio
    if (containerRef.current) {
      if (resolution === 'Vertical') {
        containerRef.current.style.width = 'auto';
        containerRef.current.style.height = '80vh';
      } else if (resolution === 'Square') {
        containerRef.current.style.width = '720px';
        containerRef.current.style.height = '720px';
        containerRef.current.style.maxWidth = '720px';
        containerRef.current.style.maxHeight = '720px';
      } else {
        containerRef.current.style.width = '100%';
        containerRef.current.style.height = 'auto';
        containerRef.current.style.maxWidth = `${width}px`;
        containerRef.current.style.maxHeight = `${height}px`;
      }
    }
    
    // Restart visualization if playing
    if (isPlaying) {
      startVisualization();
    }
    
    // Initialize particles for the new canvas size
    if (template === 'particles') {
      initParticles(ctx);
    }
  }, [resolution, isPlaying, template]);

  // Function to change resolution
  const changeResolution = (newResolution) => {
    if (RESOLUTIONS[newResolution]) {
      setResolution(newResolution);
    }
  };

  // Expose changeResolution to parent via ref
  useImperativeHandle(ref, () => ({
    changeResolution,
    getCurrentResolution: () => resolution,
    updateParameters,
    getAudioContext: () => audioContextRef.current,
    getAudioSource: () => sourceRef.current,
    getCanvas: () => {
      if (use3D) {
        // For 3D visualizations, get the canvas from the renderer
        const threeCanvas = document.querySelector('.three-visualizer canvas');
        if (!threeCanvas) {
          console.error('3D canvas not found');
          return null;
        }
        return threeCanvas;
      }
      // For 2D visualizations, use the regular canvas
      return canvasRef.current;
    },
    setExportMode: (exporting) => {
      setIsExporting(exporting);
      if (exporting) {
        // Apply high-quality settings for export
        if (analyserRef.current) {
          analyserRef.current.fftSize = 2048; // Increase FFT size for better frequency resolution
          analyserRef.current.smoothingTimeConstant = 0.5; // Reduce smoothing for more detail
        }
      } else {
        // Restore normal settings
        if (analyserRef.current) {
          analyserRef.current.fftSize = 1024;
          analyserRef.current.smoothingTimeConstant = 0.8;
        }
      }
    }
  }));

  const getQualityMultiplier = () => isExporting ? 2 : 1;

  const initParticles = (ctx) => {
    if (!ctx || !ctx.canvas) {
      console.error("Canvas context is null in initParticles");
      return;
    }
    
    const qualityMultiplier = getQualityMultiplier();
    const count = Math.floor(((parameters.count || 50) / 50) * 200 * qualityMultiplier);
    particlesRef.current = [];
    
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: Math.random() * ctx.canvas.width,
        y: Math.random() * ctx.canvas.height,
        size: Math.random() * ((parameters.size || 50) / 10) + 1,
        vx: (Math.random() - 0.5) * ((parameters.speed || 50) / 25),
        vy: (Math.random() - 0.5) * ((parameters.speed || 50) / 25),
        hue: Math.random() * 360
      });
    }
  };

  const updateAndDrawParticles = (ctx, dataArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in updateAndDrawParticles");
      return;
    }
    
    // Safety check - ensure particles array exists
    if (!particlesRef.current || particlesRef.current.length === 0) {
      console.log("Initializing particles in updateAndDrawParticles");
      initParticles(ctx);
      
      // Double-check initialization worked
      if (!particlesRef.current || particlesRef.current.length === 0) {
        console.error("Failed to initialize particles");
        return;
      }
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ffffff';
    const particleCount = Math.floor(((cachedParameters.count || 50) / 100) * particlesRef.current.length);
    const particleSize = (cachedParameters.size || 50) / 10; // Convert to 0-10 scale
    const speed = (cachedParameters.speed || 50) / 50; // Convert to 0-2 scale
    const reactivity = (cachedParameters.reactivity || 50) / 50; // Convert to 0-2 scale
    
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Update and draw particles
    for (let i = 0; i < particleCount; i++) {
      const particle = particlesRef.current[i];
      
      // Apply audio reactivity
      const dataIndex = Math.floor((i / particleCount) * bufferLength);
      const audioValue = dataArray[dataIndex] / 255.0 * reactivity;
      
      // Update position
      particle.x += particle.vx * speed;
      particle.y += particle.vy * speed;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x > canvasRef.current.width) {
        particle.vx = -particle.vx;
      }
      
      if (particle.y < 0 || particle.y > canvasRef.current.height) {
        particle.vy = -particle.vy;
      }
      
      // Draw particle
      const size = particleSize * (1 + audioValue);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fillStyle = adjustColor(color, audioValue * 50);
      ctx.fill();
    }
  };

  // Helper function to adjust colors
  const adjustColor = (hexColor, amount) => {
    // Convert hex to RGB
    let r = parseInt(hexColor.substring(1, 3), 16);
    let g = parseInt(hexColor.substring(3, 5), 16);
    let b = parseInt(hexColor.substring(5, 7), 16);
    
    // Adjust RGB values
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    // Convert back to hex with proper padding
    const rHex = Math.round(r).toString(16).padStart(2, '0');
    const gHex = Math.round(g).toString(16).padStart(2, '0');
    const bHex = Math.round(b).toString(16).padStart(2, '0');
    
    return `#${rHex}${gHex}${bHex}`;
  };

  // Start visualization
  const startVisualization = () => {
    if (!analyserRef.current) {
      console.error("Analyzer reference is null in startVisualization");
      return;
    }
    
    const analyser = analyserRef.current;
    
    // Create data arrays for audio analysis
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(bufferLength);
    
    // Get initial data
    analyser.getByteFrequencyData(dataArray);
    analyser.getByteTimeDomainData(timeArray);
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Reset animation time to ensure consistent animation speed
    timeRef.current = 0;
    
    // Track frame timing for consistent animation speed
    let lastFrameTime = performance.now();
    const targetFrameRate = 30; // Reduced to 30 FPS for smoother, slower animations
    const frameInterval = 1000 / targetFrameRate;
    
    // Handle 3D visualization
    if (use3D) {
      // For 3D, we need to continuously update the audio data
      const update3DAudio = (currentTime) => {
        animationFrameRef.current = requestAnimationFrame(update3DAudio);
        
        // Calculate delta time for smooth animation regardless of frame rate
        const deltaTime = (currentTime - lastFrameTime) / frameInterval;
        lastFrameTime = currentTime;
        
        // Increment time for animations with consistent speed
        timeRef.current += 0.005 * Math.min(deltaTime, 2);
        
        // Get frequency and time domain data
        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(timeArray);
        
        // Update audio data for 3D visualizer with more efficient approach
        const newDataArray = new Array(bufferLength);
        const newTimeArray = new Array(bufferLength);
        
        // Use logarithmic sampling to focus more on lower frequencies
        for (let i = 0; i < bufferLength; i++) {
          // Logarithmic mapping to emphasize lower frequencies
          const logIndex = Math.min(bufferLength - 1, Math.floor(Math.pow(i / bufferLength, 0.5) * bufferLength));
          newDataArray[i] = dataArray[logIndex];
          newTimeArray[i] = timeArray[logIndex];
        }
        
        setAudioData({ 
          dataArray: newDataArray, 
          timeArray: newTimeArray, 
          bufferLength 
        });
      };
      
      update3DAudio(performance.now());
      return;
    }
    
    // For 2D visualizations, ensure canvas exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in startVisualization for 2D visualization");
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize by disabling alpha
    
    // Cache parameter values outside the animation loop for better performance
    let cachedParameters = { ...parameters };
    
    // Animation function for 2D visualizations
    const draw = (currentTime) => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      // Calculate delta time for smooth animation regardless of frame rate
      const deltaTime = (currentTime - lastFrameTime) / frameInterval;
      lastFrameTime = currentTime;
      
      // Increment time for animations with consistent speed
      timeRef.current += 0.005 * Math.min(deltaTime, 2);
      
      // Get frequency and time domain data
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeArray);
      
      // Clear canvas
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Check if parameters have changed
      if (JSON.stringify(cachedParameters) !== JSON.stringify(parameters)) {
        cachedParameters = { ...parameters };
      }
      
      // Draw visualization based on template
      switch (template) {
        case 'waveform':
          drawWaveform(ctx, dataArray, bufferLength, cachedParameters);
          break;
        case 'bars':
          drawBars(ctx, dataArray, bufferLength, cachedParameters);
          break;
        case 'circles':
          drawCircles(ctx, dataArray, bufferLength, cachedParameters);
          break;
        case 'kaleidoscope':
          drawKaleidoscope(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'spiral':
          drawSpiral(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'particles':
          updateAndDrawParticles(ctx, dataArray, bufferLength, cachedParameters);
          break;
        case 'ripple':
          drawRipples(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'terrain':
          drawTerrain(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'starburst':
          drawStarburst(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'fractal':
          drawFractal(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'liquid':
          drawLiquid(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'mesh':
          drawMesh(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'clock':
          drawClock(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'nebula':
          drawNebula(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'cityscape':
          drawCityscape(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'waterfall':
          drawWaterfall(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'constellation':
          drawConstellation(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'mandala':
          drawMandala(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'ocean':
          drawOcean(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'dna':
          drawDNA(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'forest':
          drawForest(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        case 'snake':
          drawSnake(ctx, dataArray, timeArray, bufferLength, cachedParameters);
          break;
        default:
          drawWaveform(ctx, dataArray, bufferLength, cachedParameters);
      }
    };
    
    draw(performance.now());
  };

  const drawWaveform = (ctx, dataArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawWaveform");
      return;
    }
    
    // Apply parameters
    const lineWidth = cachedParameters.lineWidth || 3;
    const color = cachedParameters.color || '#00aaff';
    const reactivity = (cachedParameters.reactivity || 50) / 40; // Adjusted for better responsiveness
    const smoothing = (cachedParameters.smoothing || 50) / 100; // Convert to 0-1 scale
    
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.beginPath();
    
    const sliceWidth = (canvasRef.current.width * 1.0) / bufferLength;
    let x = 0;
    
    // Use fewer points for better performance
    const step = Math.max(1, Math.floor(bufferLength / 256));
    
    for (let i = 0; i < bufferLength; i += step) {
      const v = dataArray[i] / 128.0 * reactivity;
      const y = v * canvasRef.current.height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Apply smoothing if enabled
        if (smoothing > 0) {
          const prevX = x - sliceWidth * step;
          const prevY = dataArray[i - step] / 128.0 * reactivity * canvasRef.current.height / 2;
          const cpX1 = prevX + sliceWidth * step / 3;
          const cpX2 = x - sliceWidth * step / 3;
          const cpY1 = prevY;
          const cpY2 = y;
          
          // Use bezier curve for smoothing
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      x += sliceWidth * step;
    }
    
    ctx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
    ctx.stroke();
  };

  const drawBars = (ctx, dataArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawBars");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff5500';
    const barWidth = (cachedParameters.barWidth || 50) / 100; // Convert to 0-1 scale
    const spacing = (cachedParameters.spacing || 30) / 100; // Convert to 0-1 scale
    const reactivity = (cachedParameters.reactivity || 50) / 20; // Adjusted for better responsiveness
    
    const bars = Math.min(bufferLength, 128); // Reduced number of bars for better performance
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    const barWidthPx = (width / bars) * barWidth;
    const barSpacing = (width / bars) * spacing;
    const totalBarWidth = barWidthPx + barSpacing;
    
    for (let i = 0; i < bars; i++) {
      // Use logarithmic mapping to emphasize lower frequencies
      // Focus more on the lower half of the frequency spectrum
      const freqRatio = i / bars;
      const dataIndex = Math.min(bufferLength - 1, Math.floor(Math.pow(freqRatio, 0.8) * (bufferLength / 2)));
      
      const barHeight = dataArray[dataIndex] * reactivity;
      
      const x = i * totalBarWidth;
      const y = height - barHeight;
      
      ctx.fillStyle = adjustColor(color, (i / bars) * 30);
      ctx.fillRect(x, y, barWidthPx, barHeight);
    }
  };

  const drawCircles = (ctx, dataArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawCircles");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff00ff';
    const baseRadius = (cachedParameters.radius || 50) / 100 * Math.min(canvasRef.current.width, canvasRef.current.height) / 2;
    const circleCount = Math.max(1, Math.min(20, Math.floor((cachedParameters.count || 50) / 5))); // 1-20 circles
    const reactivity = (cachedParameters.reactivity || 50) / 40; // Adjusted for better responsiveness
    
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    
    // Draw circles
    for (let c = 0; c < circleCount; c++) {
      // Focus on lower frequencies for outer circles, higher frequencies for inner circles
      const freqRatio = c / circleCount;
      const freqIndex = Math.floor(Math.pow(freqRatio, 0.7) * (bufferLength / 2));
      const circleIndex = Math.min(bufferLength - 1, freqIndex);
      
      const audioValue = dataArray[circleIndex] / 128.0 * reactivity;
      
      const radius = baseRadius * (c + 1) / circleCount * audioValue;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = adjustColor(color, (c / circleCount) * 50);
      ctx.stroke();
    }
  };

  const drawKaleidoscope = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawKaleidoscope");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ffaa00';
    const segments = cachedParameters.segments || 8;
    const speed = (cachedParameters.speed || 50) / 2000; // Reduced speed for slower rotation
    const reactivity = (cachedParameters.reactivity || 50) / 40; // Adjusted for better responsiveness
    
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    // Rotate based on time and speed
    ctx.translate(centerX, centerY);
    ctx.rotate(timeRef.current * speed);
    
    // Draw kaleidoscope segments
    for (let s = 0; s < segments; s++) {
      ctx.rotate(Math.PI * 2 / segments);
      
      ctx.beginPath();
      ctx.strokeStyle = adjustColor(color, s * 5);
      
      // Draw audio-reactive pattern
      // Use fewer points for better performance
      const step = Math.max(8, Math.floor(bufferLength / 64));
      
      for (let i = 0; i < bufferLength; i += step) {
        // Focus on lower frequencies which typically contain more rhythm information
        const dataIndex = Math.min(bufferLength - 1, Math.floor(Math.pow(i / bufferLength, 0.7) * bufferLength));
        
        const x = (dataArray[dataIndex] / 256.0) * radius * reactivity;
        const y = (timeArray[dataIndex] / 256.0) * radius * reactivity;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const drawSpiral = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawSpiral");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#00ff99';
    const arms = cachedParameters.arms || 5;
    const speed = (cachedParameters.speed || 50) / 2000; // Reduced speed for slower rotation
    const reactivity = (cachedParameters.reactivity || 50) / 40; // Adjusted for better responsiveness
    
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.9;
    
    // Rotate based on time and speed
    ctx.translate(centerX, centerY);
    ctx.rotate(timeRef.current * speed);
    
    // Pre-calculate common values
    const PI2 = Math.PI * 2;
    const PI6 = Math.PI * 6;
    
    // Pre-calculate arm colors to avoid recalculating in the loop
    const armColors = [];
    for (let a = 0; a < arms; a++) {
      armColors[a] = adjustColor(color, a * 10);
    }
    
    // Draw spiral arms
    for (let a = 0; a < arms; a++) {
      const armAngle = (a / arms) * PI2;
      
      ctx.beginPath();
      ctx.strokeStyle = armColors[a];
      
      // Use a more efficient approach for drawing the spiral
      // but maintain the original visual appearance with 100 points
      const pointsPerArm = 100;
      
      // Sample audio data less frequently for performance
      const sampleStep = Math.max(1, Math.floor(bufferLength / 128));
      
      for (let i = 0; i < pointsPerArm; i++) {
        const t = i / pointsPerArm;
        const angle = armAngle + t * PI6;
        const radius = t * maxRadius;
        
        // Apply audio reactivity - use a more efficient data sampling approach
        // Focus on lower frequencies which typically contain more rhythm information
        const freqIndex = Math.min(bufferLength - 1, Math.floor(t * bufferLength / 4));
        const dataIndex = Math.min(bufferLength - 1, freqIndex);
        const audioValue = dataArray[dataIndex] / 128.0 * reactivity;
        
        // Pre-calculate trig functions for performance
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        const x = cosAngle * radius * audioValue;
        const y = sinAngle * radius * audioValue;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  // Add a new ripple visualization
  const drawRipples = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawRipples");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#00ffff';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const speed = (cachedParameters.speed || 50) / 50;
    const density = (cachedParameters.density || 50) / 50;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(width * width + height * height) / 2;
    
    // Initialize ripples array if it doesn't exist
    if (!window.ripples) {
      window.ripples = [];
    }
    
    // Detect beats for creating new ripples
    let bassEnergy = 0;
    for (let i = 0; i < 8; i++) {
      bassEnergy += dataArray[i];
    }
    bassEnergy = bassEnergy / (8 * 255);
    
    // Create new ripple on strong beats
    if (bassEnergy > 0.6 && Math.random() < 0.3 * density) {
      // Get a frequency band for this ripple's color
      const freqBand = Math.floor(Math.random() * (bufferLength / 4));
      const freqIntensity = dataArray[freqBand] / 255;
      
      // Create a new ripple
      window.ripples.push({
        radius: 0,
        maxRadius: maxRadius * (0.3 + Math.random() * 0.7),
        lineWidth: 1 + Math.random() * 4,
        alpha: 0.7 + Math.random() * 0.3,
        speed: (0.5 + Math.random() * 1.5) * speed,
        color: adjustColor(color, freqIntensity * 50 - 25)
      });
    }
    
    // Draw and update ripples
    for (let i = 0; i < window.ripples.length; i++) {
      const ripple = window.ripples[i];
      
      // Update radius
      ripple.radius += ripple.speed;
      
      // Decrease alpha as the ripple expands
      ripple.alpha *= 0.98;
      
      // Draw ripple
      ctx.beginPath();
      ctx.arc(centerX, centerY, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = ripple.alpha;
      ctx.lineWidth = ripple.lineWidth;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    
    // Remove ripples that have expanded beyond their max radius or faded out
    window.ripples = window.ripples.filter(ripple => 
      ripple.radius < ripple.maxRadius && ripple.alpha > 0.01
    );
  };

  // Add a new terrain visualization
  const drawTerrain = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawTerrain");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#33cc33';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const detail = (cachedParameters.detail || 50) / 50;
    const speed = (cachedParameters.speed || 50) / 100;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Calculate number of terrain points based on detail parameter
    const points = Math.max(20, Math.floor(width / (10 / detail)));
    const pointWidth = width / points;
    
    // Create terrain heights based on audio data
    const terrainHeights = [];
    
    // Sample audio data for terrain heights
    for (let i = 0; i < points; i++) {
      // Map point index to frequency data index
      const dataIndex = Math.floor((i / points) * (bufferLength / 2));
      
      // Get audio value and apply reactivity
      const audioValue = dataArray[dataIndex] / 255.0 * reactivity;
      
      // Calculate terrain height
      const terrainHeight = height * 0.1 + audioValue * height * 0.6;
      terrainHeights.push(terrainHeight);
    }
    
    // Smooth terrain heights
    const smoothedHeights = [];
    for (let i = 0; i < points; i++) {
      let sum = 0;
      let count = 0;
      
      // Apply smoothing by averaging neighboring points
      for (let j = Math.max(0, i - 2); j <= Math.min(points - 1, i + 2); j++) {
        sum += terrainHeights[j];
        count++;
      }
      
      smoothedHeights.push(sum / count);
    }
    
    // Create a gradient for the terrain
    const gradient = ctx.createLinearGradient(0, height, 0, height / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColor(color, 30));
    
    // Draw terrain
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Draw terrain path
    for (let i = 0; i < points; i++) {
      const x = i * pointWidth;
      const y = height - smoothedHeights[i];
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        // Use quadratic curves for smoother terrain
        const prevX = (i - 1) * pointWidth;
        const prevY = height - smoothedHeights[i - 1];
        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        
        ctx.quadraticCurveTo(cpX, cpY, x, y);
      }
    }
    
    // Complete the path
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Draw a reflection effect
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    
    // Draw reflection path (inverted terrain)
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    for (let i = 0; i < points; i++) {
      const x = i * pointWidth;
      const terrainY = height - smoothedHeights[i];
      const reflectionHeight = smoothedHeights[i] * 0.3; // Smaller reflection
      const y = height + reflectionHeight;
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        // Use quadratic curves for smoother terrain
        const prevX = (i - 1) * pointWidth;
        const prevY = height + smoothedHeights[i - 1] * 0.3;
        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        
        ctx.quadraticCurveTo(cpX, cpY, x, y);
      }
    }
    
    // Complete the reflection path
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Draw stars in the sky
    if (!window.stars) {
      // Initialize stars
      window.stars = [];
      const starCount = 50;
      
      for (let i = 0; i < starCount; i++) {
        window.stars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.5,
          size: 0.5 + Math.random() * 1.5,
          brightness: 0.3 + Math.random() * 0.7
        });
      }
    }
    
    // Draw stars with audio reactivity
    for (let i = 0; i < window.stars.length; i++) {
      const star = window.stars[i];
      
      // Make stars twinkle based on audio
      const dataIndex = Math.floor(Math.random() * (bufferLength / 4));
      const twinkle = 0.5 + (dataArray[dataIndex] / 255.0) * 0.5;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Add a new starburst visualization
  const drawStarburst = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawStarburst");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff9900';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const particleCount = (cachedParameters.count || 50) / 50 * 100; // 0-100 particles
    const particleSize = (cachedParameters.size || 50) / 50 * 5; // 0-5 size
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Initialize particles array if it doesn't exist
    if (!window.starburstParticles) {
      window.starburstParticles = [];
    }
    
    // Detect beats for creating new bursts
    let bassEnergy = 0;
    for (let i = 0; i < 8; i++) {
      bassEnergy += dataArray[i];
    }
    bassEnergy = bassEnergy / (8 * 255);
    
    // Create new burst on strong beats
    if (bassEnergy > 0.6 && (window.lastBurstTime === undefined || timeRef.current - window.lastBurstTime > 0.5)) {
      window.lastBurstTime = timeRef.current;
      
      // Create a burst of particles
      const burstSize = Math.floor(particleCount * (0.5 + bassEnergy * 0.5));
      const burstColor = adjustColor(color, (Math.random() * 40) - 20);
      
      for (let i = 0; i < burstSize; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (1 + Math.random() * 3) * reactivity;
        const size = (0.5 + Math.random() * 1.5) * particleSize;
        const life = 1.0; // Full life
        
        window.starburstParticles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: size,
          color: burstColor,
          life: life,
          decay: 0.01 + Math.random() * 0.02 // Random decay rate
        });
      }
    }
    
    // Clear canvas with fade effect for trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Update and draw particles
    for (let i = 0; i < window.starburstParticles.length; i++) {
      const particle = window.starburstParticles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Apply gravity
      particle.vy += 0.05;
      
      // Update life
      particle.life -= particle.decay;
      
      // Draw particle
      if (particle.life > 0) {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Remove dead particles
    window.starburstParticles = window.starburstParticles.filter(p => p.life > 0);
  };

  // Add a new fractal tree visualization
  const drawFractal = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawFractal");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#66ff66';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const complexity = (cachedParameters.complexity || 50) / 50; // 0-1 complexity
    const variation = (cachedParameters.variation || 50) / 50; // 0-1 variation
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate audio energy for different frequency bands
    const lowEnergy = getAverageEnergy(dataArray, 0, 10) * reactivity;
    const midEnergy = getAverageEnergy(dataArray, 10, 100) * reactivity;
    const highEnergy = getAverageEnergy(dataArray, 100, 200) * reactivity;
    
    // Calculate overall energy to scale the tree appropriately
    const overallEnergy = (lowEnergy + midEnergy + highEnergy) / 3;
    
    // Calculate tree parameters based on audio
    // Limit trunk length to prevent excessive growth
    const maxTrunkLength = height * 0.3; // Maximum 30% of screen height
    const trunkLength = Math.min(maxTrunkLength, height * 0.25 * (0.8 + lowEnergy * 0.3));
    
    // Limit branch angle to prevent excessive spreading
    const branchAngle = Math.PI / 6 + midEnergy * Math.PI / 15;
    
    // Limit branch ratio to prevent excessive growth
    const branchRatio = Math.min(0.67 + highEnergy * 0.08, 0.75);
    
    // Calculate max depth based on complexity but cap it to prevent excessive recursion
    const maxDepth = Math.floor(4 + complexity * 3);
    
    // Draw tree
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Start tree from bottom center
    const startX = width / 2;
    const startY = height * 0.9;
    
    // Draw trunk
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY - trunkLength);
    ctx.stroke();
    
    // Draw branches recursively with boundary information
    drawBranch(
      ctx, 
      startX, 
      startY - trunkLength, 
      trunkLength, 
      -Math.PI / 2, 
      maxDepth, 
      branchAngle, 
      branchRatio, 
      color,
      variation,
      timeRef.current,
      { width, height, startX, startY } // Pass boundary information
    );
    
    // Helper function to calculate average energy in a frequency range
    function getAverageEnergy(data, startBin, endBin) {
      let sum = 0;
      const binCount = Math.min(endBin - startBin, data.length - startBin);
      
      if (binCount <= 0) return 0;
      
      for (let i = startBin; i < startBin + binCount; i++) {
        sum += data[i] / 255.0;
      }
      
      return sum / binCount;
    }
    
    // Recursive function to draw branches
    function drawBranch(ctx, x, y, length, angle, depth, branchAngle, branchRatio, color, variation, time, bounds) {
      if (depth === 0) return;
      
      // Calculate new branch length
      const newLength = length * branchRatio;
      
      // Add some variation based on time, but limit the variation as depth increases
      const variationScale = Math.max(0, 1 - (depth / maxDepth)); // Reduce variation for deeper branches
      const timeVariation = Math.sin(time * 2 + depth) * variation * 0.1 * variationScale;
      
      // Calculate endpoints for left and right branches
      const leftAngle = angle - branchAngle + timeVariation;
      const rightAngle = angle + branchAngle + timeVariation;
      
      const leftX = x + Math.cos(leftAngle) * newLength;
      const leftY = y + Math.sin(leftAngle) * newLength;
      
      const rightX = x + Math.cos(rightAngle) * newLength;
      const rightY = y + Math.sin(rightAngle) * newLength;
      
      // Check if branches are within screen bounds
      const leftInBounds = isInBounds(leftX, leftY, bounds);
      const rightInBounds = isInBounds(rightX, rightY, bounds);
      
      // Adjust color based on depth
      const branchColor = adjustColor(color, depth * 10);
      ctx.strokeStyle = branchColor;
      
      // Adjust line width based on depth
      ctx.lineWidth = Math.max(1, 3 - depth * 0.5);
      
      // Draw left branch if in bounds
      if (leftInBounds) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(leftX, leftY);
        ctx.stroke();
        
        // Recursively draw sub-branches
        drawBranch(ctx, leftX, leftY, newLength, leftAngle, depth - 1, branchAngle, branchRatio, color, variation, time, bounds);
      }
      
      // Draw right branch if in bounds
      if (rightInBounds) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(rightX, rightY);
        ctx.stroke();
        
        // Recursively draw sub-branches
        drawBranch(ctx, rightX, rightY, newLength, rightAngle, depth - 1, branchAngle, branchRatio, color, variation, time, bounds);
      }
    }
    
    // Helper function to check if a point is within screen bounds with some margin
    function isInBounds(x, y, bounds) {
      const margin = 10; // Small margin to prevent drawing right at the edge
      return x >= margin && 
             x <= bounds.width - margin && 
             y >= margin && 
             y <= bounds.height - margin;
    }
  };

  // Add a new liquid wave visualization
  const drawLiquid = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawLiquid");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#0099ff';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const complexity = (cachedParameters.complexity || 50) / 50; // 0-1 complexity
    const speed = (cachedParameters.speed || 50) / 50; // 0-1 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Initialize wave points if they don't exist
    if (!window.liquidPoints) {
      window.liquidPoints = [];
      const pointCount = Math.floor(20 + complexity * 30); // 20-50 points based on complexity
      
      for (let i = 0; i < pointCount; i++) {
        window.liquidPoints.push({
          x: width * (i / (pointCount - 1)),
          y: height / 2,
          vy: 0
        });
      }
    }
    
    // Ensure we have the right number of points if complexity changes
    const targetPointCount = Math.floor(20 + complexity * 30);
    if (window.liquidPoints.length !== targetPointCount) {
      const newPoints = [];
      for (let i = 0; i < targetPointCount; i++) {
        if (i < window.liquidPoints.length) {
          newPoints.push(window.liquidPoints[i]);
        } else {
          newPoints.push({
            x: width * (i / (targetPointCount - 1)),
            y: height / 2,
            vy: 0
          });
        }
      }
      window.liquidPoints = newPoints;
    }
    
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgb(0, 10, 30)');
    gradient.addColorStop(1, 'rgb(0, 0, 10)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate audio energy for different frequency bands
    const frequencyBands = 8;
    const energyBands = [];
    
    for (let i = 0; i < frequencyBands; i++) {
      const startBin = Math.floor((i / frequencyBands) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / frequencyBands) * (bufferLength / 2));
      energyBands.push(getAverageEnergy(dataArray, startBin, endBin) * reactivity);
    }
    
    // Update wave points based on audio
    const pointCount = window.liquidPoints.length;
    const dampening = 0.95;
    const tension = 0.025;
    const timeScale = speed * 0.5;
    
    // Apply forces to points
    for (let i = 0; i < pointCount; i++) {
      const point = window.liquidPoints[i];
      
      // Determine which frequency band affects this point
      const bandIndex = Math.floor((i / pointCount) * frequencyBands);
      const energy = energyBands[bandIndex];
      
      // Apply force based on audio energy
      point.vy += (Math.random() * 2 - 1) * energy * 2;
      
      // Apply time-based oscillation
      const timeOffset = (i / pointCount) * Math.PI * 2;
      point.vy += Math.sin(timeRef.current * timeScale + timeOffset) * 0.2;
      
      // Apply physics
      point.y += point.vy;
      point.vy *= dampening;
      
      // Apply tension to return to center
      point.vy += (height / 2 - point.y) * tension;
    }
    
    // Draw the liquid
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Draw first point
    ctx.lineTo(window.liquidPoints[0].x, window.liquidPoints[0].y);
    
    // Draw curve through points
    for (let i = 0; i < pointCount - 1; i++) {
      const current = window.liquidPoints[i];
      const next = window.liquidPoints[i + 1];
      
      // Use quadratic curves for smoother liquid
      const cpX = (current.x + next.x) / 2;
      const cpY = (current.y + next.y) / 2;
      
      ctx.quadraticCurveTo(current.x, current.y, cpX, cpY);
    }
    
    // Draw last point
    const lastPoint = window.liquidPoints[pointCount - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    
    // Complete the path
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Add highlights
    ctx.strokeStyle = adjustColor(color, 30);
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw curve through points for highlight
    ctx.moveTo(window.liquidPoints[0].x, window.liquidPoints[0].y);
    
    for (let i = 0; i < pointCount - 1; i++) {
      const current = window.liquidPoints[i];
      const next = window.liquidPoints[i + 1];
      
      // Use quadratic curves for smoother liquid
      const cpX = (current.x + next.x) / 2;
      const cpY = (current.y + next.y) / 2;
      
      ctx.quadraticCurveTo(current.x, current.y, cpX, cpY);
    }
    
    // Draw last point for highlight
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
    
    // Add bubbles for extra effect
    if (!window.liquidBubbles) {
      window.liquidBubbles = [];
    }
    
    // Create new bubbles based on audio energy
    const bassEnergy = energyBands[0];
    if (Math.random() < bassEnergy * 0.3) {
      const bubbleX = Math.random() * width;
      const bubbleSize = 2 + Math.random() * 8;
      
      window.liquidBubbles.push({
        x: bubbleX,
        y: height,
        size: bubbleSize,
        speed: 0.5 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.4
      });
    }
    
    // Update and draw bubbles
    ctx.fillStyle = adjustColor(color, 50);
    
    for (let i = 0; i < window.liquidBubbles.length; i++) {
      const bubble = window.liquidBubbles[i];
      
      // Update position
      bubble.y -= bubble.speed;
      
      // Draw bubble
      ctx.globalAlpha = bubble.opacity;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Remove bubbles that have risen to the top
    window.liquidBubbles = window.liquidBubbles.filter(b => b.y > -b.size);
    
    // Helper function to calculate average energy in a frequency range
    function getAverageEnergy(data, startBin, endBin) {
      let sum = 0;
      const binCount = Math.min(endBin - startBin, data.length - startBin);
      
      if (binCount <= 0) return 0;
      
      for (let i = startBin; i < startBin + binCount; i++) {
        sum += data[i] / 255.0;
      }
      
      return sum / binCount;
    }
  };

  // Add a new audio mesh visualization
  const drawMesh = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawMesh");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff00cc';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const density = (cachedParameters.density || 50) / 50; // 0-1 density
    const perspective = (cachedParameters.perspective || 50) / 50; // 0-1 perspective
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgb(0, 0, 0)');
    gradient.addColorStop(1, 'rgb(20, 0, 20)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate grid dimensions based on density
    const gridSize = Math.max(8, Math.floor(8 + density * 16)); // 8-24 grid size
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    
    // Create perspective projection
    const focalLength = 400 * perspective;
    const viewDistance = 200 + 300 * perspective;
    const eyeZ = -viewDistance;
    
    // Calculate time-based rotation
    const rotationX = timeRef.current * 0.1;
    const rotationY = timeRef.current * 0.15;
    const rotationZ = timeRef.current * 0.05;
    
    // Create 3D grid points
    const grid = [];
    
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) {
        // Map grid position to frequency data
        const freqX = Math.floor((x / gridSize) * (bufferLength / 4));
        const freqY = Math.floor((y / gridSize) * (bufferLength / 4));
        const freqIndex = (freqX + freqY) % (bufferLength / 2);
        
        // Get audio value and apply reactivity
        const audioValue = dataArray[freqIndex] / 255.0 * reactivity;
        
        // Calculate 3D coordinates
        const xPos = (x - gridSize / 2) * cellWidth * 1.5;
        const yPos = (y - gridSize / 2) * cellHeight * 1.5;
        const zPos = audioValue * 100; // Z-axis deformation based on audio
        
        // Apply 3D rotation
        const point = rotate3D(xPos, yPos, zPos, rotationX, rotationY, rotationZ);
        
        // Apply perspective projection
        const scale = focalLength / (focalLength + point.z - eyeZ);
        const projX = width / 2 + point.x * scale;
        const projY = height / 2 + point.y * scale;
        
        // Store projected point
        row.push({
          x: projX,
          y: projY,
          z: point.z,
          scale: scale,
          value: audioValue
        });
      }
      grid.push(row);
    }
    
    // Draw mesh lines
    ctx.lineWidth = 1;
    
    // Draw horizontal lines
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        const point1 = grid[y][x];
        const point2 = grid[y][x + 1];
        
        // Skip lines that would be behind the viewer
        if (point1.z < eyeZ || point2.z < eyeZ) continue;
        
        // Calculate line color based on audio value and depth
        const lineValue = (point1.value + point2.value) / 2;
        const depthFactor = Math.min(1, Math.max(0, (point1.z + point2.z) / 400 + 0.5));
        const lineColor = adjustColor(color, depthFactor * 50 - 25);
        
        // Draw line with opacity based on depth
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = depthFactor * 0.8 + 0.2;
        
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.stroke();
      }
    }
    
    // Draw vertical lines
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize - 1; y++) {
        const point1 = grid[y][x];
        const point2 = grid[y + 1][x];
        
        // Skip lines that would be behind the viewer
        if (point1.z < eyeZ || point2.z < eyeZ) continue;
        
        // Calculate line color based on audio value and depth
        const lineValue = (point1.value + point2.value) / 2;
        const depthFactor = Math.min(1, Math.max(0, (point1.z + point2.z) / 400 + 0.5));
        const lineColor = adjustColor(color, depthFactor * 50 - 25);
        
        // Draw line with opacity based on depth
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = depthFactor * 0.8 + 0.2;
        
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.stroke();
      }
    }
    
    // Draw grid points
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const point = grid[y][x];
        
        // Skip points that would be behind the viewer
        if (point.z < eyeZ) continue;
        
        // Calculate point size and color based on audio value and depth
        const pointSize = 1 + point.value * 3 * point.scale;
        const depthFactor = Math.min(1, Math.max(0, point.z / 200 + 0.5));
        const pointColor = adjustColor(color, depthFactor * 60);
        
        // Draw point with opacity based on depth
        ctx.fillStyle = pointColor;
        ctx.globalAlpha = depthFactor * 0.8 + 0.2;
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Helper function for 3D rotation
    function rotate3D(x, y, z, rotX, rotY, rotZ) {
      // Rotate around X axis
      let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
      let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
      
      // Rotate around Y axis
      let x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
      let z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);
      
      // Rotate around Z axis
      let x3 = x2 * Math.cos(rotZ) - y1 * Math.sin(rotZ);
      let y3 = x2 * Math.sin(rotZ) + y1 * Math.cos(rotZ);
      
      return { x: x3, y: y3, z: z2 };
    }
  };

  // Add a new spectrum clock visualization
  const drawClock = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawClock");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ffcc00';
    const reactivity = (cachedParameters.reactivity || 50) / 40;
    const detail = (cachedParameters.detail || 50) / 50; // 0-1 detail
    const speed = (cachedParameters.speed || 50) / 50; // 0-1 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.85;
    
    // Clear canvas with radial gradient background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
    gradient.addColorStop(0, 'rgb(10, 10, 10)');
    gradient.addColorStop(1, 'rgb(0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw clock face
    ctx.strokeStyle = adjustColor(color, -20);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw hour markers
    ctx.fillStyle = color;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const markerRadius = radius * 0.9;
      const x = centerX + Math.cos(angle) * markerRadius;
      const y = centerY + Math.sin(angle) * markerRadius;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Calculate frequency bands for clock hands
    const bandCount = Math.floor(8 + detail * 16); // 8-24 bands
    const hands = [];
    
    // Calculate average energy for each frequency band
    for (let i = 0; i < bandCount; i++) {
      const startBin = Math.floor((i / bandCount) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / bandCount) * (bufferLength / 2));
      
      let sum = 0;
      for (let j = startBin; j < endBin; j++) {
        sum += dataArray[j] / 255.0;
      }
      
      const avgEnergy = sum / (endBin - startBin) * reactivity;
      
      // Calculate hand properties
      const baseLength = radius * (0.3 + (i / bandCount) * 0.6); // Shorter to longer
      const length = baseLength * (0.5 + avgEnergy * 0.5); // Extend based on energy
      const width = 1 + (bandCount - i) / bandCount * 4; // Thicker to thinner
      const speed = 0.2 + (i / bandCount) * 0.8; // Slower to faster
      const angle = (i / bandCount) * Math.PI * 2 + timeRef.current * speed * speed;
      
      hands.push({
        angle: angle,
        length: length,
        width: width,
        energy: avgEnergy,
        hue: (i / bandCount) * 360
      });
    }
    
    // Draw clock hands
    for (let i = 0; i < hands.length; i++) {
      const hand = hands[i];
      
      // Calculate hand position
      const endX = centerX + Math.cos(hand.angle) * hand.length;
      const endY = centerY + Math.sin(hand.angle) * hand.length;
      
      // Create gradient for hand
      const gradient = ctx.createLinearGradient(centerX, centerY, endX, endY);
      gradient.addColorStop(0, adjustColor(color, -30));
      gradient.addColorStop(1, adjustColor(color, hand.energy * 50));
      
      // Draw hand
      ctx.strokeStyle = gradient;
      ctx.lineWidth = hand.width;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Draw hand endpoint
      ctx.fillStyle = adjustColor(color, hand.energy * 70);
      ctx.beginPath();
      ctx.arc(endX, endY, hand.width * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw center circle
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 10);
    centerGradient.addColorStop(0, color);
    centerGradient.addColorStop(1, adjustColor(color, -20));
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw frequency spectrum around the clock
    ctx.lineWidth = 1;
    ctx.strokeStyle = adjustColor(color, 10);
    ctx.beginPath();
    
    const spectrumRadius = radius * 1.1;
    const spectrumWidth = radius * 0.1;
    
    for (let i = 0; i < bufferLength / 4; i++) {
      const angle = (i / (bufferLength / 4)) * Math.PI * 2 - Math.PI / 2;
      const value = dataArray[i] / 255.0 * reactivity;
      
      const innerRadius = spectrumRadius;
      const outerRadius = spectrumRadius + value * spectrumWidth;
      
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * outerRadius;
      const y2 = centerY + Math.sin(angle) * outerRadius;
      
      if (i === 0) {
        ctx.moveTo(x2, y2);
      } else {
        ctx.lineTo(x2, y2);
      }
    }
    
    // Close the spectrum path
    ctx.closePath();
    ctx.stroke();
    
    // Fill the spectrum with a gradient
    const spectrumGradient = ctx.createRadialGradient(centerX, centerY, spectrumRadius, centerX, centerY, spectrumRadius + spectrumWidth);
    spectrumGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    const adjustedColor = adjustColor(color, 20);
    spectrumGradient.addColorStop(1, adjustedColor.slice(0, 7) + '33'); // 20% opacity
    
    ctx.fillStyle = spectrumGradient;
    ctx.fill();
  };

  const drawNebula = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawNebula");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#4b0082'; // Deep purple default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const complexity = (cachedParameters.complexity || 50) / 50; // 0-1 complexity
    const speed = (cachedParameters.speed || 50) / 100; // 0-0.5 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create a dark background with subtle gradient
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height));
    bgGradient.addColorStop(0, 'rgba(5, 0, 10, 1)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 5, 1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate average energy in different frequency bands
    const bassEnergy = getAverageEnergy(dataArray, 0, Math.floor(bufferLength * 0.1)) * reactivity;
    const midEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)) * reactivity;
    const highEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.5), bufferLength) * reactivity;
    
    // Core size based on bass energy
    const coreSize = 50 + bassEnergy * 100;
    
    // Draw nebula core
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
    coreGradient.addColorStop(0, adjustColor(color, 50));
    coreGradient.addColorStop(0.6, adjustColor(color, 20));
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Number of wisps based on complexity
    const wispCount = Math.floor(10 + complexity * 30);
    
    // Draw nebula wisps
    for (let i = 0; i < wispCount; i++) {
      // Use different frequency bands to affect different wisps
      const energyFactor = i < wispCount / 3 ? bassEnergy : 
                          (i < wispCount * 2 / 3 ? midEnergy : highEnergy);
      
      // Base angle for this wisp
      const baseAngle = (i / wispCount) * Math.PI * 2;
      // Rotation based on time
      const rotation = timeRef.current * speed * (1 + (i % 3) * 0.2);
      const angle = baseAngle + rotation;
      
      // Wisp length based on energy
      const length = 100 + energyFactor * 200 + (Math.sin(timeRef.current + i) * 50);
      
      // Wisp width varies
      const width = 20 + (i % 5) * 10 + energyFactor * 30;
      
      // Wisp starting point (from core edge)
      const startX = centerX + Math.cos(angle) * coreSize * 0.8;
      const startY = centerY + Math.sin(angle) * coreSize * 0.8;
      
      // Wisp end point
      const endX = centerX + Math.cos(angle) * (coreSize + length);
      const endY = centerY + Math.sin(angle) * (coreSize + length);
      
      // Control points for curved wisp
      const ctrlX1 = centerX + Math.cos(angle + 0.2) * (coreSize + length * 0.3);
      const ctrlY1 = centerY + Math.sin(angle + 0.2) * (coreSize + length * 0.3);
      const ctrlX2 = centerX + Math.cos(angle - 0.2) * (coreSize + length * 0.6);
      const ctrlY2 = centerY + Math.sin(angle - 0.2) * (coreSize + length * 0.6);
      
      // Wisp color based on position in spectrum
      const hue = (i / wispCount) * 60 + 240; // Blue to purple range
      const wispColor = `hsla(${hue}, 100%, ${50 + energyFactor * 30}%, ${0.2 + energyFactor * 0.3})`;
      
      // Draw the wisp as a gradient along a bezier curve
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, adjustColor(color, 20) + '80'); // Semi-transparent
      gradient.addColorStop(0.5, wispColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade out
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      
      // Draw curved wisp
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(ctrlX1, ctrlY1, ctrlX2, ctrlY2, endX, endY);
      ctx.stroke();
    }
    
    // Add some stars in the background
    const starCount = 100;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    for (let i = 0; i < starCount; i++) {
      // Star position based on index but with some variation over time
      const angle = (i / starCount) * Math.PI * 2 + timeRef.current * 0.01;
      const distance = 100 + (i % 10) * 50 + Math.sin(timeRef.current * 0.2 + i) * 20;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      // Star size pulsates with high frequencies
      const size = 1 + (dataArray[Math.floor(i / starCount * bufferLength)] / 255) * 2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawCityscape = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawCityscape");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff9900'; // Orange default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const density = (cachedParameters.density || 50) / 50; // 0-1 density
    const detail = (cachedParameters.detail || 50) / 50; // 0-1 detail
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Define maxHeight at the top level of the function
    const maxHeight = height * 0.7; // Max 70% of screen height
    
    // Create night sky gradient background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, 'rgb(0, 5, 20)');
    skyGradient.addColorStop(1, 'rgb(20, 10, 40)');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add stars to the sky
    const starCount = Math.floor(100 * detail);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.6; // Stars only in top 60% (sky)
      const size = Math.random() * 2 + 0.5;
      
      // Make stars twinkle based on high frequencies
      const twinkle = 0.5 + (dataArray[Math.floor(bufferLength * 0.8 + (i % 20))] / 255) * 0.5;
      
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
    
    // Add a moon
    const moonX = width * 0.8;
    const moonY = height * 0.2;
    const moonSize = width * 0.05;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonSize * 2);
    moonGlow.addColorStop(0, 'rgba(255, 255, 230, 1)');
    moonGlow.addColorStop(0.5, 'rgba(255, 255, 230, 0.3)');
    moonGlow.addColorStop(1, 'rgba(255, 255, 230, 0)');
    
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonSize * 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 230, 1)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Calculate frequency bands for buildings
    const bandCount = Math.floor(20 + density * 60); // 20-80 buildings
    const buildings = [];
    
    // Calculate average energy for each frequency band
    for (let i = 0; i < bandCount; i++) {
      const startBin = Math.floor((i / bandCount) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / bandCount) * (bufferLength / 2));
      
      const energy = getAverageEnergy(dataArray, startBin, endBin) * reactivity;
      
      // Building properties
      const buildingWidth = width / bandCount;
      // maxHeight is now defined at the top level
      const buildingHeight = (0.1 + energy * 0.9) * maxHeight; // Min 10% height
      
      // Building position
      const x = i * buildingWidth;
      const y = height - buildingHeight;
      
      // Building color based on height (taller = brighter)
      const brightness = 20 + (buildingHeight / maxHeight) * 60;
      const buildingColor = adjustColor(color, brightness - 40);
      
      buildings.push({
        x,
        y,
        width: buildingWidth,
        height: buildingHeight,
        color: buildingColor,
        energy
      });
    }
    
    // Draw buildings from back to front
    buildings.forEach((building, i) => {
      // Draw main building shape
      ctx.fillStyle = building.color;
      ctx.fillRect(building.x, building.y, building.width, building.height);
      
      // Add building details based on detail parameter
      if (detail > 0.3) {
        // Add windows
        const windowSize = Math.max(3, building.width * 0.15);
        const windowSpacing = windowSize * 1.5;
        const windowsPerRow = Math.floor(building.width / windowSpacing);
        const windowsPerColumn = Math.floor(building.height / windowSpacing);
        
        // Window color based on energy (more energy = more lit windows)
        const windowAlpha = 0.3 + building.energy * 0.7;
        const windowColor = `rgba(255, 255, 200, ${windowAlpha})`;
        
        ctx.fillStyle = windowColor;
        
        for (let row = 0; row < windowsPerColumn; row++) {
          for (let col = 0; col < windowsPerRow; col++) {
            // Randomly light up windows based on energy
            if (Math.random() < (0.2 + building.energy * 0.8)) {
              const windowX = building.x + col * windowSpacing + (windowSpacing - windowSize) / 2;
              const windowY = building.y + row * windowSpacing + (windowSpacing - windowSize) / 2;
              
              ctx.fillRect(windowX, windowY, windowSize, windowSize);
            }
          }
        }
        
        // Add building top details for taller buildings
        if (building.height > maxHeight * 0.4 && detail > 0.6) {
          // Antenna or spire
          ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const antennaX = building.x + building.width / 2;
          const antennaHeight = building.height * 0.2;
          ctx.moveTo(antennaX, building.y);
          ctx.lineTo(antennaX, building.y - antennaHeight);
          ctx.stroke();
          
          // Blinking light on top that pulses with beat
          const beatEnergy = getAverageEnergy(dataArray, 0, 10) * reactivity;
          if (beatEnergy > 0.7 || Math.sin(timeRef.current * 2) > 0.7) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(antennaX, building.y - antennaHeight, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    });
    
    // Add foreground silhouette
    const foregroundHeight = height * 0.05;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, height - foregroundHeight, width, foregroundHeight);
  };

  const drawWaterfall = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawWaterfall");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#00ccff'; // Cyan default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const speed = (cachedParameters.speed || 50) / 50; // 0-1 speed
    const detail = (cachedParameters.detail || 50) / 50; // 0-1 detail
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Initialize waterfall history if it doesn't exist
    if (!window.waterfallHistory) {
      window.waterfallHistory = [];
      for (let i = 0; i < height; i++) {
        window.waterfallHistory.push(new Uint8Array(bufferLength));
      }
    }
    
    // Update waterfall history - shift all rows down
    if (Math.random() < speed * 0.2 + 0.1) { // Control speed of waterfall
      for (let i = window.waterfallHistory.length - 1; i > 0; i--) {
        window.waterfallHistory[i] = window.waterfallHistory[i - 1];
      }
      
      // Add new data at the top
      window.waterfallHistory[0] = new Uint8Array(dataArray);
    }
    
    // Create a dark blue background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgb(0, 10, 30)');
    bgGradient.addColorStop(1, 'rgb(0, 5, 15)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw the waterfall
    const barWidth = width / bufferLength;
    const barCount = Math.min(bufferLength, Math.floor(width / 2)); // Limit for performance
    const skipFactor = Math.floor(bufferLength / barCount);
    
    // Draw each row of the waterfall
    for (let row = 0; row < window.waterfallHistory.length; row++) {
      const rowData = window.waterfallHistory[row];
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * skipFactor;
        const value = rowData[dataIndex] / 255.0 * reactivity;
        
        if (value < 0.05) continue; // Skip very low values for performance
        
        // Calculate position
        const x = i * barWidth * skipFactor;
        const y = row;
        
        // Color based on frequency and intensity
        const hue = (i / barCount) * 180 + 180; // Blue to cyan range
        const saturation = 80 + value * 20;
        const lightness = value * 60;
        const alpha = 0.3 + value * 0.7;
        
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.fillRect(x, y, barWidth * skipFactor, 1);
      }
    }
    
    // Draw water surface at the top with reflection
    const surfaceY = 50;
    ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
    ctx.fillRect(0, 0, width, surfaceY);
    
    // Draw ripples on the surface based on bass frequencies
    const rippleCount = Math.floor(5 + detail * 15);
    const bassEnergy = getAverageEnergy(dataArray, 0, Math.floor(bufferLength * 0.1)) * reactivity;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < rippleCount; i++) {
      if (Math.random() > bassEnergy * 0.5) continue;
      
      const x = Math.random() * width;
      const y = Math.random() * surfaceY;
      const size = 5 + Math.random() * 20 * bassEnergy;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
      
      // Smaller inner ripple
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw splashes when bass hits are detected
    if (bassEnergy > 0.7) {
      const splashCount = Math.floor(bassEnergy * 10);
      
      for (let i = 0; i < splashCount; i++) {
        // Create splash particles
        const x = Math.random() * width;
        const particleCount = Math.floor(5 + Math.random() * 10);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let j = 0; j < particleCount; j++) {
          const particleX = x + (Math.random() - 0.5) * 40;
          const particleY = Math.random() * 30;
          const size = 1 + Math.random() * 3;
          
          ctx.beginPath();
          ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Draw waterfall edge highlights
    const edgeGradient = ctx.createLinearGradient(0, surfaceY, 0, height);
    edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    edgeGradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.1)');
    edgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = edgeGradient;
    ctx.fillRect(0, surfaceY, 10, height - surfaceY); // Left edge
    ctx.fillRect(width - 10, surfaceY, 10, height - surfaceY); // Right edge
    
    // Draw mist at the bottom
    const mistGradient = ctx.createLinearGradient(0, height - 100, 0, height);
    mistGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    mistGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    
    ctx.fillStyle = mistGradient;
    ctx.fillRect(0, height - 100, width, 100);
  };

  const drawConstellation = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawConstellation");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ffffff'; // White default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const density = (cachedParameters.density || 50) / 50; // 0-1 density
    const speed = (cachedParameters.speed || 50) / 100; // 0-0.5 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Create a dark space background
    const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    bgGradient.addColorStop(0, 'rgb(10, 10, 30)');
    bgGradient.addColorStop(1, 'rgb(0, 0, 10)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate overall audio energy for dynamic connection behavior
    let overallEnergy = 0;
    const sampleSize = Math.min(bufferLength, 100); // Sample a portion of the frequency data
    for (let i = 0; i < sampleSize; i++) {
      overallEnergy += dataArray[i] / 255.0;
    }
    overallEnergy = (overallEnergy / sampleSize) * reactivity;
    
    // Initialize stars if they don't exist
    if (!window.constellationStars) {
      window.constellationStars = [];
      const starCount = Math.floor(50 + density * 150); // 50-200 stars
      
      for (let i = 0; i < starCount; i++) {
        // Assign each star to a frequency band
        const freqBand = Math.floor(Math.random() * bufferLength);
        
        window.constellationStars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 1 + Math.random() * 3,
          brightness: 0.3 + Math.random() * 0.7,
          freqBand: freqBand,
          hue: Math.random() * 60 + 180, // Blue to cyan range
          connections: []
        });
      }
    }
    
    // Update star positions slightly based on time
    const stars = window.constellationStars;
    const rotationCenter = { x: width / 2, y: height / 2 };
    // Reduce rotation speed significantly (5x slower)
    const rotationSpeed = speed * 0.002; // Changed from 0.01 to 0.002
    
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      
      // Calculate distance from center
      const dx = star.x - rotationCenter.x;
      const dy = star.y - rotationCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate rotation angle (further stars rotate slower)
      const rotationFactor = 1 - (distance / Math.max(width, height));
      const angle = rotationSpeed * rotationFactor;
      
      // Apply rotation
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const newX = rotationCenter.x + (dx * cos - dy * sin);
      const newY = rotationCenter.y + (dx * sin + dy * cos);
      
      // Keep stars within bounds
      star.x = Math.max(0, Math.min(width, newX));
      star.y = Math.max(0, Math.min(height, newY));
      
      // Update star brightness based on its frequency band
      const freqValue = dataArray[star.freqBand] / 255.0;
      star.brightness = 0.3 + freqValue * reactivity * 0.7;
    }
    
    // Find connections between stars based on audio patterns
    // Adjust max connections based on overall energy - more connections when music is louder
    const baseMaxConnections = Math.floor(density * 100);
    const maxConnections = Math.floor(baseMaxConnections * (1 + overallEnergy));
    
    // Adjust connection threshold based on energy - allow longer connections when music is louder
    const baseConnectionThreshold = 150 * (1 - density * 0.5);
    const connectionThreshold = baseConnectionThreshold * (1 + overallEnergy * 0.5);
    
    // Clear previous connections
    stars.forEach(star => star.connections = []);
    
    // Find new connections
    let connectionCount = 0;
    
    // Detect beats for connection triggers
    const bassEnergy = getAverageEnergy(dataArray, 0, Math.floor(bufferLength * 0.1)) * reactivity;
    const midEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)) * reactivity;
    const beatDetected = bassEnergy > 0.6 || midEnergy > 0.7;
    
    for (let i = 0; i < stars.length && connectionCount < maxConnections; i++) {
      const star1 = stars[i];
      
      for (let j = i + 1; j < stars.length && connectionCount < maxConnections; j++) {
        const star2 = stars[j];
        
        // Calculate distance between stars
        const dx = star1.x - star2.x;
        const dy = star1.y - star2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Connect stars if they're close enough and their frequencies are related
        const freqDiff = Math.abs(star1.freqBand - star2.freqBand);
        
        // More sophisticated rhythm pattern detection
        const rhythmicPattern = beatDetected || 
                               (timeRef.current * 2) % 1 < (0.3 + overallEnergy * 0.4);
        
        // Lower connection threshold when beat is detected
        const effectiveThreshold = beatDetected ? connectionThreshold * 1.3 : connectionThreshold;
        
        if (distance < effectiveThreshold && 
            (freqDiff < 10 || freqDiff > bufferLength - 10 || rhythmicPattern)) {
          
          // Calculate connection strength based on audio energy
          const freqAvg = (dataArray[star1.freqBand] + dataArray[star2.freqBand]) / (2 * 255);
          
          // Increase strength during beats
          const strengthMultiplier = beatDetected ? 1.5 : 1.0;
          const strength = (0.1 + freqAvg * reactivity * 0.9) * strengthMultiplier;
          
          // Lower threshold during high energy moments
          const energyThreshold = 0.2 - (overallEnergy * 0.1);
          
          if (strength > energyThreshold) { // Only connect if there's enough energy
            star1.connections.push({ star: star2, strength });
            connectionCount++;
          }
        }
      }
    }
    
    // Draw connections first (behind stars)
    ctx.lineCap = 'round';
    
    stars.forEach(star => {
      star.connections.forEach(conn => {
        const gradient = ctx.createLinearGradient(star.x, star.y, conn.star.x, conn.star.y);
        
        // Create gradient based on star colors
        const color1 = `hsla(${star.hue}, 100%, 70%, ${conn.strength})`;
        const color2 = `hsla(${conn.star.hue}, 100%, 70%, ${conn.strength})`;
        
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 + conn.strength * 2;
        
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(conn.star.x, conn.star.y);
        ctx.stroke();
      });
    });
    
    // Draw stars
    stars.forEach(star => {
      // Star color based on frequency
      const freqValue = dataArray[star.freqBand] / 255.0;
      const starColor = `hsla(${star.hue}, 100%, 70%, ${star.brightness})`;
      
      // Draw star glow
      const glowSize = star.size * (1 + freqValue * reactivity * 3);
      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize);
      glow.addColorStop(0, starColor);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw star core
      ctx.fillStyle = 'rgba(255, 255, 255, ' + star.brightness + ')';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw constellation names occasionally
    if (Math.random() < 0.005) {
      const constellationNames = [
        'Audionis', 'Beatoria', 'Rhythmica', 'Melodius', 
        'Harmonix', 'Synthus', 'Bassus Major', 'Treble Minor'
      ];
      
      const name = constellationNames[Math.floor(Math.random() * constellationNames.length)];
      const x = 100 + Math.random() * (width - 200);
      const y = 100 + Math.random() * (height - 200);
      
      ctx.font = '20px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText(name, x, y);
    }
  };

  const drawMandala = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawMandala");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff00ff'; // Magenta default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const complexity = (cachedParameters.complexity || 50) / 50; // 0-1 complexity
    const speed = (cachedParameters.speed || 50) / 100; // 0-0.5 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create a dark background with subtle gradient
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) / 2);
    bgGradient.addColorStop(0, 'rgb(10, 0, 20)');
    bgGradient.addColorStop(1, 'rgb(0, 0, 10)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate average energy in different frequency bands
    const bandCount = Math.floor(4 + complexity * 12); // 4-16 bands
    const energyBands = [];
    
    for (let i = 0; i < bandCount; i++) {
      const startBin = Math.floor((i / bandCount) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / bandCount) * (bufferLength / 2));
      energyBands.push(getAverageEnergy(dataArray, startBin, endBin) * reactivity);
    }
    
    // Calculate overall energy for scaling the mandala
    const overallEnergy = energyBands.reduce((sum, energy) => sum + energy, 0) / bandCount;
    
    // Base radius of the mandala
    const baseRadius = Math.min(width, height) * 0.35;
    const radius = baseRadius * (0.8 + overallEnergy * 0.4);
    
    // Number of symmetry axes
    const symmetryCount = Math.floor(4 + complexity * 12); // 4-16 symmetry axes
    
    // Draw the mandala layers from outside to inside
    const layerCount = Math.floor(3 + complexity * 7); // 3-10 layers
    
    for (let layer = 0; layer < layerCount; layer++) {
      // Layer properties
      const layerRadius = radius * (1 - layer / layerCount * 0.8);
      const layerEnergy = energyBands[layer % bandCount];
      const layerRotation = timeRef.current * speed * (1 + layer * 0.1) + layer * Math.PI / layerCount;
      
      // Layer color based on position and energy
      const hue = (layer / layerCount) * 300 + timeRef.current * 10;
      const saturation = 80 + layerEnergy * 20;
      const lightness = 40 + layerEnergy * 30;
      const layerColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      // Draw the layer elements
      ctx.strokeStyle = layerColor;
      ctx.fillStyle = adjustColor(layerColor, -20);
      
      // Element complexity increases with layer
      const elementComplexity = 0.2 + (layer / layerCount) * 0.8 * complexity;
      
      // Draw symmetrical elements
      for (let i = 0; i < symmetryCount; i++) {
        const angle = (i / symmetryCount) * Math.PI * 2 + layerRotation;
        
        // Draw petal/element
        drawMandalaElement(
          ctx, 
          centerX, 
          centerY, 
          angle, 
          layerRadius, 
          layerEnergy, 
          elementComplexity,
          layer,
          symmetryCount
        );
      }
      
      // Draw connecting circles between layers
      if (layer > 0 && layer < layerCount - 1) {
        const circleRadius = layerRadius * (0.1 + layerEnergy * 0.1);
        ctx.lineWidth = 1 + layerEnergy * 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Draw central mandala element
    const centerSize = radius * 0.2 * (0.8 + overallEnergy * 0.4);
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerSize);
    centerGradient.addColorStop(0, adjustColor(color, 30));
    centerGradient.addColorStop(0.7, adjustColor(color, 10));
    centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw sacred geometry in the center
    ctx.strokeStyle = adjustColor(color, 50);
    ctx.lineWidth = 1;
    
    // Draw flower of life pattern
    const flowerRadius = centerSize * 0.6;
    const petalCount = Math.floor(6 + overallEnergy * 6);
    
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 + timeRef.current * speed;
      const x = centerX + Math.cos(angle) * flowerRadius * 0.5;
      const y = centerY + Math.sin(angle) * flowerRadius * 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, flowerRadius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Function to draw a single mandala element
    function drawMandalaElement(ctx, centerX, centerY, angle, radius, energy, complexity, layer, symmetryCount) {
      // Calculate element position
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Element size based on energy
      const size = radius * 0.2 * (0.5 + energy * 0.8);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      
      // Choose element type based on layer
      const elementType = layer % 4;
      
      ctx.lineWidth = 1 + energy * 2;
      
      switch (elementType) {
        case 0: // Petal shape
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.bezierCurveTo(
            size * complexity, -size * 0.5, 
            size * complexity, size * 0.5, 
            0, size
          );
          ctx.bezierCurveTo(
            -size * complexity, size * 0.5, 
            -size * complexity, -size * 0.5, 
            0, -size
          );
          ctx.fill();
          ctx.stroke();
          break;
          
        case 1: // Triangular element
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.7 * complexity, size * 0.5);
          ctx.lineTo(-size * 0.7 * complexity, size * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
          
        case 2: // Circular element
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Add inner detail
          if (complexity > 0.5) {
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
          
        case 3: // Spiral element
          ctx.beginPath();
          for (let i = 0; i < Math.PI * 2 * complexity; i += 0.1) {
            const spiralRadius = (i / (Math.PI * 2)) * size;
            const sx = Math.cos(i) * spiralRadius;
            const sy = Math.sin(i) * spiralRadius;
            
            if (i === 0) {
              ctx.moveTo(sx, sy);
            } else {
              ctx.lineTo(sx, sy);
            }
          }
          ctx.stroke();
          break;
      }
      
      ctx.restore();
    }
  };

  const drawOcean = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawOcean");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#0066cc'; // Ocean blue default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const detail = (cachedParameters.detail || 50) / 50; // 0-1 detail
    const speed = (cachedParameters.speed || 50) / 100; // 0-0.5 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Initialize wave points if they don't exist
    if (!window.oceanWaves) {
      window.oceanWaves = [];
      const waveCount = 5; // Number of wave layers
      
      for (let w = 0; w < waveCount; w++) {
        const pointCount = Math.floor(20 + detail * 60); // 20-80 points per wave
        const points = [];
        
        for (let i = 0; i <= pointCount; i++) {
          points.push({
            x: (i / pointCount) * width,
            y: height * (0.5 + (w * 0.1)), // Stagger waves vertically
            baseY: height * (0.5 + (w * 0.1)),
            offset: Math.random() * Math.PI * 2
          });
        }
        
        window.oceanWaves.push({
          points,
          speed: 0.5 + (w / waveCount) * 0.5, // Different speeds for each wave
          amplitude: 10 + (waveCount - w) * 5, // Different amplitudes (higher for foreground)
          color: adjustColor(color, -w * 10) // Darker for background waves
        });
      }
    }
    
    // Create sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    
    // Get bass and mid frequencies for sky color
    const bassEnergy = getAverageEnergy(dataArray, 0, Math.floor(bufferLength * 0.1)) * reactivity;
    const midEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)) * reactivity;
    
    // Sky colors change with audio
    const skyTopColor = `rgb(${20 + bassEnergy * 50}, ${100 + midEnergy * 50}, ${180 + bassEnergy * 20})`;
    const skyBottomColor = `rgb(${100 + midEnergy * 30}, ${150 + bassEnergy * 30}, ${200 + midEnergy * 20})`;
    
    skyGradient.addColorStop(0, skyTopColor);
    skyGradient.addColorStop(1, skyBottomColor);
    
    // Fill sky
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.5);
    
    // Draw sun/moon
    const celestialSize = width * 0.08;
    const celestialX = width * 0.8;
    const celestialY = height * 0.2;
    
    // Sun/moon color based on audio
    const celestialColor = `rgba(${255 - bassEnergy * 50}, ${255 - bassEnergy * 20}, ${220 - bassEnergy * 20}, 0.8)`;
    
    // Draw glow
    const glowGradient = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, celestialSize * 2);
    glowGradient.addColorStop(0, celestialColor);
    glowGradient.addColorStop(1, 'rgba(255, 255, 220, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, celestialSize * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw sun/moon body
    ctx.fillStyle = celestialColor;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, celestialSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw clouds if detail is high enough
    if (detail > 0.4) {
      const cloudCount = Math.floor(3 + detail * 7); // 3-10 clouds
      
      for (let i = 0; i < cloudCount; i++) {
        // Cloud position
        const cloudX = ((i / cloudCount) * width * 1.5) % (width * 1.2) - width * 0.1 + timeRef.current * speed * 20 % width;
        const cloudY = height * (0.1 + Math.sin(i) * 0.1);
        const cloudSize = width * (0.05 + (i % 3) * 0.03);
        
        // Cloud color affected by audio
        const cloudOpacity = 0.7 + midEnergy * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${cloudOpacity})`;
        
        // Draw cloud as a group of circles
        for (let j = 0; j < 5; j++) {
          const offsetX = (j - 2) * cloudSize * 0.5;
          const offsetY = Math.sin(j * 1.5) * cloudSize * 0.2;
          const size = cloudSize * (0.7 + Math.sin(j) * 0.3);
          
          ctx.beginPath();
          ctx.arc(cloudX + offsetX, cloudY + offsetY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Update and draw waves
    const waves = window.oceanWaves;
    
    // Calculate frequency bands for wave modulation
    const bandCount = waves.length;
    const energyBands = [];
    
    for (let i = 0; i < bandCount; i++) {
      const startBin = Math.floor((i / bandCount) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / bandCount) * (bufferLength / 2));
      energyBands.push(getAverageEnergy(dataArray, startBin, endBin) * reactivity);
    }
    
    // Create ocean base gradient
    const oceanGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
    oceanGradient.addColorStop(0, adjustColor(color, 20));
    oceanGradient.addColorStop(1, adjustColor(color, -30));
    
    // Fill ocean base
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, height * 0.5, width, height * 0.5);
    
    // Update and draw each wave
    for (let w = 0; w < waves.length; w++) {
      const wave = waves[w];
      const energy = energyBands[w % energyBands.length];
      
      // Update wave points
      for (let i = 0; i < wave.points.length; i++) {
        const point = wave.points[i];
        
        // Wave motion: combination of time, position, and audio reactivity
        const waveTime = timeRef.current * speed * wave.speed;
        const wavePos = (i / wave.points.length) * Math.PI * 10 + point.offset;
        
        // Primary wave motion
        const baseWave = Math.sin(waveTime + wavePos) * wave.amplitude;
        
        // Secondary choppiness based on audio
        const choppiness = Math.sin(waveTime * 2 + wavePos * 2) * wave.amplitude * 0.3 * energy;
        
        // Update point position
        point.y = point.baseY + baseWave + choppiness;
      }
      
      // Draw the wave
      ctx.fillStyle = wave.color;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(wave.points[0].x, wave.points[0].y);
      
      // Draw wave using bezier curves for smoothness
      for (let i = 0; i < wave.points.length - 1; i++) {
        const current = wave.points[i];
        const next = wave.points[i + 1];
        
        // Control points for bezier curve
        const cpX1 = current.x + (next.x - current.x) / 3;
        const cpY1 = current.y;
        const cpX2 = current.x + (next.x - current.x) * 2 / 3;
        const cpY2 = next.y;
        
        ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, next.x, next.y);
      }
      
      // Complete the wave shape
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      
      // Add foam/highlights to wave crests if detail is high enough
      if (detail > 0.6 && w < 2) { // Only for top waves
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < wave.points.length - 1; i++) {
          const point = wave.points[i];
          const nextPoint = wave.points[i + 1];
          
          // Only add foam to wave peaks
          if (i > 0) {
            const prevPoint = wave.points[i - 1];
            
            // Check if this is a peak (higher than neighbors)
            if (point.y < prevPoint.y && point.y < nextPoint.y) {
              // Foam intensity based on how sharp the peak is and audio energy
              const peakSharpness = Math.min(
                Math.abs(point.y - prevPoint.y),
                Math.abs(point.y - nextPoint.y)
              );
              
              if (peakSharpness > wave.amplitude * 0.3 * energy) {
                // Draw foam as small arcs
                ctx.beginPath();
                ctx.arc(point.x, point.y, peakSharpness * 0.5, 0, Math.PI);
                ctx.stroke();
              }
            }
          }
        }
      }
    }
    
    // Add reflections on the water
    if (detail > 0.3) {
      // Sun/moon reflection
      const reflectionGradient = ctx.createLinearGradient(
        celestialX, height * 0.5,
        celestialX, height * 0.7
      );
      reflectionGradient.addColorStop(0, `rgba(255, 255, 220, ${0.3 + bassEnergy * 0.2})`);
      reflectionGradient.addColorStop(1, 'rgba(255, 255, 220, 0)');
      
      ctx.fillStyle = reflectionGradient;
      ctx.beginPath();
      ctx.moveTo(celestialX - celestialSize, height * 0.5);
      ctx.lineTo(celestialX + celestialSize, height * 0.5);
      ctx.lineTo(celestialX + celestialSize * 2, height * 0.7);
      ctx.lineTo(celestialX - celestialSize * 2, height * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawDNA = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawDNA");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#00ff99'; // Teal default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const detail = (cachedParameters.detail || 50) / 50; // 0-1 detail
    const speed = (cachedParameters.speed || 50) / 50; // 0-1 speed
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const centerX = width / 2;
    
    // Create a dark background with subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgb(0, 10, 20)');
    bgGradient.addColorStop(1, 'rgb(0, 5, 10)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate frequency bands for DNA modulation
    const bandCount = Math.floor(10 + detail * 20); // 10-30 bands
    const energyBands = [];
    
    for (let i = 0; i < bandCount; i++) {
      const startBin = Math.floor((i / bandCount) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / bandCount) * (bufferLength / 2));
      energyBands.push(getAverageEnergy(dataArray, startBin, endBin) * reactivity);
    }
    
    // DNA helix parameters
    const dnaLength = height * 1.5; // Length of the DNA strand
    const dnaWidth = width * 0.15; // Width of the DNA helix
    const dnaSegments = Math.floor(20 + detail * 60); // Number of segments in the DNA
    const dnaRotation = timeRef.current * speed; // Rotation of the DNA over time
    
    // Calculate overall energy for DNA animation
    const overallEnergy = energyBands.reduce((sum, energy) => sum + energy, 0) / bandCount;
    
    // Vertical offset to center the DNA
    const verticalOffset = (height - dnaLength) / 2;
    
    // Draw the DNA strands
    for (let strand = 0; strand < 2; strand++) {
      // Each strand has a different color
      const strandColor = strand === 0 ? color : adjustColor(color, 40);
      
      // Draw the strand backbone
      ctx.strokeStyle = adjustColor(strandColor, -20);
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      for (let i = 0; i <= dnaSegments; i++) {
        const progress = i / dnaSegments;
        const y = verticalOffset + progress * dnaLength;
        
        // Sine wave for the strand, offset by PI for the second strand
        const phase = strand * Math.PI;
        const waveAmplitude = dnaWidth * (0.8 + overallEnergy * 0.4);
        const x = centerX + Math.sin(progress * Math.PI * 10 + dnaRotation + phase) * waveAmplitude;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Draw the base pairs (connections between strands)
    for (let i = 0; i < dnaSegments; i++) {
      const progress = i / dnaSegments;
      const y = verticalOffset + progress * dnaLength;
      
      // Get the energy for this segment
      const energy = energyBands[i % bandCount];
      
      // Calculate positions of the two strand points at this segment
      const phase1 = 0;
      const phase2 = Math.PI;
      const waveAmplitude = dnaWidth * (0.8 + overallEnergy * 0.4);
      
      const x1 = centerX + Math.sin(progress * Math.PI * 10 + dnaRotation + phase1) * waveAmplitude;
      const x2 = centerX + Math.sin(progress * Math.PI * 10 + dnaRotation + phase2) * waveAmplitude;
      
      // Only draw base pairs at certain intervals
      if (i % 2 === 0) {
        // Base pair color based on frequency band
        const hue = (i / dnaSegments) * 180 + 180; // Cyan to blue range
        const basePairColor = `hsla(${hue}, 100%, 70%, ${0.5 + energy * 0.5})`;
        
        // Draw base pair connection
        ctx.strokeStyle = basePairColor;
        ctx.lineWidth = 2 + energy * 4;
        
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        
        // Draw nucleotide bases at the ends of the connection
        const baseSize = 3 + energy * 5;
        
        // Base 1
        ctx.fillStyle = adjustColor(color, 20);
        ctx.beginPath();
        ctx.arc(x1, y, baseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Base 2
        ctx.fillStyle = adjustColor(color, 60);
        ctx.beginPath();
        ctx.arc(x2, y, baseSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Add glow effect to the DNA
    if (detail > 0.5) {
      ctx.globalCompositeOperation = 'lighter';
      
      // Draw glow along the DNA strands
      for (let i = 0; i < dnaSegments; i += 4) {
        const progress = i / dnaSegments;
        const y = verticalOffset + progress * dnaLength;
        
        // Get the energy for this segment
        const energy = energyBands[i % bandCount];
        
        // Only add glow if there's enough energy
        if (energy > 0.5) {
          // Calculate position on the DNA
          const phase = (i % 2) * Math.PI; // Alternate between strands
          const waveAmplitude = dnaWidth * (0.8 + overallEnergy * 0.4);
          const x = centerX + Math.sin(progress * Math.PI * 10 + dnaRotation + phase) * waveAmplitude;
          
          // Glow size based on energy
          const glowSize = 20 + energy * 30;
          
          // Glow color
          const hue = (i / dnaSegments) * 180 + 180;
          const glowColor = `hsla(${hue}, 100%, 70%, ${energy * 0.3})`;
          
          // Draw glow
          const glow = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
          glow.addColorStop(0, glowColor);
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Add floating particles around the DNA if detail is high
    if (detail > 0.7) {
      const particleCount = Math.floor(20 + detail * 60);
      
      for (let i = 0; i < particleCount; i++) {
        // Particle position - keep near the DNA
        const angle = Math.random() * Math.PI * 2;
        const distance = dnaWidth * 2 + Math.random() * width * 0.2;
        const x = centerX + Math.cos(angle) * distance;
        const y = Math.random() * height;
        
        // Particle size based on audio
        const particleEnergy = energyBands[i % bandCount];
        const size = 1 + particleEnergy * 3;
        
        // Particle color
        const hue = (i / particleCount) * 180 + 180;
        const particleColor = `hsla(${hue}, 100%, 70%, ${0.3 + particleEnergy * 0.7})`;
        
        // Draw particle
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawForest = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawForest");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#33cc33'; // Green default
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const density = (cachedParameters.density || 50) / 50; // 0-1 density
    const detail = (cachedParameters.detail || 50) / 50; // 0-1 detail
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Create a forest background gradient (sky to ground)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    
    // Get bass and mid frequencies for sky color
    const bassEnergy = getAverageEnergy(dataArray, 0, Math.floor(bufferLength * 0.1)) * reactivity;
    const midEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)) * reactivity;
    
    // Sky colors change with audio
    const skyTopColor = `rgb(${50 + bassEnergy * 30}, ${100 + midEnergy * 50}, ${150 + bassEnergy * 50})`;
    const skyBottomColor = `rgb(${100 + midEnergy * 20}, ${120 + bassEnergy * 20}, ${150 + midEnergy * 20})`;
    const groundColor = `rgb(${30 + bassEnergy * 10}, ${60 + midEnergy * 10}, ${30 + bassEnergy * 5})`;
    
    bgGradient.addColorStop(0, skyTopColor);
    bgGradient.addColorStop(0.6, skyBottomColor);
    bgGradient.addColorStop(0.6, groundColor);
    // Create a darker version of the ground color directly
    const darkerGroundColor = `rgb(${Math.max(0, 30 + bassEnergy * 10 - 20)}, ${Math.max(0, 60 + midEnergy * 10 - 20)}, ${Math.max(0, 30 + bassEnergy * 5 - 20)})`;
    bgGradient.addColorStop(1, darkerGroundColor);
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw sun/moon in the sky
    const celestialSize = width * 0.05;
    const celestialX = width * 0.8;
    const celestialY = height * 0.2;
    
    // Sun/moon color based on audio
    const celestialColor = `rgba(${255 - bassEnergy * 50}, ${255 - bassEnergy * 20}, ${220 - bassEnergy * 20}, 0.8)`;
    
    // Draw glow
    const glowGradient = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, celestialSize * 2);
    glowGradient.addColorStop(0, celestialColor);
    glowGradient.addColorStop(1, 'rgba(255, 255, 220, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, celestialSize * 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = celestialColor;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, celestialSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Calculate frequency bands for trees
    const bandCount = Math.floor(10 + density * 40); // 10-50 frequency bands
    const energyBands = [];
    
    for (let i = 0; i < bandCount; i++) {
      const startBin = Math.floor((i / bandCount) * (bufferLength / 2));
      const endBin = Math.floor(((i + 1) / bandCount) * (bufferLength / 2));
      energyBands.push(getAverageEnergy(dataArray, startBin, endBin) * reactivity);
    }
    
    // Draw distant mountains if detail is high enough
    if (detail > 0.3) {
      const mountainCount = Math.floor(3 + detail * 7); // 3-10 mountains
      
      for (let i = 0; i < mountainCount; i++) {
        // Mountain properties
        const mountainWidth = width / (mountainCount - 1);
        const mountainX = i * mountainWidth - mountainWidth / 2;
        const mountainHeight = height * 0.2 * (0.5 + Math.sin(i * 2) * 0.5);
        
        // Mountain color based on distance (further = lighter)
        const distanceFactor = i / mountainCount;
        const mountainColor = `rgba(${70 + distanceFactor * 30}, ${90 + distanceFactor * 30}, ${110 + distanceFactor * 30}, ${0.8 - distanceFactor * 0.4})`;
        
        // Draw mountain
        ctx.fillStyle = mountainColor;
        ctx.beginPath();
        ctx.moveTo(mountainX, height * 0.6);
        ctx.lineTo(mountainX + mountainWidth / 2, height * 0.6 - mountainHeight);
        ctx.lineTo(mountainX + mountainWidth, height * 0.6);
        ctx.closePath();
        ctx.fill();
        
        // Add snow caps if high enough
        if (mountainHeight > height * 0.1) {
          const snowCapHeight = mountainHeight * 0.2;
          const snowCapWidth = mountainWidth * 0.3;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.moveTo(mountainX + mountainWidth / 2 - snowCapWidth / 2, height * 0.6 - mountainHeight + snowCapHeight);
          ctx.lineTo(mountainX + mountainWidth / 2, height * 0.6 - mountainHeight);
          ctx.lineTo(mountainX + mountainWidth / 2 + snowCapWidth / 2, height * 0.6 - mountainHeight + snowCapHeight);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    
    // Draw trees
    const treeCount = Math.floor(10 + density * 40); // 10-50 trees
    const horizonY = height * 0.6; // Horizon line
    
    // Sort trees by depth (draw back to front)
    const trees = [];
    
    for (let i = 0; i < treeCount; i++) {
      // Tree position
      const x = Math.random() * width;
      const depth = Math.random(); // 0 = far, 1 = close
      const y = horizonY - depth * height * 0.1; // Trees further away are higher on screen
      
      // Tree properties based on frequency band
      const bandIndex = Math.floor(i / treeCount * bandCount);
      const energy = energyBands[bandIndex];
      
      // Tree size based on depth and audio
      const baseHeight = height * 0.2 * depth;
      const treeHeight = baseHeight * (0.7 + energy * 0.6);
      const trunkWidth = treeHeight * 0.05 * (0.8 + energy * 0.4);
      
      trees.push({
        x,
        y,
        depth,
        height: treeHeight,
        width: trunkWidth,
        energy,
        bandIndex
      });
    }
    
    // Sort trees by depth (back to front)
    trees.sort((a, b) => a.depth - b.depth);
    
    // Draw each tree
    trees.forEach(tree => {
      // Tree colors based on depth and energy
      const depthFactor = tree.depth;
      const energy = tree.energy;
      
      // Trunk color
      const trunkColor = adjustColor('#8B4513', -20 + depthFactor * 40); // Brown with depth variation
      
      // Foliage color based on tree's frequency band and energy
      const hue = 80 + (tree.bandIndex / bandCount) * 40; // Green to yellow-green range
      const saturation = 70 + energy * 30;
      const lightness = 20 + depthFactor * 20 + energy * 20;
      const foliageColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      // Draw trunk
      ctx.fillStyle = trunkColor;
      ctx.beginPath();
      ctx.rect(
        tree.x - tree.width / 2,
        tree.y - tree.height,
        tree.width,
        tree.height * 0.4
      );
      ctx.fill();
      
      // Draw foliage based on detail level
      if (detail < 0.5) {
        // Simple triangle foliage
        const foliageWidth = tree.height * 0.4 * (0.8 + energy * 0.4);
        const foliageHeight = tree.height * 0.8 * (0.8 + energy * 0.4);
        
        ctx.fillStyle = foliageColor;
        ctx.beginPath();
        ctx.moveTo(tree.x - foliageWidth / 2, tree.y - tree.height * 0.3);
        ctx.lineTo(tree.x, tree.y - tree.height - foliageHeight * 0.2);
        ctx.lineTo(tree.x + foliageWidth / 2, tree.y - tree.height * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        // Detailed multi-layer foliage
        const layerCount = Math.floor(2 + detail * 3); // 2-5 layers
        
        for (let i = 0; i < layerCount; i++) {
          const layerWidth = tree.height * (0.5 - i * 0.07) * (0.8 + energy * 0.4);
          const layerY = tree.y - tree.height * (0.3 + i * 0.2);
          
          // Layer color gets lighter toward the top
          const layerLightness = lightness + i * 5;
          const layerColor = `hsl(${hue}, ${saturation}%, ${layerLightness}%)`;
          
          ctx.fillStyle = layerColor;
          ctx.beginPath();
          ctx.moveTo(tree.x - layerWidth / 2, layerY);
          ctx.lineTo(tree.x, layerY - layerWidth * 0.8);
          ctx.lineTo(tree.x + layerWidth / 2, layerY);
          ctx.closePath();
          ctx.fill();
        }
      }
      
      // Add tree sway animation based on audio
      if (energy > 0.3) {
        // Draw swaying leaves/particles
        const particleCount = Math.floor(5 + energy * 15);
        
        for (let i = 0; i < particleCount; i++) {
          // Particle position around the foliage
          const angle = Math.random() * Math.PI * 2;
          const distance = tree.height * 0.2 * Math.random();
          const particleX = tree.x + Math.cos(angle) * distance;
          const particleY = tree.y - tree.height * 0.6 - Math.sin(angle) * distance;
          
          // Particle size based on energy
          const size = 1 + energy * 2;
          
          // Particle color - convert HSL to hex before adjusting
          // Use a fixed hex color instead of trying to adjust the HSL color
          const particleColor = energy > 0.5 ? 
            `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 20, 90)}%)` : 
            `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 10, 80)}%)`;
          
          ctx.fillStyle = particleColor;
          ctx.beginPath();
          ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    
    // Add lighting effects based on audio
    if (detail > 0.6) {
      // Sun rays
      const rayCount = Math.floor(5 + bassEnergy * 10);
      
      ctx.strokeStyle = `rgba(255, 255, 200, ${0.1 + bassEnergy * 0.2})`;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI + Math.PI / 4;
        const rayLength = width * (0.5 + bassEnergy * 0.5);
        
        ctx.beginPath();
        ctx.moveTo(celestialX, celestialY);
        ctx.lineTo(
          celestialX + Math.cos(angle) * rayLength,
          celestialY + Math.sin(angle) * rayLength
        );
        ctx.stroke();
      }
      
      // Ground fog
      const fogOpacity = 0.1 + midEnergy * 0.2;
      const fogGradient = ctx.createLinearGradient(0, horizonY, 0, height);
      fogGradient.addColorStop(0, `rgba(255, 255, 255, ${fogOpacity})`);
      fogGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = fogGradient;
      ctx.fillRect(0, horizonY, width, height - horizonY);
    }
  };

  function getAverageEnergy(data, startBin, endBin) {
    let sum = 0;
    const binCount = Math.min(endBin - startBin, data.length - startBin);
    
    if (binCount <= 0) return 0;
    
    for (let i = startBin; i < startBin + binCount; i++) {
      sum += data[i] / 255.0;
    }
    
    return sum / binCount;
  }

  // Update parameters when initialParameters change - use a ref to avoid re-renders
  useEffect(() => {
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log("Visualizer received updated parameters:", initialParameters);
    }
    
    if (initialParameters && Object.keys(initialParameters).length > 0) {
      // Use a simple update without triggering re-renders
    setParameters(initialParameters);
    }
  }, [initialParameters]);

  // Add a function to update parameters
  const updateParameters = (newParameters) => {
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
    console.log("Updating visualization parameters:", newParameters);
    }
    
    setParameters(newParameters);
  };

  const drawSnake = (ctx, dataArray, timeArray, bufferLength, cachedParameters) => {
    // Safety check - ensure canvas reference exists
    if (!canvasRef.current) {
      console.error("Canvas reference is null in drawSnake");
      return;
    }
    
    // Apply parameters
    const color = cachedParameters.color || '#ff0000'; // Base color (will be overridden by rainbow)
    const reactivity = (cachedParameters.reactivity || 50) / 50; // 0-1 reactivity
    const speed = (cachedParameters.speed || 50) / 50; // 0-1 speed
    const size = (cachedParameters.size || 50) / 50; // 0-1 size
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Create a cosmic background with slower movement
    // Use timeRef for slow background movement
    const bgTime = timeRef.current * 0.05; // Significantly slowed down background movement
    const bgOffsetX = Math.sin(bgTime * 0.2) * width * 0.05;
    const bgOffsetY = Math.cos(bgTime * 0.3) * height * 0.05;
    
    const bgGradient = ctx.createRadialGradient(
      width/2 + bgOffsetX, height/2 + bgOffsetY, 0, 
      width/2 + bgOffsetX, height/2 + bgOffsetY, Math.max(width, height)
    );
    bgGradient.addColorStop(0, 'rgba(20, 0, 40, 1)');
    bgGradient.addColorStop(0.5, 'rgba(10, 0, 20, 1)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 10, 1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw cosmic stars with slow twinkling
    if (!window.snakeStars) {
      // Initialize fixed star positions
      window.snakeStars = [];
      const starCount = 150;
      for (let i = 0; i < starCount; i++) {
        window.snakeStars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 0.5,
          brightness: 0.5 + Math.random() * 0.5,
          twinkleSpeed: Math.random() * 2 + 1,
          twinkleOffset: Math.random() * Math.PI * 2
        });
      }
    }
    
    // Draw stars with slow twinkling
    window.snakeStars.forEach(star => {
      // Slow twinkling effect
      const twinkle = 0.5 + Math.sin(timeRef.current * 0.5 * star.twinkleSpeed + star.twinkleOffset) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Calculate audio energy for different frequency bands
    const bassEnergy = getAverageEnergy(dataArray, 0, Math.floor(bufferLength * 0.1)) * reactivity;
    const midEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)) * reactivity;
    const highEnergy = getAverageEnergy(dataArray, Math.floor(bufferLength * 0.5), bufferLength) * reactivity;
    
    // Calculate overall energy
    const overallEnergy = (bassEnergy + midEnergy + highEnergy) / 3;
    
    // Detect beats for movement changes
    const beatDetected = bassEnergy > 0.7 || midEnergy > 0.8;
    
    // Initialize snake if it doesn't exist
    if (!window.snake) {
      // Grid size based on canvas dimensions
      const gridSize = Math.floor(20 + size * 20); // 20-40 grid cells
      const cellSize = Math.min(width, height) / gridSize;
      
      // Initial snake position (center of screen)
      const initialX = Math.floor(gridSize / 2);
      const initialY = Math.floor(gridSize / 2);
      
      // Create initial snake with just 3 segments (smaller start)
      const segments = [];
      for (let i = 0; i < 3; i++) {
        segments.push({ 
          x: initialX - i * 0.5, 
          y: initialY,
          // Add extra properties for cosmic effect
          glow: Math.random(),
          pulseOffset: Math.random() * Math.PI * 2,
          // Add properties for smooth movement
          targetX: initialX - i * 0.5,
          targetY: initialY,
          prevX: initialX - i * 0.5,
          prevY: initialY
        });
      }
      
      // Create targets for the snake to move toward
      const targets = [];
      for (let i = 0; i < 5; i++) {
        targets.push({
          x: Math.random() * gridSize,
          y: Math.random() * gridSize,
          energy: 1.0
        });
      }
      
      window.snake = {
        segments,
        direction: { x: 1, y: 0 }, // Initial direction: right
        nextDirection: { x: 1, y: 0 }, // For queuing direction changes
        gridSize,
        cellSize,
        moveCounter: 0,
        moveThreshold: 15, // Moderate movement speed
        colorOffset: 0,
        food: {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
          energy: 1.0
        },
        lastMoveTime: 0,
        directionChangeQueued: false,
        targets: targets,
        currentTargetIndex: 0,
        pathfindingCounter: 0,
        glowIntensity: 0.5,
        tailEffect: 0,
        // Track growth for gradual size increase
        initialSize: 3, // Initial number of segments
        maxSegments: 15, // Maximum number of segments
        growthProgress: 0, // Growth progress counter
        foodEaten: 0, // Track food eaten for growth
        // Movement interpolation
        movementProgress: 0, // Progress between positions (0-1)
        movementSpeed: 0.1, // Speed of interpolation (0.1 = 10% per frame)
        lastMoveDirection: { x: 1, y: 0 } // Last movement direction
      };
    }
    
    const snake = window.snake;
    
    // Safety check - ensure snake object is properly initialized
    if (!snake || !snake.segments || !snake.targets) {
      console.error("Snake object is not properly initialized");
      // Reinitialize by clearing the window.snake object
      window.snake = null;
      return;
    }
    
    // Update cosmic background effects based on audio
    snake.glowIntensity = 0.5 + overallEnergy * 0.5;
    snake.tailEffect = Math.max(snake.tailEffect, bassEnergy);
    snake.tailEffect *= 0.95; // Decay effect
    
    // Update targets based on audio energy - slower movement
    if (beatDetected && Math.random() < 0.2) { // Reduced probability from 0.3 to 0.2
      // Create a new target when a beat is detected
      const targetIndex = Math.floor(Math.random() * snake.targets.length);
      snake.targets[targetIndex] = {
        x: Math.random() * snake.gridSize,
        y: Math.random() * snake.gridSize,
        energy: 1.0
      };
    }
    
    // Update target energies - slower fading
    snake.targets.forEach(target => {
      target.energy *= 0.995; // Slower fade (was 0.99)
      if (target.energy < 0.2) {
        // Regenerate faded targets
        target.x = Math.random() * snake.gridSize;
        target.y = Math.random() * snake.gridSize;
        target.energy = 1.0;
      }
    });
    
    // Find the most energetic target
    let bestTargetIndex = 0;
    let bestEnergy = 0;
    snake.targets.forEach((target, index) => {
      if (target.energy > bestEnergy) {
        bestEnergy = target.energy;
        bestTargetIndex = index;
      }
    });
    snake.currentTargetIndex = bestTargetIndex;
    
    // Update pathfinding toward current target - slower updates
    snake.pathfindingCounter++;
    if (snake.pathfindingCounter >= 15) { // Increased from 10 to 15 for slower direction changes
      snake.pathfindingCounter = 0;
      
      const head = snake.segments[0];
      const target = snake.targets[snake.currentTargetIndex];
      
      // Safety check - ensure target exists
      if (!target) {
        console.error("Target is undefined");
        return;
      }
      
      // Calculate direction to target
      const dx = target.x - head.x;
      const dy = target.y - head.y;
      
      // Determine best direction to move
      let newDirection = { x: 0, y: 0 };
      
      // Prioritize the larger distance
      if (Math.abs(dx) > Math.abs(dy)) {
        newDirection.x = dx > 0 ? 1 : -1;
        newDirection.y = 0;
      } else {
        newDirection.x = 0;
        newDirection.y = dy > 0 ? 1 : -1;
      }
      
      // Occasionally make random moves for more interesting patterns - reduced frequency
      if (Math.random() < 0.1 * overallEnergy) { // Reduced from 0.2 to 0.1
        if (Math.random() < 0.5) {
          newDirection = { x: Math.random() < 0.5 ? -1 : 1, y: 0 };
        } else {
          newDirection = { x: 0, y: Math.random() < 0.5 ? -1 : 1 };
        }
      }
      
      // Don't allow reversing direction
      if (!(newDirection.x === -snake.direction.x && newDirection.y === -snake.direction.y)) {
        snake.nextDirection = newDirection;
        snake.directionChangeQueued = true;
      }
    }
    
    // Update snake movement counter - sync with music but slower
    const baseSpeed = 0.5; // Reduced from 0.7 to 0.5
    const maxSpeedBoost = 0.8; // Reduced from 1.0 to 0.8
    snake.moveCounter += baseSpeed + (speed * maxSpeedBoost * overallEnergy);
    
    // Smooth movement interpolation
    snake.movementProgress += snake.movementSpeed;
    
    // Move snake when counter exceeds threshold
    if (snake.moveCounter >= snake.moveThreshold) {
      snake.moveCounter = 0;
      
      // Apply queued direction change
      if (snake.directionChangeQueued) {
        snake.direction = snake.nextDirection;
        snake.directionChangeQueued = false;
      }
      
      // Store last move direction
      snake.lastMoveDirection = { ...snake.direction };
      
      // Save previous positions for interpolation
      snake.segments.forEach(segment => {
        segment.prevX = segment.x;
        segment.prevY = segment.y;
      });
      
      // Calculate new head position - smoother, slower movement
      const head = snake.segments[0];
      const moveAmount = 0.4 + overallEnergy * 0.4; // Reduced from 0.5 to 0.4
      
      const newHead = {
        x: head.prevX + snake.direction.x * moveAmount,
        y: head.prevY + snake.direction.y * moveAmount,
        targetX: head.prevX + snake.direction.x * moveAmount,
        targetY: head.prevY + snake.direction.y * moveAmount,
        prevX: head.prevX,
        prevY: head.prevY,
        glow: Math.random(),
        pulseOffset: Math.random() * Math.PI * 2
      };
      
      // Wrap around screen edges with a margin to keep snake visible
      const margin = 2;
      if (newHead.x < margin) newHead.x = snake.gridSize - margin;
      if (newHead.x > snake.gridSize - margin) newHead.x = margin;
      if (newHead.y < margin) newHead.y = snake.gridSize - margin;
      if (newHead.y > snake.gridSize - margin) newHead.y = margin;
      
      // Update target position to match wrapped position
      newHead.targetX = newHead.x;
      newHead.targetY = newHead.y;
      
      // Check if snake ate food
      const distance = Math.sqrt(
        Math.pow(newHead.x - snake.food.x, 2) + 
        Math.pow(newHead.y - snake.food.y, 2)
      );
      const ateFood = distance < 1.5;
      
      // Add new head to snake
      snake.segments.unshift(newHead);
      
      // If didn't eat food, remove tail
      if (!ateFood) {
        // Only remove tail if we're at or above the current growth target
        const targetLength = Math.max(
          snake.initialSize,
          Math.ceil(snake.initialSize + (snake.maxSegments - snake.initialSize) * (snake.growthProgress / 100))
        );
        
        if (snake.segments.length > targetLength) {
          snake.segments.pop();
        }
      } else {
        // Generate new food
        let newFoodX, newFoodY;
        let validPosition = false;
        
        while (!validPosition) {
          newFoodX = Math.random() * snake.gridSize;
          newFoodY = Math.random() * snake.gridSize;
          
          // Check if position is not too close to snake
          validPosition = !snake.segments.some(segment => 
            Math.sqrt(Math.pow(segment.x - newFoodX, 2) + Math.pow(segment.y - newFoodY, 2)) < 2
          );
        }
        
        snake.food = { 
          x: newFoodX, 
          y: newFoodY,
          energy: 1.0
        };
        
        // Add cosmic energy burst effect
        snake.glowIntensity = 1.0;
        snake.tailEffect = 1.0;
        
        // Increment food eaten counter
        snake.foodEaten++;
        
        // Increase growth progress - more significant growth
        snake.growthProgress += 15; // Each food adds 15% toward full growth (was 10%)
        snake.growthProgress = Math.min(snake.growthProgress, 100); // Cap at 100%
        
        // Increase max segments as snake grows
        if (snake.foodEaten % 2 === 0 && snake.maxSegments < 30) {
          snake.maxSegments += 5; // Grow by 5 segments every 2 food items (was every 3)
        }
      }
      
      // Reset movement progress for smooth interpolation
      snake.movementProgress = 0;
    }
    
    // Update color rotation based on audio energy - slower rotation
    snake.colorOffset += 0.003 + overallEnergy * 0.02; // Reduced from 0.005 + 0.03
    if (snake.colorOffset > 1) snake.colorOffset -= 1;
    
    // Draw cosmic food
    const foodPulse = 0.8 + Math.sin(timeRef.current * 2) * 0.2; // Slower pulsing (was 3)
    const foodSize = snake.cellSize * (1.0 + bassEnergy * 0.5) * foodPulse;
    const foodX = snake.food.x * snake.cellSize;
    const foodY = snake.food.y * snake.cellSize;
    
    // Food glow effect
    const foodGlow = ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, foodSize * 2);
    const foodHue = (timeRef.current * 20) % 360; // Slower color change (was 30)
    foodGlow.addColorStop(0, `hsla(${foodHue}, 100%, 70%, 0.8)`);
    foodGlow.addColorStop(0.5, `hsla(${foodHue}, 100%, 50%, 0.4)`);
    foodGlow.addColorStop(1, `hsla(${foodHue}, 100%, 40%, 0)`);
    
    ctx.fillStyle = foodGlow;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodSize * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Food core
    ctx.fillStyle = `hsla(${foodHue}, 100%, 70%, 0.9)`;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw targets as subtle cosmic portals - slower animation
    snake.targets.forEach(target => {
      if (target.energy > 0.2) {
        const targetX = target.x * snake.cellSize;
        const targetY = target.y * snake.cellSize;
        const targetSize = snake.cellSize * target.energy;
        
        // Portal effect with slower pulsing
        const portalPulse = 0.9 + Math.sin(timeRef.current * 1.5) * 0.1; // Slower pulse
        const portalGradient = ctx.createRadialGradient(
          targetX, targetY, 0, 
          targetX, targetY, targetSize * 3 * portalPulse
        );
        portalGradient.addColorStop(0, `rgba(100, 100, 255, ${target.energy * 0.1})`);
        portalGradient.addColorStop(0.5, `rgba(50, 50, 150, ${target.energy * 0.05})`);
        portalGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = portalGradient;
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetSize * 3 * portalPulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Portal rings with slower rotation
        ctx.strokeStyle = `rgba(100, 100, 255, ${target.energy * 0.3})`;
        ctx.lineWidth = 1;
        
        // Inner ring
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetSize * portalPulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(targetX, targetY, targetSize * 1.5 * portalPulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    // Draw snake segments with cosmic rainbow effect
    ctx.globalCompositeOperation = 'lighter'; // Make colors blend additively
    
    // Calculate current target size based on growth progress
    const targetLength = Math.max(
      snake.initialSize,
      Math.ceil(snake.initialSize + (snake.maxSegments - snake.initialSize) * (snake.growthProgress / 100))
    );
    
    // Display growth progress for debugging
    // ctx.fillStyle = 'white';
    // ctx.font = '12px Arial';
    // ctx.fillText(`Growth: ${Math.floor(snake.growthProgress)}%, Target: ${targetLength}, Current: ${snake.segments.length}`, 10, 20);
    
    snake.segments.forEach((segment, index) => {
      // Calculate segment progress (0 = head, 1 = tail)
      const progress = index / Math.max(snake.segments.length, 1);
      
      // Calculate hue based on segment index and offset - slower rotation
      const hue = ((index * 12) + (snake.colorOffset * 360)) % 360; // Reduced from 15 to 12
      
      // Interpolate between previous and target positions for smooth movement
      let interpolatedX, interpolatedY;
      
      if (segment.prevX !== undefined && segment.prevY !== undefined) {
        // Use movement progress for interpolation
        interpolatedX = segment.prevX + (segment.x - segment.prevX) * Math.min(1, snake.movementProgress);
        interpolatedY = segment.prevY + (segment.y - segment.prevY) * Math.min(1, snake.movementProgress);
      } else {
        // Fallback if no previous position
        interpolatedX = segment.x;
        interpolatedY = segment.y;
      }
      
      // Calculate segment size (head is larger, tail is smaller)
      const segmentFactor = 1 - progress * 0.5; // Less taper for a more uniform serpent
      
      // Scale segment size based on growth progress - more dramatic growth
      const growthScale = 0.6 + (snake.growthProgress / 100) * 0.8; // 0.6 to 1.4 scale as snake grows (was 0.7 to 1.2)
      let segmentSize = snake.cellSize * segmentFactor * growthScale;
      
      // Apply audio reactivity to segment size
      if (index < snake.segments.length / 3) {
        // Head section reacts to bass
        segmentSize *= 1 + bassEnergy * 0.3;
      } else if (index < snake.segments.length * 2 / 3) {
        // Middle section reacts to mids
        segmentSize *= 1 + midEnergy * 0.3;
      } else {
        // Tail section reacts to highs
        segmentSize *= 1 + highEnergy * 0.3;
      }
      
      // Add tail effect - make tail segments pulse with bass
      if (index > snake.segments.length * 0.7) {
        const tailProgress = (index - snake.segments.length * 0.7) / (snake.segments.length * 0.3);
        segmentSize *= 1 + snake.tailEffect * tailProgress * 0.5;
      }
      
      // Draw segment
      const x = interpolatedX * snake.cellSize;
      const y = interpolatedY * snake.cellSize;
      
      // Segment glow effect - larger for head, smaller for tail
      const glowSize = segmentSize * (2.0 - progress * 0.5) * snake.glowIntensity;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      
      // Glow color based on segment
      const glowOpacity = 0.7 - progress * 0.5; // Head glows more than tail
      glow.addColorStop(0, `hsla(${hue}, 100%, 70%, ${glowOpacity})`);
      glow.addColorStop(0.5, `hsla(${hue}, 100%, 50%, ${glowOpacity * 0.5})`);
      glow.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);
      
      // Draw segment glow
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw segment core - slower pulsing
      const pulseFactor = Math.sin(timeRef.current * 1.5 + segment.pulseOffset) * 10; // Slower pulse (was 2)
      const segmentColor = `hsl(${hue}, 100%, ${60 + pulseFactor}%)`;
      ctx.fillStyle = segmentColor;
      ctx.beginPath();
      ctx.arc(x, y, segmentSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add cosmic details to head
      if (index === 0) {
        // Draw eyes
        const eyeSize = segmentSize * 0.2;
        const eyeOffset = segmentSize * 0.2;
        
        // Eye positions based on direction
        const eyeX1 = x + snake.lastMoveDirection.y * eyeOffset - snake.lastMoveDirection.x * eyeOffset;
        const eyeY1 = y + snake.lastMoveDirection.x * eyeOffset + snake.lastMoveDirection.y * eyeOffset;
        const eyeX2 = x + snake.lastMoveDirection.y * eyeOffset + snake.lastMoveDirection.x * eyeOffset;
        const eyeY2 = y - snake.lastMoveDirection.x * eyeOffset + snake.lastMoveDirection.y * eyeOffset;
        
        // Draw cosmic eyes
        const eyeGlow = ctx.createRadialGradient(eyeX1, eyeY1, 0, eyeX1, eyeY1, eyeSize * 2);
        eyeGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        eyeGlow.addColorStop(0.5, 'rgba(200, 200, 255, 0.5)');
        eyeGlow.addColorStop(1, 'rgba(100, 100, 255, 0)');
        
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY1, eyeSize * 2, 0, Math.PI * 2);
        ctx.arc(eyeX2, eyeY2, eyeSize * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye cores
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
        ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        const pupilColor = `hsl(${(hue + 180) % 360}, 100%, 50%)`;
        ctx.fillStyle = pupilColor;
        ctx.beginPath();
        ctx.arc(eyeX1 + snake.lastMoveDirection.x * eyeSize * 0.3, eyeY1 + snake.lastMoveDirection.y * eyeSize * 0.3, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.arc(eyeX2 + snake.lastMoveDirection.x * eyeSize * 0.3, eyeY2 + snake.lastMoveDirection.y * eyeSize * 0.3, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    // Add cosmic particle effects - fewer particles, slower movement
    const particleCount = Math.floor(30 * overallEnergy); // Reduced from 50 to 30
    for (let i = 0; i < particleCount; i++) {
      // Particles follow the snake
      const segmentIndex = Math.floor(Math.random() * snake.segments.length);
      const segment = snake.segments[segmentIndex];
      
      // Smaller particle spread
      const x = segment.x * snake.cellSize + (Math.random() - 0.5) * snake.cellSize * 3; // Reduced from 4 to 3
      const y = segment.y * snake.cellSize + (Math.random() - 0.5) * snake.cellSize * 3; // Reduced from 4 to 3
      const size = Math.random() * 1.5 + 0.5; // Smaller particles
      
      // Particle color based on segment
      const hue = ((segmentIndex * 12) + (snake.colorOffset * 360)) % 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${Math.random() * 0.4})`; // Lower opacity
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return (
    <div ref={containerRef} className={`visualizer ${RESOLUTIONS[resolution].className}`}>
      {use3D ? (
        <div className="three-visualizer">
          <ThreeVisualizer
            audioData={audioData}
            template={template}
            isPlaying={isPlaying}
            parameters={parameters}
          />
        </div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
});

export default Visualizer; 