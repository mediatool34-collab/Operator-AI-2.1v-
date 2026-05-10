import { exec } from 'child_process';
const child = exec('npx node dist/server.js', (err, stdout, stderr) => {
  console.log(stdout);
  console.error(stderr);
});
setTimeout(() => {
  child.kill();
  process.exit(0);
}, 3000);
