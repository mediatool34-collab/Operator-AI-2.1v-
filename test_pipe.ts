import { spawn } from 'child_process';

const child = spawn('node', ['dist/server.js'], { stdio: 'pipe' });

child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));

setTimeout(() => {
  console.log('\n--- TIMEOUT REACHED ---');
  child.kill();
  process.exit(0);
}, 5000);
