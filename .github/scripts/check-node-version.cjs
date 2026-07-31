'use strict';

const requiredMajor = 22;
const currentMajor = Number(process.versions.node.split('.')[0]);

if (currentMajor !== requiredMajor) {
  console.error(
    `[pre-push] Node.js ${requiredMajor}.x is required; current runtime is ${process.version}.`,
  );
  process.exit(1);
}
