const fs = require('fs');
const path = 'src/app/api/run/route.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove SELECT 1
content = content.replace(/await prisma\.\$queryRaw`SELECT 1`;\r?\n\r?\n/g, '');

// 2. Wrap getPersistedOutputs prisma call
const getOutputsRegex = /const executions = await prisma\.nodeExecution\.findMany\(\{([\s\S]*?)\}\);/g;
content = content.replace(getOutputsRegex, 'const executions = await withRetry(() => prisma.nodeExecution.findMany({$1}));');

// 3. Wrap findFirst for workflow
const findWorkflowRegex = /const workflow = await prisma\.workflow\.findFirst\(\{([\s\S]*?)\}\);/g;
content = content.replace(findWorkflowRegex, 'const workflow = await withRetry(() => prisma.workflow.findFirst({$1}));');

// 4. Wrap create for workflowRun
const createRunRegex = /const run = await prisma\.workflowRun\.create\(\{([\s\S]*?)\}\);/g;
content = content.replace(createRunRegex, 'const run = await withRetry(() => prisma.workflowRun.create({$1}));');

// 5. Wrap create for nodeExecution (onNodeStart)
const createExecRegex = /const execution = await prisma\.nodeExecution\.create\(\{([\s\S]*?)\}\);/g;
content = content.replace(createExecRegex, 'const execution = await withRetry(() => prisma.nodeExecution.create({$1}));');

// 6. Wrap update for nodeExecution (onNodeFinish)
const updateExecRegex = /await prisma\.nodeExecution\.update\(\{([\s\S]*?)\}\);/g;
content = content.replace(updateExecRegex, 'await withRetry(() => prisma.nodeExecution.update({$1}));');

// 7. Wrap update for workflowRun (success/fail)
const updateRunRegex = /await prisma\.workflowRun\.update\(\{([\s\S]*?)\}\);/g;
content = content.replace(updateRunRegex, 'await withRetry(() => prisma.workflowRun.update({$1}));');

fs.writeFileSync(path, content);
console.log('Successfully updated run/route.ts with retries');
