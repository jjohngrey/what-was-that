const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { decode } = require('wav-decoder');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

class AudioFingerprint {
  constructor() {
    this.database = new Map();
  }

  // Generate fingerprint from audio file
  async generateFingerprint(audioPath) {
    let wavPath = null;
    try {
      // Convert to WAV format for processing
      wavPath = await this.convertToWav(audioPath);
      
      // Read and decode WAV file
      const buffer = fs.readFileSync(wavPath);
      const audioData = await decode(buffer);
      
      // Extract features (simplified - using peaks in frequency spectrum)
      const fingerprint = this.extractFeatures(audioData);
      
      // Clean up: delete temporary WAV file if it's different from input
      if (wavPath !== audioPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
        console.log(`Cleaned up temporary file: ${wavPath}`);
      }
      
      return fingerprint;
    } catch (error) {
      // Clean up on error too
      if (wavPath && wavPath !== audioPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
      throw error;
    }
  }

  // Convert any audio to WAV
  convertToWav(inputPath) {
    return new Promise((resolve, reject) => {
      const outputPath = inputPath.replace(/\.\w+$/, '.wav');
      
      ffmpeg(inputPath)
        .toFormat('wav')
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  // Extract audio features with frequency analysis
  extractFeatures(audioData) {
    const samples = audioData.channelData[0]; // Use first channel
    const sampleRate = audioData.sampleRate;
    
    // More sophisticated feature extraction
    const fingerprint = [];
    const windowSize = 512; // Reduced FFT window size for speed
    const hopSize = 2048; // Larger hop for faster processing
    
    let prevSpectrum = null;
    
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      const window = this.applyHannWindow(samples.slice(i, i + windowSize));
      const spectrum = this.simpleFFT(window);
      
      // Extract multiple features for each window
      const features = {
        energy: this.calculateEnergy(window),
        zcr: this.calculateZeroCrossingRate(window),
        spectralCentroid: this.calculateSpectralCentroid(spectrum, sampleRate, windowSize),
        spectralFlux: prevSpectrum ? this.calculateSpectralFluxBetween(spectrum, prevSpectrum) : 0,
        spectralRolloff: this.calculateSpectralRolloff(spectrum, sampleRate, windowSize),
        // Add frequency band energies for more specificity
        subBass: this.getBandEnergy(spectrum, 20, 60, sampleRate, windowSize),
        bass: this.getBandEnergy(spectrum, 60, 250, sampleRate, windowSize),
        lowMid: this.getBandEnergy(spectrum, 250, 500, sampleRate, windowSize),
        mid: this.getBandEnergy(spectrum, 500, 2000, sampleRate, windowSize),
        highMid: this.getBandEnergy(spectrum, 2000, 4000, sampleRate, windowSize),
        presence: this.getBandEnergy(spectrum, 4000, 6000, sampleRate, windowSize),
        brilliance: this.getBandEnergy(spectrum, 6000, 20000, sampleRate, windowSize)
      };
      
      fingerprint.push(features);
      prevSpectrum = spectrum;
    }
    
    return fingerprint;
  }
  
  // Apply Hann window to reduce spectral leakage
  applyHannWindow(samples) {
    const windowed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)));
      windowed[i] = samples[i] * multiplier;
    }
    return windowed;
  }
  
  // Get energy in a specific frequency band
  getBandEnergy(spectrum, lowFreq, highFreq, sampleRate, windowSize) {
    // Map frequency to our reduced spectrum size
    const spectrumSize = spectrum.length;
    const nyquist = sampleRate / 2;
    
    const lowBin = Math.floor((lowFreq / nyquist) * spectrumSize);
    const highBin = Math.ceil((highFreq / nyquist) * spectrumSize);
    
    const startBin = Math.max(0, lowBin);
    const endBin = Math.min(highBin, spectrumSize);
    
    if (startBin >= endBin) return 0;
    
    let energy = 0;
    for (let i = startBin; i < endBin; i++) {
      energy += spectrum[i] * spectrum[i];
    }
    
    return Math.sqrt(energy / (endBin - startBin + 1));
  }

  // Energy (RMS)
  calculateEnergy(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  // Zero Crossing Rate - indicates frequency content
  calculateZeroCrossingRate(samples) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || 
          (samples[i] < 0 && samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }

  // Spectral Centroid - "center of mass" of spectrum (brightness)
  calculateSpectralCentroid(spectrum, sampleRate, windowSize) {
    let weightedSum = 0;
    let sum = 0;
    const nyquist = sampleRate / 2;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i / spectrum.length) * nyquist;
      weightedSum += frequency * spectrum[i];
      sum += spectrum[i];
    }
    
    return sum > 0 ? weightedSum / sum : 0;
  }

  // Spectral Flux - measure of how quickly the spectrum changes between frames
  calculateSpectralFluxBetween(spectrum1, spectrum2) {
    let flux = 0;
    const len = Math.min(spectrum1.length, spectrum2.length);
    
    for (let i = 0; i < len; i++) {
      const diff = spectrum1[i] - spectrum2[i];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux / len);
  }

  // Spectral Rolloff - frequency below which 85% of energy is contained
  calculateSpectralRolloff(spectrum, sampleRate, windowSize) {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0);
    const threshold = 0.85 * totalEnergy;
    const nyquist = sampleRate / 2;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i];
      if (cumulativeEnergy >= threshold) {
        return (i / spectrum.length) * nyquist;
      }
    }
    
    return nyquist;
  }

  // Optimized spectrum calculation - only compute important frequency bins
  simpleFFT(samples) {
    const N = samples.length;
    const numBins = Math.min(128, Math.floor(N / 2)); // Only compute first 128 bins
    const spectrum = new Float32Array(numBins);
    
    // Pre-compute sine/cosine tables for speed
    for (let k = 0; k < numBins; k++) {
      let real = 0;
      let imag = 0;
      const freq = (2 * Math.PI * k) / N;
      
      // Only sample every 4th point for speed (downsampling)
      for (let n = 0; n < N; n += 4) {
        const angle = freq * n;
        real += samples[n] * Math.cos(angle);
        imag -= samples[n] * Math.sin(angle);
      }
      
      // Magnitude
      spectrum[k] = Math.sqrt(real * real + imag * imag) / (N / 4);
    }
    
    return spectrum;
  }

  // Store audio fingerprint
  async storeAudio(audioPath, audioId) {
    const fingerprint = await this.generateFingerprint(audioPath);
    this.database.set(audioId, fingerprint);
    console.log(`Stored fingerprint for: ${audioId}`);
    return fingerprint;
  }

  // Match audio against database
  async matchAudio(audioPath, threshold = 0.85) {
    const unknownFingerprint = await this.generateFingerprint(audioPath);
    
    let bestMatch = null;
    let bestScore = 0;
    let allScores = [];

    for (const [audioId, storedFingerprint] of this.database) {
      const score = this.compareFingerprints(unknownFingerprint, storedFingerprint);
      
      allScores.push({ audioId, score });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = audioId;
      }
    }

    // Sort all scores for debugging
    allScores.sort((a, b) => b.score - a.score);
    console.log('Top 3 matches:', allScores.slice(0, 3));

    if (bestScore >= threshold) {
      return { match: bestMatch, confidence: bestScore, allScores };
    }
    
    return { match: null, confidence: bestScore, allScores };
  }

  // Compare two fingerprints using multiple features
  compareFingerprints(fp1, fp2) {
    const len = Math.min(fp1.length, fp2.length);
    
    // For exact same file, try zero offset first
    let bestScore = this.compareFingerprintsWithOffset(fp1, fp2, 0);
    
    // Try different time alignments to handle offsets (reduced range)
    const maxOffset = Math.min(10, Math.floor(len * 0.05)); // Check only 5% offset
    
    for (let offset = -maxOffset; offset <= maxOffset; offset += 5) {
      if (offset === 0) continue; // Already checked
      const score = this.compareFingerprintsWithOffset(fp1, fp2, offset);
      bestScore = Math.max(bestScore, score);
    }
    
    return bestScore;
  }

  compareFingerprintsWithOffset(fp1, fp2, offset) {
    const len = Math.min(fp1.length, fp2.length) - Math.abs(offset);
    if (len <= 0) return 0;
    
    let totalSimilarity = 0;
    const start1 = Math.max(0, offset);
    const start2 = Math.max(0, -offset);
    
    // Feature weights - frequency bands are MORE discriminative (must sum to 1.0)
    const weights = {
      energy: 0.03,
      zcr: 0.05,
      spectralCentroid: 0.05,
      spectralFlux: 0.04,
      spectralRolloff: 0.04,
      // Frequency bands - these are VERY specific to each audio (increased weights)
      subBass: 0.12,
      bass: 0.14,
      lowMid: 0.13,
      mid: 0.15,
      highMid: 0.11,
      presence: 0.08,
      brilliance: 0.06
    };

    for (let i = 0; i < len; i++) {
      const f1 = fp1[start1 + i];
      const f2 = fp2[start2 + i];
      
      // Compare each feature with stricter penalties
      for (const [feature, weight] of Object.entries(weights)) {
        const v1 = f1[feature] || 0;
        const v2 = f2[feature] || 0;
        
        // Euclidean distance normalized
        const maxVal = Math.max(Math.abs(v1), Math.abs(v2), 0.001);
        const normalizedDiff = Math.abs(v1 - v2) / maxVal;
        
        // Stricter similarity function with exponential penalty
        // Small differences still score high, but larger differences drop faster
        const similarity = Math.exp(-normalizedDiff * 1.5);
        
        totalSimilarity += similarity * weight;
      }
    }

    // Average similarity across all frames
    return totalSimilarity / len;
  }

  // Get all stored audio IDs
  getAllAudioIds() {
    return Array.from(this.database.keys());
  }

  // Delete audio fingerprint
  deleteAudio(audioId) {
    return this.database.delete(audioId);
  }

  // Save database to file
  saveDatabase(filepath) {
    const data = JSON.stringify(Array.from(this.database.entries()));
    fs.writeFileSync(filepath, data);
  }

  // Load database from file
  loadDatabase(filepath) {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      this.database = new Map(JSON.parse(data));
      console.log(`Loaded ${this.database.size} fingerprints from database`);
    }
  }
}

// Initialize fingerprinter
const fingerprinter = new AudioFingerprint();
const FINGERPRINTS_DIR = path.join(__dirname, 'user_fingerprints');
const DB_PATH = path.join(FINGERPRINTS_DIR, 'fingerprints.json');

// Create user_fingerprints directory if it doesn't exist
if (!fs.existsSync(FINGERPRINTS_DIR)) {
  fs.mkdirSync(FINGERPRINTS_DIR, { recursive: true });
  console.log('Created user_fingerprints directory');
}

// Load existing database on startup
fingerprinter.loadDatabase(DB_PATH);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Audio Fingerprinting API',
    endpoints: {
      'POST /api/audio/fingerprint': 'Store an audio fingerprint',
      'POST /api/audio/match': 'Match unknown audio',
      'GET /api/audio/fingerprints': 'Get all stored fingerprints',
      'DELETE /api/audio/fingerprint/:id': 'Delete a fingerprint'
    }
  });
});

// POST: Store an audio fingerprint
// curl -X POST http://localhost:3000/api/audio/fingerprint \
//   -H "Content-Type: application/json" \
//   -d '{"audioFilePath": "./recorded_fingerprints/test.mp3", "audioId": "song2"}'
app.post('/api/audio/fingerprint', async (req, res) => {
  try {
    const { audioFilePath, audioId } = req.body;

    if (!audioFilePath || !audioId) {
      return res.status(400).json({ 
        error: 'audioFilePath and audioId are required' 
      });
    }

    if (!fs.existsSync(audioFilePath)) {
      return res.status(404).json({ 
        error: 'Audio file not found' 
      });
    }

    await fingerprinter.storeAudio(audioFilePath, audioId);
    fingerprinter.saveDatabase(DB_PATH);

    res.json({ 
      success: true, 
      message: `Fingerprint stored for: ${audioId}` 
    });
  } catch (error) {
    console.error('Error storing fingerprint:', error);
    res.status(500).json({ 
      error: 'Failed to store fingerprint', 
      details: error.message 
    });
  }
});

// POST: Match unknown audio
// curl -X POST http://localhost:3000/api/audio/match \
//   -H "Content-Type: application/json" \
//   -d '{"audioFilePath": "./recorded_fingerprints/test3.mp3", "threshold": 0.8}'
app.post('/api/audio/match', async (req, res) => {
  try {
    const { audioFilePath, threshold } = req.body;

    if (!audioFilePath) {
      return res.status(400).json({ 
        error: 'audioFilePath is required' 
      });
    }

    if (!fs.existsSync(audioFilePath)) {
      return res.status(404).json({ 
        error: 'Audio file not found' 
      });
    }

    const result = await fingerprinter.matchAudio(
      audioFilePath, 
      threshold || 0.8
    );

    if (result) {
      res.json({
        success: true,
        match: result.match,
        confidence: result.confidence,
        confidencePercent: `${(result.confidence * 100).toFixed(1)}%`
      });
    } else {
      res.json({
        success: true,
        match: null,
        message: 'No match found'
      });
    }
  } catch (error) {
    console.error('Error matching audio:', error);
    res.status(500).json({ 
      error: 'Failed to match audio', 
      details: error.message 
    });
  }
});

// GET: Retrieve all audio fingerprints
app.get('/api/audio/fingerprints', (req, res) => {
  try {
    const audioIds = fingerprinter.getAllAudioIds();
    res.json({
      success: true,
      count: audioIds.length,
      audioIds: audioIds
    });
  } catch (error) {
    console.error('Error retrieving fingerprints:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve fingerprints', 
      details: error.message 
    });
  }
});

// DELETE: Delete an audio fingerprint
app.delete('/api/audio/fingerprint/:id', (req, res) => {
  try {
    const audioId = req.params.id;
    const deleted = fingerprinter.deleteAudio(audioId);

    if (deleted) {
      fingerprinter.saveDatabase(DB_PATH);
      res.json({
        success: true,
        message: `Fingerprint deleted: ${audioId}`
      });
    } else {
      res.status(404).json({
        error: `Fingerprint not found: ${audioId}`
      });
    }
  } catch (error) {
    console.error('Error deleting fingerprint:', error);
    res.status(500).json({ 
      error: 'Failed to delete fingerprint', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Audio Fingerprinting Server running on http://localhost:${PORT}`);
  console.log(`Loaded ${fingerprinter.database.size} fingerprints from database`);
});