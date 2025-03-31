export abstract class TunnelService {
  abstract connectSocket(): Promise<void>;
}
