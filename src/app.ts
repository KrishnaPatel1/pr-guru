import Boom from 'boom';
import dotenv from 'dotenv';
import express, {
  ErrorRequestHandler, Request, Response, NextFunction,
} from 'express';
import path from 'path';
import pinoExpressType from 'express-pino-logger';

import { log } from './utils/log';
import router from './routes/index';

dotenv.config();
const pinoExpress = pinoExpressType({ logger: log });

const app = express();

type ErrorHandler = ErrorRequestHandler & {
  response?: {
    data: string,
    status: number,
  }
  message: string,
}

export default async function init() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(pinoExpress);

  app.use('/', router);

  // catch 404 and forward to error handler
  app.use((req : Request, res : Response, next : NextFunction) => {
    next(Boom.notFound());
  });

  // error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err : ErrorHandler, req : Request, res : Response, next : NextFunction) => {
    let error;
    if (Boom.isBoom(err)) {
      error = err;
    } else if (err.response) {
      const { data, status } = err.response;
      error = Boom.boomify(err, { statusCode: status, message: data });
    } else {
      error = Boom.internal(err.message);
    }

    const { statusCode, payload } = error.output;
    log.error(error);
    res.status(statusCode).json(payload);
  });

  return app;
}
