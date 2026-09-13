const fs = require('fs');
let code = fs.readFileSync('worldMap.js', 'utf8');

// Ensure resolveDeployments is called in the update loop
code = code.replace(
  /  update\(\) \{/,
  `  update() {
    this.resolveDeployments();`
);

fs.writeFileSync('worldMap.js', code);
