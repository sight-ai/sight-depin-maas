import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { sign, verifySignature } from './did.utils';
import { DidServiceImpl } from './did.service';

describe('DID utils sign & verify', () => {
  const seed = new Uint8Array(32); 
  seed[0] = 1; 
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const publicKeyBase58 = bs58.encode(keyPair.publicKey);

  it('should sign and verify nonce correctly', () => {
    const nonce = 'test-nonce-' + Math.random();
    const signature = sign(nonce, keyPair.secretKey);

    const result = verifySignature(nonce, signature, publicKeyBase58);

    expect(result).toBe(true);
  });

  it('should fail to verify with wrong nonce', () => {
    const nonce = 'hello-nonce';
    const signature = sign(nonce, keyPair.secretKey);
    const result = verifySignature('fake-nonce', signature, publicKeyBase58);

    expect(result).toBe(false);
  });

  it('should fail to verify with wrong publicKey', () => {
    const nonce = 'nonce-test';
    const signature = sign(nonce, keyPair.secretKey);
    const wrongKeyPair = nacl.sign.keyPair();
    const wrongPubKeyBase58 = bs58.encode(wrongKeyPair.publicKey);

    const result = verifySignature(nonce, signature, wrongPubKeyBase58);

    expect(result).toBe(false);
  });
});

describe('DidServiceImpl sign & verify', () => {
    const seed = new Uint8Array(32); seed[0] = 1;
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase58 = bs58.encode(keyPair.publicKey);
  
    const fakeManager: any = {
      getKeyPair: () => keyPair,
      getPublicKey: () => publicKeyBase58,
      signNonce(nonce: string | Uint8Array): string {
        return sign(nonce, keyPair.secretKey);
      },
    
      verifyNonceSignature(nonce: string | Uint8Array, signature: string, publicKey: string): boolean {
        return verifySignature(nonce, signature, publicKeyBase58);
      }
    };
  
    const didService = new DidServiceImpl(fakeManager);
  
    it('should sign and verify nonce correctly', async () => {
      const nonce = 'abc' + Math.random();
      const signature = await didService.signNonce(nonce);
      expect(signature).toBeDefined();
  
      const result = await didService.verifyNonceSignature(nonce, signature, publicKeyBase58);
      expect(result).toBe(true);
    });
  
    it('should fail with wrong nonce', async () => {
      const nonce = 'def';
      const signature = await didService.signNonce(nonce);
      const result = await didService.verifyNonceSignature('wrong', signature, publicKeyBase58);
      expect(result).toBe(false);
    });
  });