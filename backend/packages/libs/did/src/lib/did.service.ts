import { Injectable } from '@nestjs/common';
import { DidLocalState, RawDidDocument } from '@saito/models';
import { DidDocumentImpl } from './core/did-document';
import { DidLocalManager } from './did-local.manager';
import { DidServiceInterface } from './did.interface';

@Injectable()
export class DidServiceImpl implements DidServiceInterface {
  constructor(private readonly manager: DidLocalManager) {}

  getDocument(): RawDidDocument {
    return this.manager.getDocument();
  }

  getDocumentObj(): DidDocumentImpl {
    return this.manager.getDocumentObj();
  }

  getLocalServiceId(): string[] {
    return this.manager.getLocalServiceId();
  }

  getMyPeerId(): string {
    return this.manager.getPeerId();
  }

  getMyPublicKey(): string {
    return this.manager.getPublicKey();
  }

  isDidUpdated(): boolean {
    return this.manager.getDidUodated();
  }

  getController(): string | undefined {
    return this.manager.getController();
  }

  async resetDidUpdated() {
    await this.manager.resetDidUpdated();
  }

  async refresh() {
    await this.manager.updateDocument();
  }

  async patch(fields: Partial<DidLocalState>) {
    await this.manager.patch(fields);
  }

  async setController(newController: string) {
    await this.manager.setController(newController);
  }

  async isNewerThanPersist(did: RawDidDocument): Promise<boolean> {
    return await this.manager.isNewerThanPersist(did);
  }

  // 用本地DID私钥签名nonce，输入nonce，用自己的私钥签名。
  async signNonce(nonce: string | Uint8Array): Promise<string> {
    return this.manager.signNonce(nonce);
  }

  // 验证签名，输入nonce，signature和对应的公钥(可以did.getPublicKey()获取)
  async verifyNonceSignature(nonce: string | Uint8Array, signature: string, publicKey: string): Promise<boolean> {
    return this.manager.verifyNonceSignature(nonce, signature, publicKey);
  }
}

export const DidServiceProvider = {
  provide: 'DidService',
  useClass: DidServiceImpl,
};
