export abstract class EthStorageService {
  abstract init(rpc: string, ethStorageRpc: string, privateKey: string, flatDirectoryAddress: string): void;
  abstract write(key: string, value: Uint8Array): Promise<void>;
  abstract read(key: string): Promise<Uint8Array>;
}
