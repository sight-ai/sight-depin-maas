import { Module } from '@nestjs/common';
import { ContextHandlerRegistry } from './core/context/context-handler/context-handler.registry';
import { DidDocumentAssembler } from './core/did-document.assembler';
import { DidDocumentParser } from './core/parser/did-document.parser';
import { DidDocumentProofSigner, DidDocumentVerifier } from './core/proof';
import {
  DidDocumentManagerProvider,
  DidDocumentManagerService,
} from './did-document-manager/did-document-manager.service';
import { DidLocalStorage } from './did-document-storage/did-local.storage';
import { DidManagerStorage } from './did-document-storage/did-manager.storage';
import {
  DidDocumentOrchestrator,
  DidDocumentOrchestratorProvider,
} from './did-document.orchestrator';
import { DidLocalBuilder } from './did-local.builder';
import { DidLocalManager } from './did-local.manager';
import { DidServiceImpl, DidServiceProvider } from './did.service';
// 移除对 TunnelModule 的依赖以解决循环依赖
// import { TunnelModule } from '@saito/tunnel';

@Module({
  imports: [
    // 移除 TunnelModule 以解决循环依赖
    // TunnelModule
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
        32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15,
        14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
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
