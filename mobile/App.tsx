import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';

export type RootStackParamList = {
  Home: undefined;
  Lobby: undefined;
  Game: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#07070f" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#f0e8d0',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#07070f' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🧛 Vampir Köylü', headerShown: false }}
        />
        <Stack.Screen
          name="Lobby"
          component={LobbyScreen}
          options={{ title: '🏰 Bekleme Odası' }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ title: '⚔️ Oyun', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
