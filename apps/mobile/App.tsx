import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { colors } from '@aural/shared';
import { AuthProvider } from './src/features/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  // Gotham va empaquetada con la app: sin descarga en tiempo de arranque
  const [fontsLoaded, fontError] = useFonts({
    'Gotham-Light': require('./assets/fonts/Gotham-Light.ttf'),
    'Gotham-Book': require('./assets/fonts/Gotham-Book.ttf'),
    'Gotham-Medium': require('./assets/fonts/Gotham-Medium.ttf'),
    'Gotham-Bold': require('./assets/fonts/Gotham-Bold.ttf'),
    'Gotham-Black': require('./assets/fonts/Gotham-Black.ttf'),
  });

  // Si la fuente no carga, mostramos la app igual con system fallback
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
