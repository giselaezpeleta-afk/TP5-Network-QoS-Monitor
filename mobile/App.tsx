import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/screens/AppNavigator';
import { HistoryProvider } from './src/history/HistoryStore';

function App() {
  return (
    <SafeAreaProvider>
      {/* SafeAreaView protege el contenido de las barras del sistema Android. */}
      <StatusBar barStyle="dark-content" />
      <HistoryProvider>
        <AppNavigator />
      </HistoryProvider>
    </SafeAreaProvider>
  );
}

export default App;
