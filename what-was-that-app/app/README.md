Swift App ResponsibilitiesYour Swift app will:
Receive push notifications from backend (via Firebase Cloud Messaging)
Display sound detection alerts in real-time
Play voice announcements (ElevenLabs audio)
Show sound history (list of past detections)
Manage user preferences (which sounds to alert for)
WebSocket connection to backend for live updates
Beautiful UI with sound visualizations
Swift Tech Stackswift// iOS App Structure
iOS App (SwiftUI)
├── Firebase SDK (push notifications, database)
├── URLSession (REST API calls to backend)
├── Starscream (WebSocket library)
├── AVFoundation (play audio alerts)
└── UserNotifications (local/remote notifications)Key Swift Libraries You'll Need:swift// Package dependencies
dependencies: [
  .package(url: "https://github.com/firebase/firebase-ios-sdk", from: "10.0.0"),
  .package(url: "https://github.com/daltoniam/Starscream", from: "4.0.0")
]