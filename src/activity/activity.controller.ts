import { singleton } from 'tsyringe';
import { ActivityService } from './service/activity.service';
import { catchAsync } from '../utils/catch-async.utils';
import { IRequest } from '../user/interfaces/user.interface';
import { Request } from 'express';
import {
  paginationValidator,
  validatePaginationParams
} from '../common/pagination/pagination/validator';
import { getOneValidator } from '../account/validator/account.validator';
import { PaginationParams } from '../common/pagination/pagination/pagination.args';

@singleton()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  getUserActivities() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const { paginationParams } = await validatePaginationParams(
        req.query as { limit: string; nextCursor?: string; filter?: string }
      );

      const { id: userId } = (req as IRequest).user;

      const activities = await this.activityService.findAll(userId, paginationParams);

      res.json({
        status: 'success',
        activities
      });
    });
  }
}
