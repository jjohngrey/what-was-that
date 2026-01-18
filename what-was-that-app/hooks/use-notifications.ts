import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Backend configuration
const PRODUCTION_BACKEND = 'http://155.138.215.227:3000'; // Vultr production server
const USE_PRODUCTION = true; // Set to false for local development (only if you're running backend locally)

const getBackendUrl = () => {
  // Use production server if enabled
  if (USE_PRODUCTION) {
    return PRODUCTION_BACKEND;
  }
  
  // Otherwise, automatically detect IP from Expo dev server for local development
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (hostUri) {
    // hostUri is like "192.168.1.5:8081" - extract just the IP
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  
  // Fallback to localhost (for simulators/emulators)
  return 'http://localhost:3000';
};

const BACKEND_URL = getBackendUrl();

// Log the backend URL for debugging  
console.log('🌐 Backend URL:', BACKEND_URL);
console.log('📡 Mode:', USE_PRODUCTION ? 'PRODUCTION (Vultr)' : 'LOCAL (Auto-detect)');

// Generate or retrieve a unique user ID for this device
async function getOrCreateUserId(): Promise<string> {
  try {
    // Try to get existing userId from storage
    let userId = await AsyncStorage.getItem('userId');
    
    if (!userId) {
      // Generate a unique ID based on device info
      const deviceName = Device.deviceName || 'Unknown';
      const deviceId = Constants.sessionId || Math.random().toString(36).substring(7);
      userId = `${deviceName}-${deviceId}`.replace(/\s+/g, '-').toLowerCase();
      
      // Save it for future use
      await AsyncStorage.setItem('userId', userId);
      console.log('🆔 Generated new userId:', userId);
    } else {
      console.log('🆔 Using existing userId:', userId);
    }
    
    return userId;
  } catch (error) {
    console.error('Error getting userId:', error);
    return `device-${Math.random().toString(36).substring(7)}`;
  }
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [userId, setUserId] = useState<string | undefined>();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Get or generate userId first
    getOrCreateUserId().then(id => {
      setUserId(id);
      console.log('');
      console.log('═══════════════════════════════════');
      console.log('🆔 YOUR USER ID: ' + id);
      console.log('═══════════════════════════════════');
      console.log('');
      
      registerForPushNotificationsAsync().then(token => {
        console.log('🔔 Push token received:', token);
        setExpoPushToken(token);
        if (token && token.startsWith('ExponentPushToken[')) {
          console.log('✅ Valid token format, registering with backend...');
          registerWithBackend(id, token);
        } else {
          console.log('⚠️ Invalid or missing push token:', token);
        }
      }).catch(error => {
        console.error('❌ Failed to register for push notifications:', error);
      });
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      setNotification(notification);
    });

    // Listen for notification taps/interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response);
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);
      // Handle notification tap here (e.g., navigate to specific screen)
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]);

  return {
    expoPushToken,
    notification,
    userId,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  console.log('🔍 Checking device...');
  console.log('   Is physical device:', Device.isDevice);
  console.log('   Platform:', Platform.OS);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E6F4FE',
    });
  }

  if (Device.isDevice) {
    console.log('📋 Checking permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('   Current permission status:', existingStatus);
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('   Requesting permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
      console.log('   New permission status:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.error('❌ Permission denied!');
      alert('Failed to get push notification permissions!');
      return undefined;
    }
    
    try {
      console.log('📱 Requesting push token (Expo Go)...');
      
      // Log manifest info for debugging
      const owner = Constants.expoConfig?.owner || 'unknown';
      const slug = Constants.expoConfig?.slug || 'unknown';
      console.log('   App:', `@${owner}/${slug}`);
      console.log('   Manifest loaded:', !!Constants.expoConfig);
      
      // For Expo Go, don't pass any options - it uses the manifest automatically
      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      
      token = pushTokenData.data;
      console.log('✅ Push token received:', token);
      return token;
    } catch (e: any) {
      console.error('❌ Error getting push token:');
      console.error('   Message:', e.message);
      console.error('   Full error:', JSON.stringify(e, null, 2));
      console.log('⚠️ Make sure you are using a physical device with Expo Go app installed');
      return undefined;
    }
  } else {
    console.error('❌ Not a physical device!');
    alert('Must use physical device for Push Notifications');
    return undefined;
  }
}

async function registerWithBackend(userId: string, pushToken: string) {
  try {
    console.log('📤 Registering with backend...');
    console.log('   UserId:', userId);
    console.log('   Push Token:', pushToken);
    console.log('   Backend URL:', BACKEND_URL);
    
    const response = await axios.post(`${BACKEND_URL}/api/notifications/register`, {
      userId,
      pushToken,
    });
    
    console.log('✅ Registered with backend:', response.data);
  } catch (error: any) {
    console.error('❌ Error registering with backend:', error.response?.data || error.message);
    console.log('   Status:', error.response?.status);
    console.log('   Data sent:', { userId, pushToken });
    console.log('💡 Tip: If on a physical device, replace localhost with your computer\'s IP address');
  }
}

export async function sendTestNotification(userId: string) {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/notifications/test`, {
      userId,
    });
    console.log('✅ Test notification sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    throw error;
  }
}

