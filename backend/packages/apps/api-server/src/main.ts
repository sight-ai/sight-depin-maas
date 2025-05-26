import { bootstrap } from './bootstrap';

bootstrap().catch(e => {
  console.error(e);
  process.exit(1);
});
