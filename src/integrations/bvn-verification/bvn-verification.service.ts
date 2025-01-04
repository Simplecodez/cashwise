import { singleton } from 'tsyringe';
import { readFileSync } from 'fs';
import { UserService } from '../../user/services/user/base-user.service';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import {
  BvnRecord,
  IBvnService
} from '../interfaces/bvn-verification.services.interface';
import { CommonUtils } from '../../utils/common.utils';

@singleton()
export class BvnService implements IBvnService {
  private static readonly mockBVNs: BvnRecord[] = JSON.parse(
    readFileSync(`${__dirname}/../../mock-data/bvn-mock-data.json`, { encoding: 'utf-8' })
  );

  constructor(private readonly userService: UserService) {}

  private isMatched(user: User, bvnRecord: BvnRecord) {
    return (
      user.firstName.toLowerCase() === bvnRecord.firstName.toLowerCase() &&
      user.lastName.toLowerCase() === bvnRecord.lastName.toLowerCase() &&
      user.phoneNumber.replace(/^\+234/, '0') === bvnRecord.phoneNumber &&
      CommonUtils.formatDate(user.dateOfBirth) === bvnRecord.phoneNumber
    );
  }

  async verifyBvn(bvn: string, userId: string) {
    const bvnRecord = BvnService.mockBVNs.find((value) => value.bvn === bvn);
    if (!bvnRecord) {
      return { isVerified: false, rejectionReason: 'Invalid BVN' };
    }
    const options: FindOneOptions<User> = {
      where: { id: userId }
    };

    const user = await this.userService.findUserByOptions(options);
    if (!user) return { isVerified: false, rejectionReason: 'Invalid BVN' };

    if (!this.isMatched(user, bvnRecord))
      return { isVerified: false, rejectionReason: 'Details mismatch' };

    return { isVerified: true };
  }
}
