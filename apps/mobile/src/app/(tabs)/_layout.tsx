import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Brand } from '@/constants/theme';
import { useT } from '@/lib/i18n';

const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: 'index', title: 'tabs.home', icon: 'home-outline', active: 'home' },
  { name: 'explore', title: 'tabs.explore', icon: 'compass-outline', active: 'compass' },
  { name: 'challenges', title: 'tabs.challenges', icon: 'shield-outline', active: 'shield' },
  { name: 'community', title: 'tabs.social', icon: 'people-outline', active: 'people' },
  { name: 'profile', title: 'tabs.profile', icon: 'person-outline', active: 'person' },
];

export default function TabLayout() {
  const t = useT();
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
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
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
    // Browsers report no bottom inset, so give the bar room for icon and label.
    ...(Platform.OS === 'web' ? { height: 62, paddingTop: 6, paddingBottom: 8 } : null),
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
  },
});
