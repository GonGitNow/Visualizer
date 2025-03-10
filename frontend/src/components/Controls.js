import React, { useEffect, useRef, useState } from 'react';
import './Controls.css';

const Controls = ({ isPlaying, onPlayPause, audioElement }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [wasPlaying, setWasPlaying] = useState(false);

  useEffect(() => {
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      // Always update current time when audio updates
      setCurrentTime(audioElement.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
      setCurrentTime(audioElement.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audioElement.duration);
    };

    // Add all event listeners
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('durationchange', handleDurationChange);
    audioElement.addEventListener('seeking', handleTimeUpdate);
    audioElement.addEventListener('seeked', handleTimeUpdate);

    // Set initial values if already loaded
    if (audioElement.duration) {
      setDuration(audioElement.duration);
      setCurrentTime(audioElement.currentTime);
    }

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('durationchange', handleDurationChange);
      audioElement.removeEventListener('seeking', handleTimeUpdate);
      audioElement.removeEventListener('seeked', handleTimeUpdate);
    };
  }, [audioElement]);

  const formatTime = (time) => {
    if (!isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateAudioTime = async (clientX) => {
    if (!audioElement || !progressBarRef.current || !duration) return;

    try {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
      const newTime = pos * duration;
      
      // Ensure audio is loaded before setting time
      if (audioElement.readyState >= 2) {
        audioElement.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        // Wait for audio to be loaded enough
        await new Promise((resolve) => {
          const handleCanPlay = () => {
            audioElement.currentTime = newTime;
            setCurrentTime(newTime);
            audioElement.removeEventListener('canplay', handleCanPlay);
            resolve();
          };
          audioElement.addEventListener('canplay', handleCanPlay);
        });
      }
    } catch (error) {
      console.error('Error updating audio time:', error);
    }
  };

  const handleProgressClick = async (e) => {
    if (isDraggingRef.current) return;
    
    // Remember if it was playing
    setWasPlaying(!audioElement?.paused);
    
    // Pause while seeking
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    }
    
    await updateAudioTime(e.clientX);
  };

  const handleProgressMouseDown = async (e) => {
    if (!audioElement || !duration) return;
    
    // Remember if it was playing
    setWasPlaying(!audioElement.paused);
    
    // Pause audio while scrubbing for better performance
    if (!audioElement.paused) {
      audioElement.pause();
    }
    
    isDraggingRef.current = true;
    await updateAudioTime(e.clientX);
  };

  const handleProgressMouseMove = async (e) => {
    if (!progressBarRef.current || !duration) return;
    
    // Update hover position for time preview
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    setHoverPosition(pos);
    
    if (!isDraggingRef.current) return;
    e.preventDefault();
    await updateAudioTime(e.clientX);
  };

  const handleProgressMouseUp = () => {
    isDraggingRef.current = false;
  };
  
  const handleProgressMouseLeave = () => {
    if (!isDraggingRef.current) {
      setHoverPosition(null);
    }
  };

  useEffect(() => {
    if (isDraggingRef.current) {
      const handleGlobalMouseMove = async (e) => {
        await handleProgressMouseMove(e);
      };
      const handleGlobalMouseUp = async (e) => {
        handleProgressMouseUp();
        await updateAudioTime(e.clientX);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [duration, audioElement]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverTime = hoverPosition !== null ? duration * hoverPosition : null;

  return (
    <div className="controls">
      <div className="playback-info">
        <span className="time">{formatTime(currentTime)}</span>
        <div 
          className="progress-bar"
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          <div 
            className="progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
          <div 
            className="progress-handle"
            style={{ left: `${progressPercentage}%` }}
          />
          {hoverPosition !== null && (
            <div 
              className="time-preview"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
        <span className="time">{formatTime(duration)}</span>
      </div>
      
      <button
        className={`play-pause-button ${isPlaying ? 'playing' : ''}`}
        onClick={onPlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="control-icon">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="control-icon">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
    </div>
  );
};

export default Controls; 