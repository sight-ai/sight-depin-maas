import { DidLocalState, RawDidDocument } from '@saito/models';

export interface DidServiceInterface {
  getDocument(): RawDidDocument;

  refresh(): Promise<void>;

  patch(fields: Partial<DidLocalState>): Promise<void>;

  getMyPeerId(): string;

  getMyPublicKey(): string;

  isDidUpdated(): boolean;

  getController(): string | undefined;

  resetDidUpdated(): Promise<void>;

  // 用本地DID私钥签名nonce
  signNonce(nonce: string | Uint8Array): Promise<string>;

  // 用公钥校验
  verifyNonceSignature(
    nonce: string | Uint8Array,
    signature: string,
    publicKey: string,
  ): Promise<boolean>;
}
