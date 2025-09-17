import { createServer, closeServer } from './app.js';

const run = async () => {
  const serverInfo = await createServer();

  const onCloseSignal = async () => {
    setTimeout(() => process.exit(1), 10000).unref();
    await closeServer(serverInfo);
    process.exit();
  };

  process.on('SIGINT', onCloseSignal);
  process.on('SIGTERM', onCloseSignal);
};

run();

