import { Controller, Get, Inject, Body, Post, Query, Logger } from '@nestjs/common';
import { DidServiceInterface } from '@saito/did';

@Controller('did')
export class DidController {
  private logger = new Logger(DidController.name);

  constructor(
    @Inject('DidService') private readonly didService: DidServiceInterface,
  ) {}

  @Get('document')
  getDocument() {
    return { success: true, data: this.didService.getDocument() };
  }
  
  @Get('my-did')
  getMyPeerId() {
    return { success: true, data: this.didService.getMyPeerId() };
  }
  
  @Get('my-public-key')
  getMyPublicKey() {
    return { success: true, data: this.didService.getMyPublicKey() };
  }
}