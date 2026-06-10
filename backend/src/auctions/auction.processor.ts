import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AuctionsService } from './auctions.service';
import { AuctionsGateway } from './auctions.gateway';

@Processor('auctions')
export class AuctionProcessor extends WorkerHost {
  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    if (job.name === 'endAuction') {
      await this.auctionsService.endAuction(job.data.auctionId);
      const endedAuction = await this.auctionsService.findOne(job.data.auctionId);
      this.auctionsGateway.server.to(`auction-${job.data.auctionId}`).emit('auctionEnded', endedAuction);
    }
  }
}
