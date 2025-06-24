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

@Module({
  imports: [TunnelModule],
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
      useValue: new Uint8Array([
        1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
        17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
      ]),
    },
    {
      provide: 'AUTHENTICATION',
      useValue: '#key-1',
    },
  ],
  exports: [DidServiceProvider, DidDocumentManagerService, DidServiceImpl],
})
export class DidModule {}
