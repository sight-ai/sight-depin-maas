import readline from 'readline';

import { bootstrap } from '@saito/api-server/bootstrap';

async function startCli() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('cli> ');
  rl.prompt();

  rl.on('line', async (line) => {
    const command = line.trim();
    if (command === 'exit') {
      rl.close();
    } else {
      // Send command to API server here
      console.log(`⚙️ Command received: ${command}`);
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('👋 CLI exited.');
    process.exit(0);
  });
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'start':
      await bootstrap();
      break;
    case 'cli':
      await startCli();
      break;
    default:
      console.log(`❓ Unknown command: ${command}`);
      console.log('Usage: sight.exe <start|cli>');
      process.exit(1);
  }
}

main();
