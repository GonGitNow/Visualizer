# Music Visualizer

An interactive web application that creates beautiful visualizations synchronized with your music. Upload your audio files, choose from different visualization templates, and export the result as a video.

## Features

- Upload MP3, WAV, or OGG audio files
- Three different visualization templates:
  - Waveform: Classic waveform visualization
  - Frequency Bars: Vertical frequency bars
  - Circular: Circular frequency visualization
- Real-time audio analysis and visualization
- Play/pause controls
- Export visualization as video with synchronized audio
- Responsive design for all devices

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd music-visualizer
```

2. Install dependencies:
```bash
npm install
cd frontend
npm install
cd ..
```

3. Create an uploads directory:
```bash
mkdir uploads
```

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click the "Upload Audio File" button to select an audio file
2. Choose a visualization template from the available options
3. Click "Play" to start the visualization
4. Use the "Record Video" button to capture the visualization with audio
5. The video will automatically download when recording is stopped

## Technical Details

- Frontend: React.js
- Backend: Node.js with Express
- Audio Processing: Web Audio API
- Visualization: HTML5 Canvas
- Video Recording: MediaRecorder API

## Browser Support

The application works best in modern browsers that support:
- Web Audio API
- MediaRecorder API
- Canvas API
- ES6+ JavaScript features

## License

MIT License 