import { Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      const role = await SecureStore.getItemAsync('user_role');
      setUserRole(role);
    };
    loadRole();
  }, []);

  const isClinician = userRole === 'clinician';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      {/* Dashboard - Only for clinicians, first tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
          href: isClinician ? '/dashboard' : null,
        }}
      />
      {/* Home - For patients, hidden for clinicians */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          href: !isClinician ? '/' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log-mood"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood-history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="gratitude"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="patient-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="video.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="request-meeting"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="meeting-requests"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
