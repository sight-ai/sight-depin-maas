import { Module } from '@nestjs/common';
import { ContextHandlerRegistry } from './core/context/context-handler/context-handler.registry';
import { DidDocumentAssembler } from './core/did-document.assembler';
import { DidDocumentParser } from './core/parser/did-document.parser';
import { DidDocumentProofSigner, DidDocumentVerifier } from './core/proof';
import { DidDocumentManagerProvider, DidDocumentManagerService } from './did-document-manager/did-document-manager.service';
import { DidDocumentOrchestrator, DidDocumentOrchestratorProvider } from './did-document.orchestrator';
import { DidServiceImpl, DidServiceProvider } from './did.service';
import { DidLocalManager } from './did-local.manager';
import { DidLocalBuilder } from './did-local.builder';
import { DidLocalStorage } from './did-document-storage/did-local.storage';
import { DidManagerStorage } from './did-document-storage/did-manager.storage';
import { TunnelModule } from '@saito/tunnel';
import { KeyPairManager } from './services/key-pair-manager.service';

@Module({
  imports: [
    TunnelModule
  ],
  providers: [
    DidServiceProvider,
    DidDocumentOrchestratorProvider,
    DidDocumentManagerProvider,
    DidServiceImpl,
    DidDocumentManagerService,
    DidDocumentAssembler,
    DidDocumentOrchestrator,
    DidDocumentParser,
    DidDocumentProofSigner,
    DidDocumentVerifier,
    ContextHandlerRegistry,
    DidLocalManager,
    DidLocalBuilder,
    DidLocalStorage,
    DidManagerStorage,
    KeyPairManager,
    {
      provide: 'SIGHT_SEQ',
      useValue: 1,
    },
    {
      provide: 'SIGHT_HASH',
      useValue: '123',
    },
    {
      provide: 'KEY_PAIR',
      useFactory: async (keyPairManager: KeyPairManager) => {
        return await keyPairManager.getOrGenerateKeyPair();
      },
      inject: [KeyPairManager],
    },
    {
      provide: 'AUTHENTICATION',
      useValue: '#key-1',
    },
  ],
  exports: [DidServiceProvider, DidDocumentManagerService, DidServiceImpl, KeyPairManager],
})
export class DidModule {}
