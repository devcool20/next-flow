import { spawn } from 'node:child_process';

let shuttingDown = false;
const children = new Set();

function startProcess(name, args) {
  const child = spawn('npm', args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  children.add(child);

  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const other of children) {
      if (!other.killed) {
        other.kill();
      }
    }

    if (signal) {
      process.exitCode = 1;
      return;
    }

    process.exitCode = typeof code === 'number' ? code : 1;
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start`, error);
    process.exitCode = 1;
  });

  return child;
}

const nextDev = startProcess('next', ['run', 'dev:next']);
const triggerDev = startProcess('trigger', ['run', 'dev:trigger']);

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of [nextDev, triggerDev]) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  shuttingDown = true;
  for (const child of [nextDev, triggerDev]) {
    if (!child.killed) {
      child.kill();
    }
  }
});
