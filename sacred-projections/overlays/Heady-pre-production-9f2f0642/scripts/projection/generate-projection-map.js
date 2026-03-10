'use strict';

const fs = require('fs');
const path = require('path');
const manifest = require('../../src/projection/domain-remotes');

const outputPath = path.resolve(process.cwd(), 'projection-map.generated.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
process.stdout.write(`Projection map written to ${outputPath}
`);
