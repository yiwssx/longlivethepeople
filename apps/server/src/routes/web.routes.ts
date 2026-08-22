import express, { type NextFunction, type Request, type Response } from 'express';
import config from '../config/index.ts';

const router = express.Router();

const sendFrontend = (_req: Request, res: Response, next: NextFunction) => {
  res.sendFile(config.frontend.indexPath, (error) => {
    if (error) next(error);
  });
};

router.get('/', sendFrontend);
router.get('/memorial', sendFrontend);
router.post('/', (_req, res) => res.redirect(303, '/memorial'));

export default router;
