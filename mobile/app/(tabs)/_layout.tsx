import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/theme";
import { useBadgeCounts } from "../../lib/useBadgeCounts";

type IoniconsName = keyof typeof Ionicons.glyphMap;

function icon(name: IoniconsName, focused: boolean) {
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? Colors.accent : Colors.textTertiary}
    />
  );
}

function badge(count: number): number | undefined {
  return count > 0 ? count : undefined;
}

export default function TabLayout() {
  const counts = useBadgeCounts();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.separator,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarBadgeStyle: {
          backgroundColor: Colors.danger,
          color: Colors.textInverse,
          fontSize: 11,
          fontWeight: "700",
          minWidth: 18,
          height: 18,
          lineHeight: 18,
          borderRadius: 9,
        },
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => icon("checkmark-circle-outline", focused),
          tabBarBadge: badge(counts.tasks),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: "Quests",
          tabBarIcon: ({ focused }) => icon("compass-outline", focused),
          tabBarBadge: undefined,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ focused }) => icon("folder-outline", focused),
          tabBarBadge: undefined,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ focused }) => icon("flag-outline", focused),
          tabBarBadge: undefined,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: "Routines",
          tabBarIcon: ({ focused }) => icon("repeat-outline", focused),
          tabBarBadge: undefined,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ focused }) => icon("calendar-outline", focused),
          tabBarBadge: undefined,
        }}
      />
    </Tabs>
  );
}
