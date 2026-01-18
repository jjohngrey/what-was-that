import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Bell, TrendingUp, Clock, BarChart3 } from "lucide-react-native";

interface Event {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  type: "doorbell" | "smoke" | "glass" | "baby";
}

const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  textPrimary: "#1F1F1F",
  textSecondary: "#757575",
  primary: "#4A6572", // Darker for better contrast
  doorbell: "#4A6572", // Darker for better contrast
  smoke: "#D32F2F",
  glass: "#FF9800",
  baby: "#9C27B0",
};

// Generate sample data
const generateSampleData = (): Event[] => {
  const events: Event[] = [];
  const now = new Date();
  
  // Doorbells (most frequent)
  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const hour = 8 + Math.floor(Math.random() * 12);
    date.setHours(hour, Math.floor(Math.random() * 60));
    
    events.push({
      id: `doorbell-${i}`,
      name: "Doorbell",
      timestamp: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      type: "doorbell",
    });
  }
  
  // Glass breaking (rare)
  events.push({
    id: 'glass-1',
    name: "Glass Breaking",
    timestamp: "11:23 PM",
    date: "Jan 15",
    type: "glass",
  });
  
  // Smoke alarm (very rare)
  events.push({
    id: 'smoke-1',
    name: "Smoke Alarm",
    timestamp: "7:45 AM",
    date: "Jan 13",
    type: "smoke",
  });
  
  // Baby crying
  for (let i = 0; i < 4; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const hour = Math.random() > 0.5 ? 2 + Math.floor(Math.random() * 4) : 20 + Math.floor(Math.random() * 3);
    date.setHours(hour, Math.floor(Math.random() * 60));
    
    events.push({
      id: `baby-${i}`,
      name: "Baby Crying",
      timestamp: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      type: "baby",
    });
  }
  
  return events.sort((a, b) => {
    // Sort by date (newest first)
    if (a.date === 'Today' && b.date !== 'Today') return -1;
    if (b.date === 'Today' && a.date !== 'Today') return 1;
    if (a.date === 'Yesterday' && b.date !== 'Today' && b.date !== 'Yesterday') return -1;
    if (b.date === 'Yesterday' && a.date !== 'Today' && a.date !== 'Yesterday') return 1;
    return 0;
  });
};

const events = generateSampleData();

// Calculate stats
const totalAlerts = events.length;
const mostDetected = "Doorbell";
const peakTime = "10:00 AM - 12:00 PM";
const avgDaily = Math.round(totalAlerts / 7);

// Alert breakdown
const breakdown = {
  doorbell: events.filter(e => e.type === 'doorbell').length,
  smoke: events.filter(e => e.type === 'smoke').length,
  glass: events.filter(e => e.type === 'glass').length,
  baby: events.filter(e => e.type === 'baby').length,
};

// Weekly frequency data
const weeklyData = [
  { day: 'Mon', count: 3 },
  { day: 'Tue', count: 2 },
  { day: 'Wed', count: 4 },
  { day: 'Thu', count: 1 },
  { day: 'Fri', count: 5 },
  { day: 'Sat', count: 3 },
  { day: 'Sun', count: 2 },
];

const maxCount = Math.max(...weeklyData.map(d => d.count));

const getColorForType = (type: Event["type"]) => {
  switch (type) {
    case "smoke":
      return COLORS.smoke;
    case "glass":
      return COLORS.glass;
    case "baby":
      return COLORS.baby;
    default:
      return COLORS.doorbell;
  }
};

export default function EventHistoryScreen() {
  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Alert analytics and timeline</Text>

      {/* Stats Summary Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Bell size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>{totalAlerts}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
          <Text style={styles.statSubLabel}>This Week</Text>
        </View>
        
        <View style={styles.statCard}>
          <TrendingUp size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>{avgDaily}</Text>
          <Text style={styles.statLabel}>Avg Daily</Text>
          <Text style={styles.statSubLabel}>Alerts/Day</Text>
        </View>
        
        <View style={styles.statCard}>
          <Clock size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>10-12</Text>
          <Text style={styles.statLabel}>Peak Time</Text>
          <Text style={styles.statSubLabel}>Morning</Text>
        </View>
        
        <View style={styles.statCard}>
          <BarChart3 size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>{mostDetected}</Text>
          <Text style={styles.statLabel}>Most Common</Text>
          <Text style={styles.statSubLabel}>Sound Type</Text>
        </View>
      </View>

      {/* Alert Frequency Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Alert Frequency</Text>
        <Text style={styles.chartSubtitle}>Last 7 Days</Text>
        
        <View style={styles.chart}>
          {weeklyData.map((data, index) => {
            const barHeight = (data.count / maxCount) * 100;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${barHeight}%` }]} />
                </View>
                <Text style={styles.barLabel}>{data.day}</Text>
                <Text style={styles.barValue}>{data.count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Alert Type Breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.chartTitle}>Alert Breakdown</Text>
        <Text style={styles.chartSubtitle}>By Sound Type</Text>
        
        <View style={styles.breakdownList}>
          {[
            { type: 'doorbell', label: 'Doorbell', count: breakdown.doorbell, color: COLORS.doorbell },
            { type: 'baby', label: 'Baby Crying', count: breakdown.baby, color: COLORS.baby },
            { type: 'glass', label: 'Glass Breaking', count: breakdown.glass, color: COLORS.glass },
            { type: 'smoke', label: 'Smoke Alarm', count: breakdown.smoke, color: COLORS.smoke },
          ].map((item) => {
            const percentage = Math.round((item.count / totalAlerts) * 100);
            return (
              <View key={item.type} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <View style={styles.breakdownBarTrack}>
                    <View style={[styles.breakdownBarFill, { width: `${percentage}%`, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.breakdownValue}>{item.count}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Activity Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.chartTitle}>Recent Activity</Text>
        <Text style={styles.chartSubtitle}>Latest detections</Text>
        
        <View style={styles.timeline}>
          {events.slice(0, 10).map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getColorForType(event.type) }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineName}>{event.name}</Text>
                <Text style={styles.timelineTime}>{event.date} • {event.timestamp}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  title: { fontSize: 28, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { color: COLORS.textSecondary, marginBottom: 24, fontSize: 15 },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: '46%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chartSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barWrapper: {
    height: 80,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  
  breakdownCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownList: {
    gap: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  breakdownBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    width: 24,
    textAlign: 'right',
  },
  
  timelineCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timelineTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
