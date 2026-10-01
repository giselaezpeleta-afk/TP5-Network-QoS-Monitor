import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type TransferResult = {
  direction: string;
  bytes: number;
  durationMs: number;
  mbps: number;
  timestamp: number;
  networkId: string;
};

export interface Spec extends TurboModule {
  measure(
    id: string,
    baseUrl: string,
    bytes: number,
    direction: string,
  ): Promise<TransferResult>;
  cancel(id: string): void;
}

export default TurboModuleRegistry.get<Spec>('Throughput');
