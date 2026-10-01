import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type SignalReading = {
  technology: string;
  metric: string;
  dbm: number | null;
  rssi: number | null;
};

export type TelephonySnapshot = {
  status: string;
  carrier: string | null;
  technology: string | null;
  signals: Array<SignalReading>;
  signalSupported: boolean;
  signalAgeMs: number | null;
  queriedAt: number;
};

// Codegen genera la interfaz Kotlin/Java a partir de este contrato TypeScript.
export interface Spec extends TurboModule {
  getSnapshot(): Promise<TelephonySnapshot>;
}

// get permite mostrar una explicación si se abre un APK anterior al módulo.
export default TurboModuleRegistry.get<Spec>('NetworkTelephony');
