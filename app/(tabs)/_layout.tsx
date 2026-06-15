import { Tabs } from "expo-router";
import BottomTabBar from "../../components/BottomTabBar";
import { ScrollProvider } from "../../lib/scrollContext";

// Order here defines the tab order: Home · Search · Add · Chat · Profile.
// All visuals (icons, labels, active tint, raised Add button) live in BottomTabBar.
export default function TabsLayout() {
  return (
    <ScrollProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <BottomTabBar {...props} />}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="add" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </ScrollProvider>
  );
}
