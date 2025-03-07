import got from 'got-cjs';

export function startHeartBeat(url?: string) {
  if (url) {
    console.log(`Starting heartbeat to ${url}`);
    setInterval(() => {
      got(url).catch(e => {
        console.error(`Heartbeat failed: ${e}`);
      });
    }, 1000 * 5);
  } else {
    console.log('No heartbeat url specified, skipping heartbeat');
  }
}
