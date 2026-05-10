import { execSync } from 'child_process';
try {
  const output = execSync('npx node dist/server.js', { timeout: 3000 });
  console.log('SUCCESS:', output.toString());
} catch(e) {
  console.log('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout.toString());
  if (e.stderr) console.log('STDERR:', e.stderr.toString());
}
