import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Brand } from '@/constants/theme';

const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', active: 'home' },
  { name: 'explore', title: 'Explore', icon: 'compass-outline', active: 'compass' },
  { name: 'challenges', title: 'Challenges', icon: 'shield-outline', active: 'shield' },
  { name: 'community', title: 'Social', icon: 'people-outline', active: 'people' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', active: 'person' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.sea,
        tabBarInactiveTintColor: '#8A9790',
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarLabelPosition: 'below-icon',
        sceneStyle: { backgroundColor: '#FFFFFF' },
        animation: 'fade',
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => <Icon name={focused ? tab.active : tab.icon} size={23} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E6ECE8',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 2,
  },
});
