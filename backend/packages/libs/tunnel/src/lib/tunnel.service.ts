import { TunnelService } from "./tunnel.interface";
import { Logger } from "@nestjs/common";
import { io } from "socket.io-client";

export class DefaultTunnelService implements TunnelService {

  private readonly gatewayUrl = "http://localhost:8716"
  private readonly logger = new Logger(DefaultTunnelService.name);

  private readonly socket;
  constructor(
  ) {
    this.socket = io(this.gatewayUrl);
    this.logger.log('Socket initialized');
    this.socket.on('connected', (message) => {
      this.logger.log("Connect response:" + message);
    })
    this.connectSocket();
  }

  async connectSocket(): Promise<void> {
    const deviceId = 'device123';  // Unique identifier for this device
    await this.socket.emit('connectSocket',  { deviceId } );
  }

}

const TunnelServiceProvider = {
  provide: TunnelService,
  useClass: DefaultTunnelService,
};

export default TunnelServiceProvider;
