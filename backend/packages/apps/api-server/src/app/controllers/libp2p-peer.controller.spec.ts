import { Test, TestingModule } from '@nestjs/testing';
import { PeerController } from './libp2p-peer.controller';
import { DidDocumentManager, Libp2pPeersService } from '@saito/did';

describe('PeerController', () => {
  let controller: PeerController;
  let didManagerService: DidDocumentManager;
  let libp2pPeers: Libp2pPeersService;

  beforeEach(async () => {
    didManagerService = { getAllDocuments: jest.fn().mockReturnValue(['doc1', 'doc2']) } as any;
    libp2pPeers = {
      getNeighbors: jest.fn().mockResolvedValue(['peerA', 'peerB']),
      findPeer: jest.fn().mockResolvedValue({ peerId: 'peerA', addrs: ['addr'] }),
      getPublicKey: jest.fn().mockResolvedValue({ peerId: 'peerA', publicKey: 'mockKey' }),
      connectToPeer: jest.fn().mockResolvedValue({ status: 'connected' }),
      pingPeer: jest.fn().mockResolvedValue({ rtt_ms: 13 }),
      sendDirectMessage: jest.fn().mockResolvedValue({ status: 'ok' }),
      health: jest.fn().mockResolvedValue({ status: 'ok' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeerController],
      providers: [
        { provide: 'DidDocumentManagerService', useValue: didManagerService },
        { provide: 'Libp2pPeersService', useValue: libp2pPeers },
      ],
    }).compile();

    controller = module.get<PeerController>(PeerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all documents', () => {
    expect(controller.getAllDocuments()).toEqual({ success: true, data: ['doc1', 'doc2'] });
  });

  it('should get neighbors', async () => {
    const result = await controller.getNeighbors();
    expect(result).toEqual({ success: true, data: ['peerA', 'peerB'] });
  });

  it('should find peer', async () => {
    const result = await controller.findPeer('peerA');
    expect(result).toEqual({ success: true, data: { peerId: 'peerA', addrs: ['addr'] } });
  });

  it('should handle error in findPeer', async () => {
    (libp2pPeers.findPeer as jest.Mock).mockRejectedValueOnce(new Error('find error'));
    const result = await controller.findPeer('peerX');
    expect(result.success).toBe(false);
    expect(result.message).toBe('find error');
  });

  it('should get public key', async () => {
    const result = await controller.getPublicKey('peerA');
    expect(result).toEqual({ success: true, data: { peerId: 'peerA', publicKey: 'mockKey' } });
  });

  it('should connect to peer', async () => {
    const result = await controller.connectToPeer('peerA');
    expect(result).toEqual({ success: true, result: { status: 'connected' }, input: 'peerA' });
  });

  it('should ping peer', async () => {
    const result = await controller.pingPeer('peerA');
    expect(result).toEqual({ success: true, data: { rtt_ms: 13 }, input: 'peerA' });
  });

  it('should send test message', async () => {
    const dto = { peerId: 'peerA', message: 'hello' };
    const result = await controller.sendTestMessage(dto);
    expect(result).toEqual({
      success: true,
      result: { status: 'ok' },
      input: dto,
    });
  });

  it('should return health', async () => {
    const result = await controller.health();
    expect(result).toEqual({ success: true, data: { status: 'ok' } });
  });
});