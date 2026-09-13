const fs = require('fs');
let code = fs.readFileSync('worldMap.js', 'utf8');

// We need to call updateDeploymentsUI periodically.
// Let's add an update method to WorldMap.
const updateMethod = `
  update() {
    this.updateDeploymentsUI();
  }

  getHexAt(worldX, worldY) {
`;

code = code.replace(/  getHexAt\(worldX, worldY\) \{/, updateMethod);
fs.writeFileSync('worldMap.js', code);
