class SceneManager {
  constructor() {
    this.currentScene = 'BASE'; // 'BASE', 'WORLD', 'COMBAT'
  }

  toggleScene() {
    const btn = document.getElementById('scene-toggle-btn');
    if (!btn) return;

    if (this.currentScene === 'BASE') {
      this.currentScene = 'WORLD';

      // Cancel any ongoing building/deconstructing actions
      if (window.structureManager) {
        window.structureManager.cancelAction();
      }

      // Hide base building UI
      const buildMenu = document.getElementById('build-menu-container');
      if (buildMenu) {
        buildMenu.style.display = 'none';
      }
      const npcMenu = document.getElementById('npc-menu');
      if (npcMenu) {
        npcMenu.style.display = 'none';
      }
      const upgradeMenu = document.getElementById('upgrade-menu');
      if (upgradeMenu) {
        upgradeMenu.style.display = 'none';
      }

      const lbBtn = document.getElementById('leaderboard-toggle-btn');
      if (lbBtn) lbBtn.style.display = 'inline-block';

      if (window.worldMap) {
        window.worldMap.updateDeploymentsUI();
      }

      btn.innerText = 'View Home Base';
    } else if (this.currentScene === 'WORLD') {
      this.currentScene = 'BASE';

      // Hide world map UI panels
      const hexPanel = document.getElementById('hex-panel');
      if (hexPanel) {
        hexPanel.style.display = 'none';
      }
      const deployPanel = document.getElementById('deployments-panel');
      if (deployPanel) {
        deployPanel.style.display = 'none';
      }

      const lbBtn = document.getElementById('leaderboard-toggle-btn');
      if (lbBtn) lbBtn.style.display = 'none';
      const lbUI = document.getElementById('leaderboard-ui');
      if (lbUI) lbUI.style.display = 'none';

      // Show base building UI
      const buildMenu = document.getElementById('build-menu-container');
      if (buildMenu) {
        buildMenu.style.display = 'flex';
      }
      const npcMenu = document.getElementById('npc-menu');
      if (npcMenu) {
        npcMenu.style.display = 'flex';
      }

      btn.innerText = 'View World Map';

      if (window.structureManager) {
        window.structureManager.renderBuildMenu();
      }
    }

    // Reset camera when switching
    if (window.getCurrentCamera) {
      const cam = window.getCurrentCamera();
      if (cam) {
        cam.x = 0;
        cam.y = 0;
        cam.zoom = 1;
      }
    }
  }
}

// Instantiate globally
window.sceneManager = new SceneManager();
