import { NestFactory } from '@nestjs/core';
import { EthStorageModule, EthStorageService } from "@saito/ethstorage";
import { env } from '../env';
import * as console from "console";

describe('EthStorage API', () => {
  let ethStorageService: EthStorageService;

  beforeEach(async () => {
    const context = await NestFactory.createApplicationContext(
      EthStorageModule,
    );
    ethStorageService = context.get(EthStorageService);
  });

  it('ethstorage', async () => {
    await ethStorageService.write("0x5b341022794C71279fBC454985b5b9F7371e0821:memory", Buffer.from('[]'))
    //await ethStorageService.write("userAddress:memory:basic_info:location", Buffer.from('User is now in Denver'));
    console.log("Uploaded");
    const value = await ethStorageService.read("ai.saito");
    console.log(value);
    expect(value).toEqual(Buffer.from('123123'));
  });
});
