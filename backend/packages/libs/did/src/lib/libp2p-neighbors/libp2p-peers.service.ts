import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class Libp2pPeersService {
  private readonly logger = new Logger(Libp2pPeersService.name);
  private readonly port = process.env['LIBP2P_PORT'] || 4010;
  private readonly baseUrl = `http://localhost:${this.port}`;

  async findPeer(peerId: string) {
    const url = `${this.baseUrl}/libp2p/find-peer/${peerId}`;
    this.logger.debug(`GET ${url}`);
    const { data } = await axios.get(url);
    return data;
  }

  async getPublicKey(peerId: string) {
    const url = `${this.baseUrl}/libp2p/public-key/${peerId}`;
    this.logger.debug(`GET ${url}`);
    const { data } = await axios.get(url);
    return data;
  }

  async connectToPeer(input: string) {
    const url = `${this.baseUrl}/libp2p/connect/${input}`;
    this.logger.debug(`POST ${url}`);
    const { data } = await axios.post(url);
    return data;
  }

  async pingPeer(input: string) {
    const url = `${this.baseUrl}/libp2p/ping/${input}`;
    this.logger.debug(`POST ${url}`);
    const { data } = await axios.post(url);
    return data;
  }

  async sendDirectMessage(input: string, dto: { to: string; payload: any }) {
    const url = `${this.baseUrl}/libp2p/p2p-send/${input}`;
    this.logger.debug(`POST ${url}`);
    await axios.post(url, dto);
    return { status: 'ok' };
  }

  async getNeighbors() {
    const url = `${this.baseUrl}/libp2p/neighbors`;
    this.logger.debug(`GET ${url}`);
    const { data } = await axios.get(url);
    return data;
  }

  async health() {
    const url = `${this.baseUrl}/health`;
    const { data } = await axios.get(url);
    return data;
  }
}

export const libp2pPeersServiceProvider = {
  provide: 'Libp2pPeersService',
  useClass: Libp2pPeersService,
}