import { Libp2pPeersService } from './libp2p-peers.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Libp2pPeersService', () => {
  let service: Libp2pPeersService;

  beforeEach(() => {
    service = new Libp2pPeersService();
    jest.clearAllMocks();
  });

  it('should find peer', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { peerId: 'peerA', addrs: ['addr'] } });
    const result = await service.findPeer('peerA');
    expect(result).toEqual({ peerId: 'peerA', addrs: ['addr'] });
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4010/libp2p/find-peer/peerA');
  });

  it('should get public key', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { peerId: 'peerA', publicKey: 'mockKey' } });
    const result = await service.getPublicKey('peerA');
    expect(result).toEqual({ peerId: 'peerA', publicKey: 'mockKey' });
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4010/libp2p/public-key/peerA');
  });

  it('should connect to peer', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { status: 'connected' } });
    const result = await service.connectToPeer('peerA');
    expect(result).toEqual({ status: 'connected' });
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:4010/connect/peerA');
  });

  it('should ping peer', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { rtt_ms: 8 } });
    const result = await service.pingPeer('peerA');
    expect(result).toEqual({ rtt_ms: 8 });
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4010/libp2p/ping/peerA');
  });

  it('should send direct message', async () => {
    mockedAxios.post.mockResolvedValueOnce({}); // response body is not used
    const dto = { to: 'peerA', payload: { hello: 'world' } };
    const result = await service.sendDirectMessage('peerA', dto);
    expect(result).toEqual({ status: 'ok' });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:4010/libp2p/p2p-send/peerA',
      dto
    );
  });

  it('should get neighbors', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: ['peerA', 'peerB'] });
    const result = await service.getNeighbors();
    expect(result).toEqual(['peerA', 'peerB']);
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4010/neighbors');
  });

  it('should get health', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
    const result = await service.health();
    expect(result).toEqual({ status: 'ok' });
    expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4010/health');
  });
});