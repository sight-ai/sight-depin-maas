# Did Module Overview

The DID module is a core component for managing decentralized identity (DID) documents and related identity services. It provides both local (self) DID management and decentralized document synchronization for other nodes in the network.

## Module Structure

### DidService

The main service that exposes APIs to manage and access the local node’s DID document and key information.

- Generate and persist the node’s own DID and DID Document.
- Update DID metadata (e.g., controller, seq, hash, etc.).
- Query current peerId, publicKey, or DID.
- Patch or refresh DID document state.

The DidService delegates low-level state and persistence logic to the internal DidLocalManager.

### DidDocumentManagerService

The main service maintains a synchronized mapping of known DIDs from all neighbor nodes, providing APIs to manage and access neighbor nodes' DID document and key information.

- Add or update other nodes’ DID documents.
- Query public keys and supported services by peerId.
- Verify document signatures and freshness before persisting.
- Support lookup by DID or peerId.

### DidLocalManager

Handles the business logic for building, updating, and persisting the local DID document.

### DidLocalStorage

Encapsulates file-based storage for the node’s DID document.

### DidManagerStorage

Handles persistent storage of all known peer DID documents as an array.

### DidDocumentImpl

Implements the Composite Pattern to represent the parsed structure of a DID document as a collection of composable elements (such as verification methods, services, and proof).

Example:

```ts
// didImpl is a DidDocumentImpl instance
const peerId = didImpl.getPeerId();
const pubKey = didImpl.getPublicKey();
const serviceIds = didImpl.getServiceId();
```

### ContextHandler + Parser

Responsible for schema-driven parsing and validation of DID documents.



## DID Document Workflow & Examples

### Local DID Generation

On startup, the module:

1. Loads keypair (or generates one if not found) from `~/.sightai/`
2. Builds the local DID string and DID document, including service definitions
3. Persists the document to local storage (`did-local.json`)
4. Supports updating (e.g., `controller or seq fields`) and re-persisting as needed

##### Broadcast Logic:

When the local DID is updated, the module marks its status and waits for external modules (such as `Tunnel`) to query and broadcast the new DID to the network.

External module can call `isDidUpdated()` to check whether need to broadcast the new DID, and after broadcasting, it also need to call `resetDidUpdated()` to reset the status.

##### Querying Local DID

Other modules can use DidService to:

- Get the current DID: `getDocument()`
- Get peerId: `getMyPeerId()`
- Get public key: `getMyPublicKey()`
- Check for updates: `isDidUpdated()`

Example:

```ts
// consume didService is an entity of DidServiceImpl

// 1. get current Did document
const didDocument = didService.getDocument();

// 2. get peerId
const peerId = didService.getMyPeerId();

// 3. get publicKey (base58)
const publicKey = didService.getMyPublicKey();

// 4. check whether the Did document needs broadcast
if (didService.isDidUpdated()) {
  console.log('DID has been updated and needs to be broadcast.');
	// after broadcasting, set the didUpdated statud to false.
  await didService.resetDidUpdated();
}
```



### Managing Remote DIDs

When a neighbor node sends its DID document:

1. The document is parsed and verified
2. The manager checks if it is a new document or a fresher version (by `seq`)
3. If new, updates the local cache and persists to `did-manager.json`
4. Makes the document available for service and key lookups by other modules

##### Registering/Querying Remote DIDs

Modules (e.g., `Tunnel, Node`) can:

- Verify and parse a new DID document via `DidDocumentOrchestrator`

  Example:

  ```ts
  // doc is the RawDid received from other nodes
  const didImpl = await this.orchestrator.toDidImpl(doc);
  // then can get basic infomation from didImpl
  const peerId = didImpl.getPeerId();
  const publicKey = didImpl.getPublicKey();
  const serviceId = didImpl.getServiceId();
  // ...
  ```

- Submit a new remote DID for verification and storage via `DidDocumentManagerService`

- Lookup public keys or supported services by peerId

  Example:

  ```ts
  // consume didDocumentManger is an entity of DidDocumentManager
  // add
  await didDocumentManager.addDocument(doc);
  // remove
  await didDocumentManager.removeDocument(doc);
  // filter
  await didDocumentManager.filterDocuments(fn);
  // check wheter the did received is newer than that in storage
  await didDocumentManager.isNewerThanPersist(doc.id, newDoc);
  // getPublicKeyBy Id
  await didDocumentManager.getPublicKeyByPeerId(peerId);
  // ...
  ```

### Context-handler + Parser

##### Add context-handler

To add support for a new context:

1. Implement a handler that understands the new context.

   ```ts
   import myDidContextHandler from './assets/newContext.json';
   import {GenericContextHandler} from "./context-handler";
   
   export const myDidContextHandler = new GenericContextHandler(myDidContextHandler['@context'], 'https://mydomain.com/did/v1');
   ```

2. Register the handler in the registry, typically at module setup/startup:

   ```ts
   // 2 ways, add in the current regsiter, or create your own regsiter
   
   // add in the current regsiter:
   // context-handler.registry.ts
   import myDidContextHandler from ''
   // add in the constructor
    constructor() {
       this.registerLocal(
         myDidContextHandler.getContextUrl(),
         myDidContextHandler,
       );
     }
   
   // or you can create your own registry:
   const registry = new ContextHandlerRegistry();
   registry.register('https://mydomain.com/did/v1', myDidContextHandler);
   ```





