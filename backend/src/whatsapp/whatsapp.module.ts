import { Global, Module } from '@nestjs/common';
import { WhatsappLinkService } from './whatsapp-link.service';

@Global()
@Module({
  providers: [WhatsappLinkService],
  exports: [WhatsappLinkService],
})
export class WhatsappModule {}
