import { OnModuleDestroy } from '@nestjs/common';
import { env } from '../env';
import { EthStorageService } from './ethstorage.interface';
import { EthStorage, FlatDirectory } from "ethstorage-sdk";

export class DefaultEthStorageService extends EthStorageService {
    private ethStorage: EthStorage | undefined;
    private flatDirectory: FlatDirectory | undefined;

    async init(rpc: string, ethStorageRpc: string, privateKey: string, flatDirectoryAddress: string) {
      this.ethStorage = await EthStorage.create({
        rpc: rpc,
        ethStorageRpc: ethStorageRpc,
        privateKey: privateKey,
      });

      this.flatDirectory = await FlatDirectory.create({
        rpc: rpc,
        privateKey: privateKey,
        ethStorageRpc: ethStorageRpc,
        address: flatDirectoryAddress
      });
    }

    async uploadFile(key: string, value: string) {
      if(!this.flatDirectory) {
        throw new Error('instance not initialized');
      }

      const callback = {
        onProgress: function (progress: any, count: any, isChange: any) {
        },
        onFail: function (err: any) {
        },
        onFinish: function (totalUploadChunks: any, totalUploadSize: any, totalStorageCost: any) {
        }
      };

      const request = {
        key,
        content: Buffer.from(value),
        type: 2, // 1 for calldata and 2 for blob
        callback: callback
      }
      await this.flatDirectory.upload(request);
    }

    async write(key: string, value: Uint8Array): Promise<void> {
      if(!this.ethStorage) {
        throw new Error('instance not initialized');
      }
      await this.ethStorage.write(key, value);
    }

    async read(key: string): Promise<Uint8Array> {
      if(!this.ethStorage) {
        throw new Error('instance not initialized');
      }
       return this.ethStorage.read(key);
    }

}

const EthStorageServiceProvider = {
  provide: EthStorageService,
  useFactory: async () => {
    const service = new DefaultEthStorageService();
    const rpc = process.env['ETH_RPC_URL'] || '';
    const ethStorageRpc = process.env['ETHSTORAGE_RPC_URL'] || '';
    const privateKey = process.env['PRIVATE_KEY'] || '';
    const flatDirectoryAddress = process.env['FLAT_DIR_ADDRESS'] || '';
    console.log("Initialize ETH Storage with:")
    console.log(rpc)
    console.log(ethStorageRpc)
    console.log(privateKey)
    console.log(flatDirectoryAddress)
    if (rpc !== undefined && rpc !== null && rpc !== '') {
      await service.init(rpc, ethStorageRpc, privateKey, flatDirectoryAddress);
    } else {
      console.warn('ETH_RPC_URL is not set');
    }
    return service;
  },
};

export default EthStorageServiceProvider;
