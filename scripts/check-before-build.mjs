import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const runBuild = args.has('--build');

const failures = [];
const warnings = [];

const requiredEnvKeys = [
  'WEB_PORT',
  'API_PORT',
  'WEB_ORIGIN',
  'DATABASE_URL',
  'JWT_SECRET',
];

function filePath(relativePath) {
  return resolve(rootDir, relativePath);
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(filePath(relativePath), 'utf8'));
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function readText(relativePath) {
  try {
    return readFileSync(filePath(relativePath), 'utf8');
  } catch {
    failures.push(`${relativePath}: file not found`);
    return '';
  }
}

function getEnvKeys(relativePath) {
  if (!existsSync(filePath(relativePath))) return null;

  return new Set(
    readText(relativePath)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
      .filter(Boolean),
  );
}

function requireFile(relativePath) {
  if (!existsSync(filePath(relativePath))) {
    failures.push(`${relativePath}: file not found`);
  }
}

function requireScript(pkg, packagePath, scriptName) {
  if (!pkg?.scripts?.[scriptName]) {
    failures.push(`${packagePath}: missing script "${scriptName}"`);
  }
}

function commandName(baseCommand) {
  return process.platform === 'win32' ? `${baseCommand}.cmd` : baseCommand;
}

function runCommand(label, command, commandArgs) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    failures.push(`${label}: ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    failures.push(`${label}: exited with code ${result.status}`);
  }
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) {
    failures.push(`Node.js 20 or newer is required. Current: ${process.version}`);
  }
}

function checkPackageFiles() {
  const rootPackage = readJson('package.json');
  const webPackage = readJson('apps/web/package.json');
  readJson('apps/api/package.json');
  readJson('packages/database/package.json');

  if (!Array.isArray(rootPackage?.workspaces)) {
    failures.push('package.json: npm workspaces are not configured');
  }

  requireScript(rootPackage, 'package.json', 'dev');
  requireScript(rootPackage, 'package.json', 'build');
  requireScript(rootPackage, 'package.json', 'check');
  requireScript(rootPackage, 'package.json', 'build:test');
  requireScript(webPackage, 'apps/web/package.json', 'dev');
  requireScript(webPackage, 'apps/web/package.json', 'typecheck');
  requireScript(webPackage, 'apps/web/package.json', 'build');
}

function checkEnvFiles() {
  const exampleKeys = getEnvKeys('.env.example');
  const localKeys = getEnvKeys('.env');

  if (!exampleKeys) {
    failures.push('.env.example: file not found');
    return;
  }

  for (const key of requiredEnvKeys) {
    if (!exampleKeys.has(key)) {
      failures.push(`.env.example: missing ${key}`);
    }
  }

  if (!localKeys) {
    warnings.push('.env is missing. Copy .env.example to .env for local development.');
    return;
  }

  for (const key of exampleKeys) {
    if (!localKeys.has(key)) {
      warnings.push(`.env: missing ${key}`);
    }
  }
}

function checkProjectFiles() {
  requireFile('apps/web/src/main.tsx');
  requireFile('apps/web/src/styles.css');
  requireFile('apps/web/vite.config.mjs');
  requireFile('apps/web/prototype.html');
  requireFile('docs/mvp-v2-design.md');
}

function checkInstallState() {
  if (!existsSync(filePath('node_modules'))) {
    failures.push('node_modules is missing. Run "npm install" first.');
  }
}

function printResult() {
  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (failures.length > 0) {
    console.error('\nBuild check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nBuild check passed.');
}

console.log('Running 경남차유리 ERP build check...');

checkNodeVersion();
checkPackageFiles();
checkEnvFiles();
checkProjectFiles();
checkInstallState();

if (!quick && failures.length === 0) {
  const npm = commandName('npm');
  runCommand('web typecheck', npm, ['--workspace=@seoyoung-erp/web', 'run', 'typecheck']);

  if (runBuild && failures.length === 0) {
    runCommand('web production build', npm, ['--workspace=@seoyoung-erp/web', 'run', 'build']);
  }
}

printResult();
