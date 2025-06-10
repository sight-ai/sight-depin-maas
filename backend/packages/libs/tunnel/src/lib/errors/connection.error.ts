export class ConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class DeviceRegistrationError extends Error {
  constructor(public readonly deviceId: string, message: string) {
    super(`Device registration failed for ${deviceId}: ${message}`);
    this.name = 'DeviceRegistrationError';
  }
}

export class MessageSendError extends Error {
  constructor(message: string, public readonly originalMessage?: any) {
    super(message);
    this.name = 'MessageSendError';
  }
}
