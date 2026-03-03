const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const wav = require('wav-decoder');
const Essentia = require('essentia.js');
const essentia = new Essentia.Essentia(Essentia.EssentiaWASM);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const keyMap = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const detectKeyFromFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const tempWavPath = path.join(uploadDir, `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`);

        ffmpeg(filePath)
            .toFormat('wav')
            .audioChannels(1)
            .audioFrequency(44100)
            .on('end', () => {
                const buffer = fs.readFileSync(tempWavPath);
                wav.decode(buffer).then((audioData) => {
                    const audioVector = essentia.arrayToVector(audioData.channelData[0]);
                    const result = essentia.KeyExtractor(audioVector);
                    
                    audioVector.delete();
                    fs.unlink(tempWavPath, () => {});
                    
                    resolve({ key: result.key, scale: result.scale });
                }).catch((err) => {
                    fs.unlink(tempWavPath, () => {});
                    reject(err);
                });
            })
            .on('error', (err) => {
                fs.unlink(tempWavPath, () => {});
                reject(err);
            })
            .save(tempWavPath);
    });
};

app.post('/api/detect', upload.single('song'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const result = await detectKeyFromFile(req.file.path);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Audio analysis failed' });
    } finally {
        fs.unlink(req.file.path, () => {});
    }
});

app.get('/api/detect-processed/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(processedDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    try {
        const result = await detectKeyFromFile(filePath);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Analysis failed' });
    }
});

app.post('/api/convert', upload.single('song'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalKey, targetKey } = req.body;

    if (!originalKey || !targetKey || keyMap[originalKey] === undefined || keyMap[targetKey] === undefined) {
        return res.status(400).json({ error: 'Invalid keys provided' });
    }

    const originalVal = keyMap[originalKey];
    const targetVal = keyMap[targetKey];
    
    let semitones = targetVal - originalVal;
    
    if (semitones > 6) semitones -= 12;
    if (semitones < -6) semitones += 12;

    const pitchScale = Math.pow(2, semitones / 12);

    const inputPath = req.file.path;
    const outputFilename = `converted-${Date.now()}-${req.file.originalname}`;
    const outputPath = path.join(processedDir, outputFilename);

    ffmpeg(inputPath)
        .audioFilters(`rubberband=pitch=${pitchScale}`) 
        .on('end', () => {
            res.json({ 
                success: true, 
                downloadUrl: `http://localhost:${port}/download/${outputFilename}` 
            });
            fs.unlink(inputPath, (err) => {});
        })
        .on('error', (err) => {
            res.status(500).json({ error: 'Conversion failed', details: err.message });
             fs.unlink(inputPath, (err) => {});
        })
        .save(outputPath);
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(processedDir, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {});
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});