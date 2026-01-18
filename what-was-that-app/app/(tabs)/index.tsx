import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, Alert } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useNotifications, sendTestNotification } from '@/hooks/use-notifications';

export default function HomeScreen() {
  const { expoPushToken, notification, userId } = useNotifications();

  const handleTestNotification = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not generated yet');
      return;
    }
    
    try {
      await sendTestNotification(userId);
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification. Make sure backend is running.');
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">🎵 What Was That?</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🆔 Your Device ID</ThemedText>
        {userId ? (
          <ThemedView style={styles.userIdBox}>
            <ThemedText style={styles.userIdText}>{userId}</ThemedText>
          </ThemedView>
        ) : (
          <ThemedText>⏳ Generating ID...</ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📱 Push Notifications</ThemedText>
        <ThemedText>
          {expoPushToken 
            ? '✅ Registered for push notifications!' 
            : '⏳ Registering for notifications...'}
        </ThemedText>
        {expoPushToken && (
          <ThemedText style={styles.tokenText} numberOfLines={2}>
            🔑 Token: {expoPushToken.substring(0, 20)}...
          </ThemedText>
        )}
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleTestNotification}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.buttonText}>🔔 Send Test Notification</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📝 How It Works</ThemedText>
        <ThemedText>
          1. This app is registered for push notifications{'\n'}
          2. Your backend can match audio fingerprints{'\n'}
          3. When a match is found, you'll get notified!
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenText: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: 'monospace',
  },
  userIdBox: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  userIdText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
