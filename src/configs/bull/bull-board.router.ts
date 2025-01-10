import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { Queue } from 'bullmq';
import { singleton } from 'tsyringe';
import { CommunicationQueue } from '../../communication/job-processor/communication.queue';
import { KycQueue } from '../../user/job-processors/kyc.queue';
import { AccountQueue } from '../../account/job-processor/account.queue';

@singleton()
export class BullBoardRouter {
  private queues: Queue[];
  private queueList: BullAdapter[];
  private serverAdapter: ExpressAdapter;

  constructor(
    private readonly communicationQueue: CommunicationQueue,
    private readonly kycQueue: KycQueue,
    private readonly accountQueue: AccountQueue
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.queues = [
      this.communicationQueue.getQueue(),
      this.kycQueue.getQueue(),
      this.accountQueue.getQueue()
    ];
    this.queueList = this.queues.map((queue) => new BullAdapter(queue));
    createBullBoard({
      queues: this.queueList,
      serverAdapter: this.serverAdapter
    });
    this.serverAdapter.setBasePath('/admin/queues');
  }

  public getRouter() {
    return this.serverAdapter.getRouter();
  }
}
