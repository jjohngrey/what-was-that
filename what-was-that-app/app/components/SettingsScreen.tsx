import { useState } from 'react';
import { Check, Shield, Eye, Cpu, FileCheck } from 'lucide-react-native';

export default function SettingsScreen() {
  const [isListening, setIsListening] = useState(true);
  const [sensitivity, setSensitivity] = useState(70);
  const [notifications, setNotifications] = useState({
    vibration: true,
    visual: true,
    sound: false,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
        Private by design
      </p>

      {/* Listening Toggle */}
      <div
        className="rounded-2xl p-5 mb-4 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="mb-1" style={{ color: 'var(--text-primary)' }}>Listening</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Detect vibration patterns
            </p>
          </div>
          <label className="relative inline-block w-12 h-7">
            <input
              type="checkbox"
              checked={isListening}
              onChange={(e) => setIsListening(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className="w-12 h-7 rounded-full peer transition-all cursor-pointer"
              style={{
                backgroundColor: isListening ? 'var(--event-confirmed)' : 'var(--text-secondary)',
              }}
            >
              <div
                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform"
                style={{
                  transform: isListening ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Sensitivity Slider */}
      <div
        className="rounded-2xl p-5 mb-4 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <h3 className="mb-3" style={{ color: 'var(--text-primary)' }}>Sensitivity</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--event-detected) ${sensitivity}%, var(--bg-light) ${sensitivity}%)`,
          }}
        />
        <div className="flex justify-between mt-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Low</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>High</span>
        </div>
      </div>

      {/* Notification Preferences */}
      <div
        className="rounded-2xl p-5 mb-6 shadow-sm"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        <h3 className="mb-4" style={{ color: 'var(--text-primary)' }}>Notification preferences</h3>
        
        {[
          { key: 'vibration', label: 'Vibration alerts' },
          { key: 'visual', label: 'Visual alerts' },
          { key: 'sound', label: 'Sound alerts' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between py-3 cursor-pointer">
            <span style={{ color: 'var(--text-primary)' }}>{label}</span>
            <input
              type="checkbox"
              checked={notifications[key as keyof typeof notifications]}
              onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
              className="sr-only peer"
            />
            <div
              className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: notifications[key as keyof typeof notifications] ? 'var(--event-detected)' : 'var(--text-secondary)',
                backgroundColor: notifications[key as keyof typeof notifications] ? 'var(--event-detected)' : 'transparent',
              }}
            >
              {notifications[key as keyof typeof notifications] && (
                <Check size={16} color="white" />
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Privacy Section */}
      <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}>Privacy</h2>
      <div className="space-y-3">
        {[
          { icon: <Cpu size={24} />, text: 'On-device processing' },
          { icon: <Shield size={24} />, text: 'Audio stored locally only' },
          { icon: <FileCheck size={24} />, text: 'Pattern matching technology' },
          { icon: <Eye size={24} />, text: 'No cameras' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--event-confirmed)', opacity: 0.15 }}
            >
              <div style={{ color: 'var(--event-confirmed)' }}>
                {item.icon}
              </div>
            </div>
            <span style={{ color: 'var(--text-primary)' }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}