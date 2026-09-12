class SceneManager {
  constructor() {
    this.currentScene = 'BASE'; // 'BASE' or 'WORLD'
  }

  toggleScene() {
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
    } else {
      this.currentScene = 'BASE';
      // Show base building UI
      const buildMenu = document.getElementById('build-menu-container');
      if (buildMenu) {
        buildMenu.style.display = 'block';
      }
      const npcMenu = document.getElementById('npc-menu');
      if (npcMenu) {
        npcMenu.style.display = 'block';
      }

      // Also close the hex panel if it's open
      const hexPanel = document.getElementById('hex-panel');
      if (hexPanel) {
        hexPanel.style.display = 'none';
      }
    }

    // Update button text if it exists
    const toggleBtn = document.getElementById('scene-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerText = this.currentScene === 'BASE' ? 'View World Map' : 'View Base';
    }
  }
}
