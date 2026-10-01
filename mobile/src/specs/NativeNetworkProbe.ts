import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type ProbeResult = {
  status: string;
  rttMs: number | null;
  address: string | null;
  sent: boolean;
  networkId: string | null;
};

export interface Spec extends TurboModule {
  probe(
    requestId: string,
    host: string,
    port: number,
    transport: string,
    timeoutMs: number,
  ): Promise<ProbeResult>;
  cancel(requestId: string): void;
}

export default TurboModuleRegistry.get<Spec>('NetworkProbe');
