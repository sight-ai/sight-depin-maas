import { RawDidDocument } from '@saito/models';
import { DidDocumentImpl } from '../core/did-document';

export interface DidDocumentManager {
  addDocument(raw: RawDidDocument): Promise<boolean | undefined>;
  getDocument(peerId: string): DidDocumentImpl | undefined;
  removeDocument(peerId: string): Promise<boolean>;
  getAllDocuments(): DidDocumentImpl[];
  filterDocuments(predicate: (doc: DidDocumentImpl) => boolean): Promise<DidDocumentImpl[]>;
  clearAll(): Promise<void>;
  /** 判断新 DID 是否比现有的更“新” */
  isNewerThanPersist(peerId: string, newDid: RawDidDocument): Promise<boolean>;
  /** 通过 peerId 获取 publicKey */
  getPublicKeyByPeerId(peerId: string): string;
  /** 判断当前 manager 是否有某个 peerId 的 DID 文档 */
  hasPeerId(peerId: string): boolean;
}
