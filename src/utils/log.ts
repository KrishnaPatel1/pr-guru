import config from 'config';
import loggerPino, { Logger, DestinationStream, LoggerOptions } from 'pino';

const options : LoggerOptions | DestinationStream = config.get('logger.pinoOptions');
export const log : Logger = loggerPino(options);
