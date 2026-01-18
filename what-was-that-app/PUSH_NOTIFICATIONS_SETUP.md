# 📱 Push Notifications Setup Guide

## ✅ What's Already Done

- ✅ Backend has Expo push notification support
- ✅ App has notification hooks and UI
- ✅ Auto-registers your device when app starts

## 🚀 How to Test

### Step 1: Start the Backend
```bash
cd ../backend
npm start
```

Backend runs on `http://localhost:3000`

### Step 2: Update Backend URL (if using physical device)

If you're testing on a **real phone** (not simulator), you need to use your computer's IP address:

1. Find your computer's IP address:
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Look for something like: 192.168.1.xxx
   ```

2. Update the backend URL in `hooks/use-notifications.ts`:
   ```typescript
   const BACKEND_URL = 'http://192.168.1.xxx:3000'; // Replace with your IP
   ```

### Step 3: Start the App
```bash
cd what-was-that-app
npx expo start
```

### Step 4: Run on Your Phone

**Option A: Expo Go App (Easiest)**
1. Download "Expo Go" from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in terminal
3. App will load on your phone

**Option B: Development Build (More features)**
```bash
# For iOS:
npx expo run:ios

# For Android:
npx expo run:android
```

### Step 5: Test Notifications

#### Test 1: Send Test Notification
- Open the app
- Tap "🔔 Send Test Notification" button
- You should see a notification!

#### Test 2: Audio Match Notification
1. Store an audio fingerprint:
   ```bash
   curl -X POST http://localhost:3000/api/audio/fingerprint \
     -H "Content-Type: application/json" \
     -d '{"audioFilePath": "./recorded_fingerprints/test.mp3", "audioId": "song1"}'
   ```

2. Match the audio (triggers notification):
   ```bash
   curl -X POST http://localhost:3000/api/audio/match \
     -H "Content-Type: application/json" \
     -d '{"audioFilePath": "./recorded_fingerprints/test.mp3", "userId": "my-phone", "threshold": 0.85}'
   ```

3. Your phone should get a notification: "🎵 Audio Match Found!"

## 🔧 Troubleshooting

### "Must use physical device for Push Notifications"
- Expo push notifications **don't work** on iOS Simulator
- Use a real iPhone or Android phone

### "Failed to register with backend"
- Make sure backend is running on port 3000
- If on physical device, use your computer's IP address instead of `localhost`

### Notifications not appearing
1. Check app has notification permissions (Settings → [Your App] → Notifications)
2. Check the Expo Go app has permissions if using Expo Go
3. Look at terminal logs for errors

### Backend says "No push token found"
- App needs to be open at least once to register
- Check the home screen shows "✅ Registered for push notifications!"
- Check backend logs for registration confirmation

## 📝 Current User ID

The app uses userId: `"my-phone"` by default. 

To change it, edit `app/(tabs)/index.tsx`:
```typescript
const { expoPushToken, notification } = useNotifications('YOUR-USER-ID-HERE');
```

## 🎯 Integration with Your App

When you want to trigger notifications from audio matching:

```bash
curl -X POST http://localhost:3000/api/audio/match \
  -H "Content-Type: application/json" \
  -d '{
    "audioFilePath": "./path/to/audio.mp3",
    "userId": "my-phone",
    "threshold": 0.85
  }'
```

If confidence >= threshold (85%), your phone gets notified automatically! 🎵📱

