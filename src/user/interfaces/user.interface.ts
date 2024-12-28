import { User } from '../entities/user.entity';

export interface IUser extends User {
  password: string;
}
