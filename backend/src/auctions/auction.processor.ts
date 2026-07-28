import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionsGateway } from './auctions.gateway';

@Processor('auctions')
export class AuctionProcessor extends WorkerHost {
  private readonly logger = new Logger(AuctionProcessor.name);

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    // BUG-14: Wrap in try/catch so BullMQ marks the job as failed on errors
    try {
      if (job.name === 'endAuction') {
        this.logger.log(`Processing endAuction job for auction ${job.data.auctionId}`);
        const endedAuction = await this.auctionsService.endAuction(job.data.auctionId);
        if (endedAuction) {
          this.auctionsGateway.server
            .to(`auction-${job.data.auctionId}`)
            .emit('auctionEnded', endedAuction);
        }
      } else if (job.name === 'activateAuction') {
        // FEAT-01: Activate a PENDING auction when its startTime arrives
        this.logger.log(`Activating pending auction ${job.data.auctionId}`);
        await this.auctionsService.activateAuction(job.data.auctionId);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed processing job "${job.name}" (id: ${job.id}): ${error.message}`,
        error.stack,
      );
      // Re-throw so BullMQ marks the job as failed and can retry
      throw error;
    }
  }
}

