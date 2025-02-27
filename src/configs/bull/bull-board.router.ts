import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { Queue } from 'bullmq';
import { singleton } from 'tsyringe';
import { CommunicationQueue } from '../../communication/job-processor/communication.queue';
import { KycQueue } from '../../user/job-processors/kyc.queue';
import { AccountQueue } from '../../account/job-processor/account.queue';
import { TransactionQueue } from '../../account/job-processor/transaction.queue';
import { BeneficiaryQueue } from '../../account/job-processor/beneficiary.queue';
import { ActivityQueue } from '../../activity/job-processor/activity.queue';

@singleton()
export class BullBoardRouter {
  private queues: Queue[];
  private queueList: BullAdapter[];
  private serverAdapter: ExpressAdapter;

  constructor(
    private readonly communicationQueue: CommunicationQueue,
    private readonly kycQueue: KycQueue,
    private readonly accountQueue: AccountQueue,
    private readonly transactionQueue: TransactionQueue,
    private readonly beneficiaryQueue: BeneficiaryQueue,
    private readonly activityQueue: ActivityQueue
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.queues = [
      this.communicationQueue.getQueue(),
      this.kycQueue.getQueue(),
      this.accountQueue.getQueue(),
      this.transactionQueue.getQueue(),
      this.beneficiaryQueue.getQueue(),
      this.activityQueue.getQueue()
    ];
    this.queueList = this.queues.map((queue) => new BullAdapter(queue));
    createBullBoard({
      queues: this.queueList,
      serverAdapter: this.serverAdapter
    });
    this.serverAdapter.setBasePath('/admin/queues');
  }

  get getRouter() {
    return this.serverAdapter.getRouter();
  }
}
