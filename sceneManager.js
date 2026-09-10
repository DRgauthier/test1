class SceneManager {
  constructor() {
    this.currentScene = 'BASE'; // 'BASE' or 'WORLD'
  }

  toggleScene() {
    if (this.currentScene === 'BASE') {
      this.currentScene = 'WORLD';
      // Hide base building UI
      const buildMenu = document.getElementById('build-menu-container');
      if (buildMenu) {
        buildMenu.style.display = 'none';
      }
      const npcMenu = document.getElementById('npc-menu');
      if (npcMenu) {
        npcMenu.style.display = 'none';
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
