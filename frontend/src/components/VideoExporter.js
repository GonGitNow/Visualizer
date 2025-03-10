import React, { useRef, useState, useEffect } from 'react';
import './VideoExporter.css';

// Import RESOLUTIONS from Visualizer
const RESOLUTIONS = {
  '4K': { width: 3840, height: 2160, className: 'aspect-ratio-4k' },
  '1080p': { width: 1920, height: 1080, className: 'aspect-ratio-1080p' },
  '720p': { width: 1280, height: 720, className: 'aspect-ratio-720p' },
  'Square': { width: 720, height: 720, className: 'aspect-ratio-square' },
  'Vertical': { width: 1080, height: 1920, className: 'aspect-ratio-vertical' }
};

const VideoExporter = ({ visualizerRef, audioFile, isPlaying, audioRef }) => {
  // Add debug logging for audioFile prop
  useEffect(() => {
    console.log('VideoExporter: audioFile prop changed:', audioFile);
  }, [audioFile]);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const audioDestinationRef = useRef(null);
  const streamRef = useRef(null);
  const exportFileNameRef = useRef(null);

  // Cleanup function to ensure all resources are properly released
  const cleanup = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioDestinationRef.current) {
      audioDestinationRef.current.disconnect();
      audioDestinationRef.current = null;
    }
    
    chunksRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  const ensureAudioReady = async (audioElement) => {
    return new Promise((resolve, reject) => {
      if (audioElement.readyState >= 2) {
        console.log('Audio already ready');
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Audio loading timeout'));
      }, 5000); // 5 second timeout

      const loadHandler = () => {
        console.log('Audio loaded successfully');
        clearTimeout(timeout);
        resolve();
      };

      const errorHandler = (error) => {
        console.error('Audio load error:', error);
        clearTimeout(timeout);
        reject(error);
      };

      audioElement.addEventListener('canplaythrough', loadHandler, { once: true });
      audioElement.addEventListener('error', errorHandler, { once: true });
      
      // Force load if not already loading
      if (audioElement.readyState === 0) {
        audioElement.load();
      }
    });
  };

  const exportVideo = async () => {
    // Add debug logging at the start of export
    console.log('Starting export with audioFile:', audioFile);
    console.log('Visualizer ref:', visualizerRef?.current);
    console.log('Audio ref:', audioRef?.current);

    // Add more robust checks for audioFile
    if (!visualizerRef?.current) {
      setError('Visualizer not initialized');
      return;
    }

    if (!audioFile) {
      console.error('No audio file provided');
      setError('Please upload a valid audio file');
      return;
    }

    if (!audioFile.filename) {
      console.error('Audio file missing filename property:', audioFile);
      setError('Invalid audio file format');
      return;
    }

    if (isExporting) {
      setError('Export already in progress');
      return;
    }

    try {
      cleanup();
      setIsExporting(true);
      setProgress(0);
      setError(null);
      startTimeRef.current = Date.now();

      // Store the filename at the start with additional safety check
      const baseFileName = audioFile.filename || 'export';
      exportFileNameRef.current = baseFileName.replace(/\.[^/.]+$/, '') + '_visualization.webm';

      // Get the canvas - handle both 2D and 3D visualizations
      let canvas;
      if (visualizerRef.current.getCanvas) {
        canvas = visualizerRef.current.getCanvas();
      } else if (visualizerRef.current.getDomElement) {
        canvas = visualizerRef.current.getDomElement();
      }

      if (!canvas) {
        throw new Error('Canvas not found. Please ensure the visualizer is properly initialized.');
      }

      // Get the current resolution from the visualizer
      const resolution = visualizerRef.current.getCurrentResolution();
      const { width, height } = RESOLUTIONS[resolution];

      // Set canvas to full resolution for export
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      canvas.width = width;
      canvas.height = height;

      // Get audio element from ref
      const audioElement = audioRef.current;
      if (!audioElement) {
        throw new Error('Audio element not found. Please ensure audio is loaded and playing.');
      }

      // Ensure audio is ready
      console.log('Audio element found, ensuring it\'s ready...');
      await ensureAudioReady(audioElement);
      console.log('Audio is ready for export');

      // Get the existing audio context and source from the visualizer
      const audioContext = visualizerRef.current.getAudioContext();
      const audioSource = visualizerRef.current.getAudioSource();
      
      if (!audioContext || !audioSource) {
        throw new Error('Audio context or source not found in visualizer');
      }

      // Create a new destination for recording
      const audioDestination = audioContext.createMediaStreamDestination();
      audioDestinationRef.current = audioDestination;

      // Connect the existing source to our new destination
      audioSource.connect(audioDestination);

      // Setup canvas stream
      const canvasStream = canvas.captureStream(60); // 60 FPS for highest quality
      streamRef.current = canvasStream;

      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ]);

      // Setup MediaRecorder with highest quality settings
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 8000000, // 8 Mbps
        audioBitsPerSecond: 320000    // 320 kbps
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Setup recording completion handler
      mediaRecorder.onstop = () => {
        if (audioElement) {
          audioElement.removeEventListener('ended', handleAudioEnd);
          audioElement.pause();
          audioElement.currentTime = 0;
        }

        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Use the stored filename
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFileNameRef.current;
        a.click();

        // Cleanup
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setProgress(100);

        // Restore original canvas size
        if (canvas) {
          canvas.width = originalWidth;
          canvas.height = originalHeight;
        }

        cleanup();
      };

      // Update progress
      const progressInterval = setInterval(() => {
        if (audioElement.duration) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const percentage = Math.min(Math.floor((elapsed / audioElement.duration) * 100), 100);
          setProgress(percentage);

          // Stop recording when we reach the end of the audio
          if (elapsed >= audioElement.duration) {
            clearInterval(progressInterval);
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }
        }
      }, 100);

      // Handle audio end
      const handleAudioEnd = () => {
        clearInterval(progressInterval);
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      };

      // Add event listener for audio end
      audioElement.addEventListener('ended', handleAudioEnd);

      // Start recording
      mediaRecorder.start(1000);

      // Start playback
      audioElement.currentTime = 0;
      await audioElement.play();

    } catch (error) {
      console.error('Export error:', error);
      setError(error.message);
      setIsExporting(false);
      cleanup();
    }
  };

  return (
    <div className="video-exporter">
      {isExporting ? (
        <div className="export-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{progress}% Exporting...</div>
        </div>
      ) : (
        <button
          className="export-button"
          onClick={exportVideo}
          disabled={!visualizerRef || !audioFile || isPlaying}
          title={!audioFile ? 'Please upload an audio file first' : ''}
        >
          Export Video
        </button>
      )}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default VideoExporter; 