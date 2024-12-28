import { User } from '../user/entities/user.entity';

export interface IEmail {
  verifyOTPEmail(otp: string, user: User): Promise<void>;
}
