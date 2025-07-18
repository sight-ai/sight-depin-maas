import { Controller, Get, Post, Body, Param, Inject, Logger } from '@nestjs/common';
import { DidDocumentManager, Libp2pPeersService } from '@saito/did';

@Controller('peer')
export class PeerController {
  private logger = new Logger(PeerController.name);

  constructor(
    @Inject('DidDocumentManagerService') private readonly didManagerService: DidDocumentManager,
    @Inject('Libp2pPeersService') private readonly libp2pPeers: Libp2pPeersService,
  ) {}

  @Get('all-documents')
  getAllDocuments() {
    return { success: true, data: this.didManagerService.getAllDocuments() };
  }

  @Get('neighbors')
  async getNeighbors() {
    try {
      const data = await this.libp2pPeers.getNeighbors();
      return { success: true, data };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg };
    }
  }

  @Get('find/:peerId')
  async findPeer(@Param('peerId') peerId: string) {
    try {
      const data = await this.libp2pPeers.findPeer(peerId);
      return { success: true, data };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg };
    }
  }

  @Get('public-key/:peerId')
  async getPublicKey(@Param('peerId') peerId: string) {
    try {
      const data = await this.libp2pPeers.getPublicKey(peerId);
      return { success: true, data };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg };
    }
  }

  @Post('connect/:input')
  async connectToPeer(@Param('input') input: string) {
    try {
      const result = await this.libp2pPeers.connectToPeer(input);
      return { success: true, result, input };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg, input };
    }
  }

  @Post('ping/:input')
  async pingPeer(@Param('input') input: string) {
    try {
      const data = await this.libp2pPeers.pingPeer(input);
      return { success: true, data, input };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg, input };
    }
  }

  @Post('send-test-message/:input')
  async sendTestMessage(@Param('input') input: string, @Body() dto: { peerId: string; message: string }) {
    try {
      const payload = {
        to: dto.peerId,
        payload: { message: dto.message }
      };
      const result = await this.libp2pPeers.sendDirectMessage(input, payload);
      return { success: true, result, input };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg, input };
    }
  }

  @Get('health')
  async health() {
    try {
      const data = await this.libp2pPeers.health();
      return { success: true, data };
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : String(e);
      return { success: false, message: msg };
    }
  }
}