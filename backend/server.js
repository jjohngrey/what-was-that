const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { decode } = require('wav-decoder');
const path = require('path');
const { Expo } = require('expo-server-sdk');
const os = require('os');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'recorded_fingerprints');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|aac|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');
    
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// Initialize Expo push notification client
const expo = new Expo();

// Store device push tokens with persistence
const DEVICE_TOKENS_PATH = path.join(__dirname, 'device_tokens.json');
const deviceTokens = new Map(); // Map<userId, pushToken>

// Load device tokens from file on startup
function loadDeviceTokens() {
  try {
    if (fs.existsSync(DEVICE_TOKENS_PATH)) {
      const data = fs.readFileSync(DEVICE_TOKENS_PATH, 'utf8');
      const tokens = JSON.parse(data);
      Object.entries(tokens).forEach(([userId, token]) => {
        deviceTokens.set(userId, token);
      });
      console.log(`📱 Loaded ${deviceTokens.size} device token(s) from storage`);
    }
  } catch (error) {
    console.error('Error loading device tokens:', error.message);
  }
}

// Save device tokens to file
function saveDeviceTokens() {
  try {
    const tokens = Object.fromEntries(deviceTokens);
    fs.writeFileSync(DEVICE_TOKENS_PATH, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving device tokens:', error.message);
  }
}

// Load tokens on startup
loadDeviceTokens();

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
      // If already a WAV file, just return the path
      if (inputPath.toLowerCase().endsWith('.wav')) {
        resolve(inputPath);
        return;
      }

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

  // Store audio fingerprint with userId
  async storeAudio(audioPath, audioId, userId) {
    const fingerprint = await this.generateFingerprint(audioPath);
    this.database.set(audioId, {
      fingerprint,
      userId,
      timestamp: new Date().toISOString()
    });
    console.log(`Stored fingerprint for: ${audioId} (user: ${userId})`);
    return fingerprint;
  }

  // Match audio against database (optionally filter by userId)
  async matchAudio(audioPath, threshold = 0.85, userId = null) {
    const unknownFingerprint = await this.generateFingerprint(audioPath);
    
    let bestMatch = null;
    let bestScore = 0;
    let allScores = [];

    for (const [audioId, storedData] of this.database) {
      // Filter by userId if provided
      if (userId && storedData.userId !== userId) {
        continue;
      }
      
      const storedFingerprint = storedData.fingerprint || storedData; // Handle old format
      const score = this.compareFingerprints(unknownFingerprint, storedFingerprint);
      
      allScores.push({ 
        audioId, 
        score,
        userId: storedData.userId || 'unknown'
      });
      
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

  // Get all stored audio IDs (optionally filter by userId)
  getAllAudioIds(userId = null) {
    if (userId) {
      const filtered = [];
      for (const [audioId, storedData] of this.database) {
        if (storedData.userId === userId) {
          filtered.push(audioId);
        }
      }
      return filtered;
    }
    return Array.from(this.database.keys());
  }

  // Get all fingerprints with full details (optionally filter by userId)
  getAllFingerprints(userId = null) {
    const results = [];
    for (const [audioId, storedData] of this.database) {
      // Filter by userId if provided
      if (userId && storedData.userId !== userId) {
        continue;
      }

      // Handle both old format (just fingerprint) and new format (object with userId)
      const fingerprintData = storedData.fingerprint || storedData;
      const userData = storedData.userId || null;
      const timestamp = storedData.timestamp || null;

      results.push({
        audioId,
        userId: userData,
        timestamp,
        fingerprintLength: Array.isArray(fingerprintData) ? fingerprintData.length : 0
      });
    }
    return results;
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

// ============================
// Push Notification Functions
// ============================

async function sendPushNotification(userId, title, body, data = {}) {
  const pushToken = deviceTokens.get(userId);
  
  if (!pushToken) {
    console.log(`No push token found for user: ${userId}`);
    return { success: false, error: 'No push token registered' };
  }

  // Check that the token is valid
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { success: false, error: 'Invalid push token' };
  }

  // Construct the notification message
  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log(`Push notification sent to ${userId}:`, ticket);
    return { success: true, ticket };
  } catch (error) {
    console.error(`Error sending push notification to ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Audio Fingerprinting API',
    endpoints: {
      'POST /api/audio/fingerprint': 'Store an audio fingerprint',
      'POST /api/audio/match': 'Match unknown audio',
      'GET /api/audio/fingerprints': 'Get all stored fingerprints',
      'DELETE /api/audio/fingerprint/:id': 'Delete a fingerprint',
      'POST /api/notifications/register': 'Register device for push notifications',
      'POST /api/notifications/test': 'Send a test notification',
      'GET /api/notifications/devices': 'List all registered devices',
      'DELETE /api/notifications/device/:userId': 'Remove a specific device',
      'DELETE /api/notifications/devices/clear': 'Clear all registered devices'
    }
  });
});

// POST: Store an audio fingerprint
// curl -X POST http://localhost:3000/api/audio/fingerprint \
//   -H "Content-Type: application/json" \
//   -d '{"audioFilePath": "./recorded_fingerprints/test.mp3", "audioId": "song2", "userId": "johns-iphone-abc123"}'
app.post('/api/audio/fingerprint', async (req, res) => {
  try {
    const { audioFilePath, audioId, userId } = req.body;

    if (!audioFilePath || !audioId || !userId) {
      return res.status(400).json({ 
        error: 'audioFilePath, audioId, and userId are required' 
      });
    }

    if (!fs.existsSync(audioFilePath)) {
      return res.status(404).json({ 
        error: 'Audio file not found' 
      });
    }

    await fingerprinter.storeAudio(audioFilePath, audioId, userId);
    fingerprinter.saveDatabase(DB_PATH);

    res.json({ 
      success: true, 
      message: `Fingerprint stored for: ${audioId} (user: ${userId})` 
    });
  } catch (error) {
    console.error('Error storing fingerprint:', error);
    res.status(500).json({ 
      error: 'Failed to store fingerprint', 
      details: error.message 
    });
  }
});

// POST: Upload and fingerprint audio file
// This endpoint accepts a file upload from the mobile app
app.post('/api/audio/upload', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { audioId, userId } = req.body;

    if (!audioId || !userId) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'audioId and userId are required' 
      });
    }

    const audioFilePath = req.file.path;
    console.log(`📤 Received audio upload: ${req.file.filename} from user: ${userId}`);

    // Convert to MP3 if not already MP3
    let mp3FilePath = audioFilePath;
    const fileExtension = path.extname(req.file.filename).toLowerCase();
    
    if (fileExtension !== '.mp3') {
      console.log(`🔄 Converting ${fileExtension} to MP3...`);
      mp3FilePath = audioFilePath.replace(fileExtension, '.mp3');
      
      await new Promise((resolve, reject) => {
        ffmpeg(audioFilePath)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate('192k')
          .on('end', () => {
            console.log('✅ Conversion to MP3 complete');
            // Delete original file after successful conversion
            try {
              fs.unlinkSync(audioFilePath);
              console.log(`🗑️  Deleted original file: ${path.basename(audioFilePath)}`);
            } catch (e) {
              console.error('Warning: Could not delete original file:', e.message);
            }
            resolve();
          })
          .on('error', (err) => {
            console.error('❌ FFmpeg conversion error:', err);
            reject(err);
          })
          .save(mp3FilePath);
      });
    }

    // Create fingerprint from MP3 file
    await fingerprinter.storeAudio(mp3FilePath, audioId, userId);
    fingerprinter.saveDatabase(DB_PATH);

    res.json({ 
      success: true, 
      message: `Audio fingerprint created for: ${audioId}`,
      audioId,
      userId,
      filename: path.basename(mp3FilePath),
      format: 'mp3'
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    // Clean up files on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
      
      // Also try to delete MP3 if it was created
      try {
        const mp3Path = req.file.path.replace(path.extname(req.file.path), '.mp3');
        if (fs.existsSync(mp3Path)) {
          fs.unlinkSync(mp3Path);
        }
      } catch (e) {}
    }
    res.status(500).json({ 
      error: 'Failed to process audio upload', 
      details: error.message 
    });
  }
});

// POST: Match unknown audio
// curl -X POST http://localhost:3000/api/audio/match \
//   -H "Content-Type: application/json" \
//   -d '{"audioFilePath": "./recorded_fingerprints/test3.mp3", "threshold": 0.8, "userId": "user123", "matchOwnOnly": true}'
app.post('/api/audio/match', async (req, res) => {
  try {
    const { audioFilePath, threshold, userId, matchOwnOnly } = req.body;

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

    // If matchOwnOnly is true, only match against this user's fingerprints
    const filterUserId = (matchOwnOnly && userId) ? userId : null;
    
    const result = await fingerprinter.matchAudio(
      audioFilePath, 
      threshold || 0.85,
      filterUserId
    );

    // Send push notification if match found and userId provided
    if (result && result.match && userId) {
      const confidencePercent = (result.confidence * 100).toFixed(1);
      await sendPushNotification(
        userId,
        '🎵 Audio Match Found!',
        `Matched: ${result.match} (${confidencePercent}% confidence)`,
        {
          matchId: result.match,
          confidence: result.confidence,
          timestamp: new Date().toISOString()
        }
      );
    }

    if (result && result.match) {
      res.json({
        success: true,
        match: result.match,
        confidence: result.confidence,
        confidencePercent: `${(result.confidence * 100).toFixed(1)}%`,
        allScores: result.allScores
      });
    } else {
      res.json({
        success: true,
        match: null,
        confidence: result?.confidence || 0,
        message: 'No match found',
        allScores: result?.allScores || []
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

// GET: Retrieve all audio fingerprints (optionally filter by userId)
// curl http://localhost:3000/api/audio/fingerprints?userId=johns-iphone-abc123
app.get('/api/audio/fingerprints', (req, res) => {
  try {
    const { userId } = req.query;
    const fingerprints = fingerprinter.getAllFingerprints(userId);
    
    res.json({
      success: true,
      count: fingerprints.length,
      fingerprints: fingerprints,
      filteredBy: userId || 'none'
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

// ============================
// Push Notification Endpoints
// ============================

// POST: Register device for push notifications
// curl -X POST http://localhost:3000/api/notifications/register \
//   -H "Content-Type: application/json" \
//   -d '{"userId": "user123", "pushToken": "ExponentPushToken[...]"}'
app.post('/api/notifications/register', (req, res) => {
  try {
    const { userId, pushToken } = req.body;
    
    console.log('📥 Registration request received:');
    console.log('   UserId:', userId);
    console.log('   Push Token:', pushToken);

    if (!userId || !pushToken) {
      console.log('❌ Missing userId or pushToken');
      return res.status(400).json({
        error: 'userId and pushToken are required'
      });
    }

    // Validate the push token
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log('❌ Invalid push token format:', pushToken);
      return res.status(400).json({
        error: 'Invalid Expo push token format',
        receivedToken: pushToken
      });
    }

    // Store the push token
    deviceTokens.set(userId, pushToken);
    saveDeviceTokens(); // Persist to file
    console.log(`✅ Registered push token for user: ${userId}`);

    res.json({
      success: true,
      message: `Push notifications enabled for user: ${userId}`
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      error: 'Failed to register push token',
      details: error.message
    });
  }
});

// POST: Send a test notification
// curl -X POST http://localhost:3000/api/notifications/test \
//   -H "Content-Type: application/json" \
//   -d '{"userId": "user123"}'
app.post('/api/notifications/test', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const result = await sendPushNotification(
      userId,
      '🔔 Test Notification',
      'Your push notifications are working!',
      { test: true }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Test notification sent',
        ticket: result.ticket
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      details: error.message
    });
  }
});

// GET: List registered devices
app.get('/api/notifications/devices', (req, res) => {
  try {
    const devices = Array.from(deviceTokens.keys());
    res.json({
      success: true,
      count: devices.length,
      devices: devices
    });
  } catch (error) {
    console.error('Error listing devices:', error);
    res.status(500).json({
      error: 'Failed to list devices',
      details: error.message
    });
  }
});

// DELETE: Remove a specific device
// curl -X DELETE http://localhost:3000/api/notifications/device/johns-iphone-abc123
app.delete('/api/notifications/device/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (deviceTokens.has(userId)) {
      deviceTokens.delete(userId);
      saveDeviceTokens(); // Persist to file
      console.log(`🗑️ Removed device: ${userId}`);
      res.json({
        success: true,
        message: `Device removed: ${userId}`
      });
    } else {
      res.status(404).json({
        error: `Device not found: ${userId}`
      });
    }
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({
      error: 'Failed to remove device',
      details: error.message
    });
  }
});

// DELETE: Clear all registered devices
// curl -X DELETE http://localhost:3000/api/notifications/devices/clear
app.delete('/api/notifications/devices/clear', (req, res) => {
  try {
    const count = deviceTokens.size;
    deviceTokens.clear();
    saveDeviceTokens(); // Persist to file
    console.log(`🗑️ Cleared all ${count} registered devices`);
    res.json({
      success: true,
      message: `Cleared ${count} devices`
    });
  } catch (error) {
    console.error('Error clearing devices:', error);
    res.status(500).json({
      error: 'Failed to clear devices',
      details: error.message
    });
  }
});

// Get local network IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Simple endpoint to save triggered audio (no fingerprinting)
app.post('/api/audio/trigger', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { userId, timestamp } = req.body;

    console.log(`🔔 Trigger received: ${req.file.filename} from user: ${userId || 'unknown'}`);

    // Just save the file, no processing
    res.status(200).json({ 
      success: true,
      message: 'Trigger audio saved',
      filename: req.file.filename,
      timestamp: timestamp || Date.now()
    });

  } catch (error) {
    console.error('❌ Error saving trigger:', error);
    res.status(500).json({ 
      error: 'Failed to save trigger audio',
      details: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  
  console.log(`🎵 Audio Fingerprinting Server running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIp}:${PORT}`);
  console.log(`📚 Loaded ${fingerprinter.database.size} fingerprints from database`);
  console.log(`\n💡 Use the Network URL when testing on a physical device`);
});