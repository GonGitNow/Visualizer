import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ThreeVisualizer = ({ audioData, template, isPlaying, parameters: initialParameters = {} }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef(null);
  const waveformRef = useRef(null);
  const timeRef = useRef(0);
  const controlsRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [parameters, setParameters] = useState(initialParameters);

  console.log("ThreeVisualizer rendering with template:", template);
  console.log("Audio data:", audioData);
  console.log("Is playing:", isPlaying);
  console.log("Parameters:", parameters);

  // Update parameters when initialParameters change
  useEffect(() => {
    console.log("ThreeVisualizer received updated parameters:", initialParameters);
    if (initialParameters && Object.keys(initialParameters).length > 0) {
      setParameters(initialParameters);
      // No need to restart animation - parameters will be picked up in next frame
    }
  }, [initialParameters]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    console.log("Initializing Three.js scene");

    try {
      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5;
      cameraRef.current = camera;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setClearColor(0x000000, 1);
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Add class to canvas for easier selection
      renderer.domElement.classList.add('three-canvas');

      // Add orbit controls for user interaction
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.5;
      controlsRef.current = controls;

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      // Handle window resize
      const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);
      
      // Initial render
      renderer.render(scene, camera);
      setIsInitialized(true);
      
      console.log("Three.js scene initialized successfully");

      // Clean up
      return () => {
        console.log("Cleaning up Three.js scene");
        window.removeEventListener('resize', handleResize);
        
        if (rendererRef.current && mountRef.current) {
          try {
            mountRef.current.removeChild(rendererRef.current.domElement);
          } catch (error) {
            console.error("Error removing renderer:", error);
          }
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Dispose of Three.js objects
        if (particlesRef.current) {
          try {
            particlesRef.current.geometry.dispose();
            particlesRef.current.material.dispose();
            sceneRef.current.remove(particlesRef.current);
          } catch (error) {
            console.error("Error disposing particles:", error);
          }
        }
        
        if (waveformRef.current) {
          try {
            waveformRef.current.geometry.dispose();
            waveformRef.current.material.dispose();
            sceneRef.current.remove(waveformRef.current);
          } catch (error) {
            console.error("Error disposing waveform:", error);
          }
        }
        
        setIsInitialized(false);
      };
    } catch (error) {
      console.error("Error initializing Three.js:", error);
    }
  }, []);

  // Create or update visualization based on template
  useEffect(() => {
    if (!isInitialized || !sceneRef.current) {
      console.log("Scene not initialized yet, skipping visualization creation");
      return;
    }
    
    console.log("Creating visualization for template:", template);

    try {
      // Clear previous visualizations
      if (particlesRef.current) {
        particlesRef.current.geometry.dispose();
        particlesRef.current.material.dispose();
        sceneRef.current.remove(particlesRef.current);
        particlesRef.current = null;
      }

      if (waveformRef.current) {
        waveformRef.current.geometry.dispose();
        waveformRef.current.material.dispose();
        sceneRef.current.remove(waveformRef.current);
        waveformRef.current = null;
      }

      // Create new visualization based on template
      switch (template) {
        case 'particles':
          createParticleSystem();
          break;
        case 'waveform':
          createWaveform();
          break;
        case 'spiral':
          createSpiral();
          break;
        case 'kaleidoscope':
          createKaleidoscope();
          break;
        default:
          console.log("Unknown template, defaulting to particles");
          createParticleSystem();
      }
      
      console.log("Visualization created successfully");

      // Start animation if playing
      if (isPlaying) {
        animate();
      }
    } catch (error) {
      console.error("Error creating visualization:", error);
    }
  }, [template, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    console.log("Play state changed:", isPlaying);
    
    if (!isInitialized) {
      console.log("Scene not initialized yet, skipping animation");
      return;
    }

    if (isPlaying) {
      console.log("Starting animation");
      animate();
    } else if (animationFrameRef.current) {
      console.log("Stopping animation");
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying, isInitialized]);

  // Create particle system visualization
  const createParticleSystem = () => {
    console.log("Creating particle system");
    
    try {
      // Use count parameter to determine particle count
      const particleCount = Math.floor(((parameters.count || 50) / 50) * 5000);
      const particles = new THREE.BufferGeometry();
      
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      // Use color from parameters
      const baseColor = parameters.color ? new THREE.Color(parameters.color) : new THREE.Color(0xffffff);
      
      for (let i = 0; i < particleCount; i++) {
        // Position particles in a sphere
        const radius = 3 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        
        // Random colors based on parameter color
        const color = baseColor.clone().offsetHSL((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.3);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // Random sizes based on size parameter
        sizes[i] = (Math.random() * 0.5 + 0.5) * ((parameters.size || 50) / 25);
      }
      
      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      // Use simpler material for better compatibility
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const particleSystem = new THREE.Points(particles, particleMaterial);
      
      // Store parameters for animation
      particleSystem.userData.rotationSpeed = {
        x: 0.001 * ((parameters.speed || 50) / 50),
        y: 0.002 * ((parameters.speed || 50) / 50)
      };
      particleSystem.userData.reactivity = (parameters.reactivity || 50) / 50;
      
      sceneRef.current.add(particleSystem);
      particlesRef.current = particleSystem;
      
      console.log("Particle system created successfully");
    } catch (error) {
      console.error("Error creating particle system:", error);
    }
  };

  // Create waveform visualization
  const createWaveform = () => {
    console.log("Creating waveform");
    
    try {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(128 * 3);
      const colors = new Float32Array(128 * 3);
      
      // Use color from parameters
      const baseColor = parameters.color ? new THREE.Color(parameters.color) : new THREE.Color(0x00aaff);
      
      for (let i = 0; i < 128; i++) {
        const x = (i / 128) * 10 - 5;
        vertices[i * 3] = x;
        vertices[i * 3 + 1] = 0;
        vertices[i * 3 + 2] = 0;
        
        // Color gradient based on parameter color
        const hue = i / 128;
        const color = baseColor.clone().offsetHSL(hue * 0.3, 0, 0); // Slight hue variation
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: parameters.lineWidth || 2,
      });
      
      const waveform = new THREE.Line(geometry, material);
      
      // Store reactivity for animation
      waveform.userData.reactivity = (parameters.reactivity || 50) / 50;
      
      // Store height parameter
      waveform.userData.height = (parameters.height || 50) / 50;
      
      sceneRef.current.add(waveform);
      waveformRef.current = waveform;
      
      console.log("Waveform created successfully");
    } catch (error) {
      console.error("Error creating waveform:", error);
    }
  };

  // Create spiral visualization
  const createSpiral = () => {
    console.log("Creating spiral");
    
    try {
      const geometry = new THREE.BufferGeometry();
      const armCount = parameters.arms || 5;
      const pointsPerArm = 400;
      const totalPoints = armCount * pointsPerArm;
      const vertices = new Float32Array(totalPoints * 3);
      const colors = new Float32Array(totalPoints * 3);
      
      // Use color from parameters
      const baseColor = parameters.color ? new THREE.Color(parameters.color) : new THREE.Color(0x00ff99);
      
      // Create spiral with multiple arms
      for (let arm = 0; arm < armCount; arm++) {
        const armAngle = (arm / armCount) * Math.PI * 2;
        
        for (let i = 0; i < pointsPerArm; i++) {
          const index = (arm * pointsPerArm + i) * 3;
          const t = i / pointsPerArm;
          const angle = armAngle + t * Math.PI * 20;
          const radius = t * 5;
          
          vertices[index] = Math.cos(angle) * radius;
          vertices[index + 1] = Math.sin(angle) * radius;
          vertices[index + 2] = t * 2 - 1;
          
          // Color gradient based on parameter color
          const color = baseColor.clone().offsetHSL(t * 0.5, 0, 0); // Hue variation along spiral
          colors[index] = color.r;
          colors[index + 1] = color.g;
          colors[index + 2] = color.b;
        }
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      
      const spiral = new THREE.Points(geometry, material);
      
      // Store parameters for animation
      spiral.userData.rotationSpeed = 0.005 * ((parameters.speed || 50) / 50);
      spiral.userData.reactivity = (parameters.reactivity || 50) / 50;
      
      // Apply radius parameter
      const scale = (parameters.radius || 50) / 50;
      spiral.scale.set(scale, scale, scale);
      
      sceneRef.current.add(spiral);
      particlesRef.current = spiral;
      
      console.log("Spiral created successfully");
    } catch (error) {
      console.error("Error creating spiral:", error);
    }
  };

  // Create kaleidoscope visualization
  const createKaleidoscope = () => {
    console.log("Creating kaleidoscope");
    
    try {
      // Create a simpler geometry for better compatibility
      const geometry = new THREE.IcosahedronGeometry(2, 2);
      
      // Use MeshPhongMaterial for better color control
      const material = new THREE.MeshPhongMaterial({
        color: parameters.color || 0xffffff,
        wireframe: true,
        emissive: parameters.color ? new THREE.Color(parameters.color).multiplyScalar(0.5) : 0x444444,
        specular: 0xffffff,
        shininess: 100,
      });
      
      const kaleidoscope = new THREE.Mesh(geometry, material);
      
      // Store base scale for reactivity
      kaleidoscope.userData.baseScale = 0.5 + ((parameters.complexity || 50) / 100);
      kaleidoscope.scale.set(
        kaleidoscope.userData.baseScale,
        kaleidoscope.userData.baseScale,
        kaleidoscope.userData.baseScale
      );
      
      // Store rotation speed
      kaleidoscope.userData.rotationSpeed = {
        x: 0.005 * ((parameters.speed || 50) / 50),
        y: 0.01 * ((parameters.speed || 50) / 50)
      };
      
      sceneRef.current.add(kaleidoscope);
      particlesRef.current = kaleidoscope;
      
      console.log("Kaleidoscope created successfully");
    } catch (error) {
      console.error("Error creating kaleidoscope:", error);
    }
  };

  // Apply parameters to the visualizations
  useEffect(() => {
    if (!isInitialized || !sceneRef.current || !particlesRef.current) return;
    
    console.log("Applying parameters to 3D visualization:", parameters);
    
    try {
      // Apply common parameters
      const reactivity = (parameters.reactivity || 50) / 50; // Convert to 0-2 scale
      const speed = (parameters.speed || 50) / 50; // Convert to 0-2 scale
      
      // Apply color if available
      if (parameters.color && particlesRef.current.material) {
        // Convert hex color to THREE.Color
        const color = new THREE.Color(parameters.color);
        
        // Apply color based on material type
        if (particlesRef.current.material.color) {
          particlesRef.current.material.color.set(color);
        } else if (particlesRef.current.material.emissive) {
          particlesRef.current.material.emissive.set(color);
        }
      }
      
      // Apply template-specific parameters
      switch (template) {
        case 'particles':
          // Apply particle count
          if (parameters.count && particlesRef.current.geometry.attributes.size) {
            // Can't change particle count dynamically, but we can hide some
            const count = Math.floor((parameters.count / 100) * particlesRef.current.geometry.attributes.position.count);
            const sizes = particlesRef.current.geometry.attributes.size.array;
            
            for (let i = 0; i < sizes.length; i++) {
              sizes[i] = i < count ? (parameters.size || 50) / 5 : 0;
            }
            
            particlesRef.current.geometry.attributes.size.needsUpdate = true;
          }
          
          // Apply size
          if (parameters.size && particlesRef.current.geometry.attributes.size) {
            const sizes = particlesRef.current.geometry.attributes.size.array;
            const count = Math.floor((parameters.count || 50) / 100 * sizes.length);
            
            for (let i = 0; i < count; i++) {
              sizes[i] = (Math.random() * 0.5 + 0.5) * (parameters.size / 25);
            }
            
            particlesRef.current.geometry.attributes.size.needsUpdate = true;
          }
          break;
          
        case 'kaleidoscope':
          // Apply complexity
          if (parameters.complexity && particlesRef.current.geometry) {
            // Can't change geometry complexity dynamically, but we can scale it
            const scale = 0.5 + (parameters.complexity / 100);
            particlesRef.current.userData.baseScale = scale;
            particlesRef.current.scale.set(scale, scale, scale);
          }
          break;
          
        case 'spiral':
          // Apply arms count
          if (parameters.arms && particlesRef.current.geometry) {
            // Can't change arms dynamically, but we can adjust rotation speed
            const rotationSpeed = 0.005 * (parameters.arms / 5);
            particlesRef.current.userData.rotationSpeed = rotationSpeed;
          }
          
          // Apply radius
          if (parameters.radius && particlesRef.current.geometry) {
            const scale = parameters.radius / 50;
            particlesRef.current.scale.set(scale, scale, scale);
          }
          break;
          
        case 'waveform':
          // Apply line width
          if (parameters.lineWidth && particlesRef.current.material) {
            particlesRef.current.material.linewidth = parameters.lineWidth;
          }
          break;
      }
      
      // Store reactivity and speed in userData for use in animation
      particlesRef.current.userData.reactivity = reactivity;
      particlesRef.current.userData.speed = speed;
      
    } catch (error) {
      console.error("Error applying parameters:", error);
    }
  }, [parameters, template, isInitialized]);

  // Animation loop
  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
      console.log("Missing required refs for animation");
      return;
    }
    
    try {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      timeRef.current += 0.01;
      
      // Update based on template
      if (particlesRef.current) {
        if (template === 'particles') {
          // Use stored rotation speeds
          const rotationSpeed = particlesRef.current.userData.rotationSpeed || { x: 0.001, y: 0.002 };
          particlesRef.current.rotation.y += rotationSpeed.y;
          particlesRef.current.rotation.x += rotationSpeed.x;
          
          // Apply audio reactivity if available
          if (audioData && audioData.dataArray && particlesRef.current.geometry.attributes.size) {
            const sizes = particlesRef.current.geometry.attributes.size.array;
            const reactivity = particlesRef.current.userData.reactivity || 1;
            
            for (let i = 0; i < sizes.length; i++) {
              const dataIndex = i % Math.min(128, audioData.dataArray.length);
              const audioValue = audioData.dataArray[dataIndex] / 255;
              const baseSize = sizes[i] / (1 + reactivity); // Get base size without reactivity
              
              // Apply reactivity
              sizes[i] = baseSize * (1 + audioValue * reactivity);
            }
            
            particlesRef.current.geometry.attributes.size.needsUpdate = true;
          }
        } else if (template === 'spiral') {
          // Use stored rotation speed
          const rotationSpeed = particlesRef.current.userData.rotationSpeed || 0.005;
          particlesRef.current.rotation.z += rotationSpeed;
          
          // Apply audio reactivity if available
          if (audioData && audioData.dataArray && particlesRef.current.geometry.attributes.position) {
            const positions = particlesRef.current.geometry.attributes.position.array;
            const originalPositions = particlesRef.current.userData.originalPositions;
            const reactivity = particlesRef.current.userData.reactivity || 1;
            
            // Store original positions if not already stored
            if (!originalPositions) {
              particlesRef.current.userData.originalPositions = new Float32Array(positions.length);
              for (let i = 0; i < positions.length; i++) {
                particlesRef.current.userData.originalPositions[i] = positions[i];
              }
            }
            
            // Apply audio reactivity
            for (let i = 0; i < positions.length / 3; i++) {
              const dataIndex = i % Math.min(128, audioData.dataArray.length);
              const audioValue = audioData.dataArray[dataIndex] / 255 * reactivity;
              
              if (originalPositions) {
                positions[i * 3] = originalPositions[i * 3] * (1 + audioValue * 0.3);
                positions[i * 3 + 1] = originalPositions[i * 3 + 1] * (1 + audioValue * 0.3);
              }
            }
            
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
          }
        } else if (template === 'kaleidoscope') {
          // Use stored rotation speeds
          const rotationSpeed = particlesRef.current.userData.rotationSpeed || { x: 0.005, y: 0.01 };
          particlesRef.current.rotation.x += rotationSpeed.x;
          particlesRef.current.rotation.y += rotationSpeed.y;
          
          // Scale based on audio if available
          if (audioData && audioData.dataArray) {
            let avgAudio = 0;
            for (let i = 0; i < Math.min(128, audioData.dataArray.length); i++) {
              avgAudio += audioData.dataArray[i];
            }
            avgAudio = avgAudio / Math.min(128, audioData.dataArray.length) / 255;
            
            // Apply reactivity parameter
            const reactivity = particlesRef.current.userData.reactivity || 1;
            avgAudio *= reactivity;
            
            const baseScale = particlesRef.current.userData.baseScale || 1;
            particlesRef.current.scale.set(
              baseScale * (1 + avgAudio),
              baseScale * (1 + avgAudio),
              baseScale * (1 + avgAudio)
            );
          }
        }
      }
      
      // Update waveform if available
      if (waveformRef.current && audioData && audioData.dataArray) {
        const positions = waveformRef.current.geometry.attributes.position.array;
        const reactivity = waveformRef.current.userData.reactivity || 1;
        const height = waveformRef.current.userData.height || 1;
        
        for (let i = 0; i < Math.min(128, audioData.dataArray.length); i++) {
          positions[i * 3 + 1] = (audioData.dataArray[i] / 128) * 2 * reactivity * height - 1;
        }
        
        waveformRef.current.geometry.attributes.position.needsUpdate = true;
      }
      
      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Render scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    } catch (error) {
      console.error("Error in animation loop:", error);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return <div ref={mountRef} className="three-visualizer-container" style={{ width: '100%', height: '100%' }} />;
};

export default ThreeVisualizer; 