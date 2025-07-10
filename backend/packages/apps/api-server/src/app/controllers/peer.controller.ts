import { Controller, Get, Post, Body, Inject, Logger } from '@nestjs/common';
import { DidDocumentManager } from '@saito/did';

@Controller('peer')
export class PeerController {
  private logger = new Logger(PeerController.name);

  constructor(
    @Inject('DidDocumentManagerService') private readonly didManagerService: DidDocumentManager,
  ) {}

  @Get('all-documents')
  getAllDocuments() {
    return { success: true, data: this.didManagerService.getAllDocuments() };
  }

  @Get('neighbors')
  getNeighbors() {
    return { success: false, message: 'Not implemented' };
  }

  @Post('add')
  addPeer(@Body() dto: { did?: string; peerId?: string; multiAddr?: string }) {
    return { success: false, message: 'Not implemented', input: dto };
  }

  @Post('send-test-message')
  sendTestMessage(@Body() dto: { peerId: string; message: string }) {
    return { success: false, message: 'Not implemented', input: dto };
  }
}