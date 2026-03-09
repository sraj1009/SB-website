import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🐝 Starting SINGGLEBEE Full-Stack Environment...');

// Start Frontend
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// Start Backend
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'server'),
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n🍯 Shutting down the hive...');
  frontend.kill();
  backend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

frontend.on('exit', (code) => {
  if (code !== 0 && code !== null) console.error(`Frontend exited with code ${code}`);
  cleanup();
});

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) console.error(`Backend exited with code ${code}`);
  cleanup();
});
