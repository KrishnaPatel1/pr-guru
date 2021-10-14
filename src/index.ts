import config from 'config';
import init from './app';
import { log } from './utils/log';

init().then((app) => {
  const port = config.get('port');

  app.listen(port, () => {
    log.info(`Listening on PORT ${port}`);
  });
});
