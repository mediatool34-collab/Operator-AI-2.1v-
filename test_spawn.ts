import { spawn } from 'child_process';
import fs from 'fs';

const child = spawn('node', ['dist/server.js']);
const stream = fs.createWriteStream('run-server.log');
child.stdout.pipe(stream);
child.stderr.pipe(stream);

setTimeout(() => {
  child.kill();
  process.exit(0);
}, 3000);
