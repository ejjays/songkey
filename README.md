# Song Key Changer

A simple tool to change the musical key of audio files without changing the tempo. It uses automatic key detection to figure out the starting point and verify the output.

## Tech
- **Backend**: Node.js, Express, FFmpeg (Rubber Band)
- **Analysis**: Essentia.js (WASM)
- **Frontend**: React, Vite, Bootstrap

## Setup

### Requirements
You need **FFmpeg** installed on your system (with `librubberband` support for best results).

### Installation
1. Clone the repo.
2. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## How to use
1. Upload your song (MP3/WAV/etc).
2. The app will automatically detect the **Original Key**.
3. Select your **Target Key**.
4. Click **Convert Key**.
5. Once done, use the **Verify New Key** button to double-check the result.
