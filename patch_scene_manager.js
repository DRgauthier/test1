const fs = require('fs');
let code = fs.readFileSync('sceneManager.js', 'utf8');

// Ensure worldMap.update() is called in the render loop if we are in map view
code = code.replace(
  /if \(window\.worldMap\) window\.worldMap\.draw\(ctx\);/,
  `if (window.worldMap) {
        window.worldMap.update();
        window.worldMap.draw(ctx);
      }`
);

fs.writeFileSync('sceneManager.js', code);
