import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setLocationEnabled(enabled: boolean): Promise<string>;
  record(
    session: string,
    kind: string,
    timestamp: number,
    payload: string,
  ): Promise<void>;
  query(filters: string): Promise<string>;
  exportFile(filters: string, format: string): Promise<void>;
  getSettings(): Promise<string>;
  saveSettings(settings: string): Promise<void>;
  startMonitoring(settings: string): Promise<void>;
  stopMonitoring(): Promise<void>;
  monitoringStatus(): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('QosHistory');
