const fs = require('fs');
let code = fs.readFileSync('worldMap.js', 'utf8');

// Call updateConscripts after we fetch GameData
code = code.replace(
  /this\.calculateNetworkMultiplier\(\);\n    \}/,
  `this.calculateNetworkMultiplier();
      this.updateConscripts();
    }`
);

// Call updateConscripts in the update loop (with a simple throttle so we don't spam it)
code = code.replace(
  /  update\(\) \{/,
  `  update() {
    if (!this.lastConscriptCheck || Date.now() - this.lastConscriptCheck > 60000) {
      this.lastConscriptCheck = Date.now();
      this.updateConscripts();
    }`
);

fs.writeFileSync('worldMap.js', code);
