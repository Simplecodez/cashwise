import { NextFunction, Request, Response } from 'express';

export const catchAsync = (
  func: (req: Request, res: Response, next?: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch(next);
  };
};
