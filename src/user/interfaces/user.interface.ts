import { Request } from 'express';
import { User } from '../entities/user.entity';

export interface IUser extends User {
  password: string;
}

export interface IRequest extends Request {
  user: User;
}
