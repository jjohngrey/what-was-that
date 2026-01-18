/**
 * App Configuration
 * 
 * Update these values to configure your app
 */

export const CONFIG = {
  /**
   * Backend Server URL
   * 
   * IMPORTANT: Update this with your computer's local network IP address
   * 
   * To find your IP address:
   * - macOS/Linux: Run `ifconfig | grep "inet "` or `ipconfig getifaddr en0`
   * - Windows: Run `ipconfig` in Command Prompt
   * 
   * Example: 'http://192.168.1.100:3000'
   * 
   * DO NOT use 'localhost' or '127.0.0.1' - these won't work on a physical device!
   * Your phone and computer must be on the same WiFi network.
   */
  BACKEND_URL: 'http://155.138.215.227:3000', // ⚠️ UPDATE THIS!
//   BACKEND_URL: 'http://206.12.41.7:3000',
  /**
   * User ID
   * 
   * This identifies your device. Should match the userId you use when
   * storing audio fingerprints on the backend.
   */
  USER_ID: 'iphone-45a3795e-95a7-4c60-9468-572e2dd82c64',

  /**
   * Audio Recording Settings
   */
  AUDIO: {
    // Duration for auto-listening mode (in milliseconds)
    AUTO_LISTEN_DURATION: 5000, // 5 seconds

    // Audio match confidence threshold (0.0 - 1.0)
    // Higher = more strict matching
    MATCH_THRESHOLD: 0.65, 

    // Only match against your own fingerprints
    MATCH_OWN_ONLY: true,
  },
};

// Helper to check if backend URL is configured
export const isBackendConfigured = () => {
  return CONFIG.BACKEND_URL !== 'http://192.168.1.100:3000';
};

// Helper to get backend URL with path
export const getBackendEndpoint = (path: string) => {
  return `${CONFIG.BACKEND_URL}${path}`;
};

