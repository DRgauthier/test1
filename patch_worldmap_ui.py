import re

with open('worldMap.js', 'r') as f:
    content = f.read()

# Replace openDeployMenu with the new UI logic
new_open_menu = """  openDeployMenu(hex) {
    this.selectedHex = hex;

    const hexPanel = document.getElementById('hex-panel');
    if (!hexPanel) return;

    hexPanel.style.display = 'block';
    document.getElementById('hex-coords').innerText = `Hex Location: (${hex.q}, ${hex.r})`;

    document.getElementById('hex-content-npc').style.display = 'none';
    document.getElementById('hex-content-captured').style.display = 'none';

    if (hex.state === 'NPC_BASE') {
      document.getElementById('hex-content-npc').style.display = 'block';
      document.getElementById('deploy-npc-diff').innerText = '★'.repeat(hex.difficulty) + '☆'.repeat(5 - hex.difficulty);

      // Calculate travel time (distance to home base)
      const homeQ = window.currentUser.hex_x;
      const homeR = window.currentUser.hex_y;
      // Axial distance
      const dQ = Math.abs(homeQ - hex.q);
      const dR = Math.abs(homeR - hex.r);
      const dS = Math.abs(-homeQ - homeR - (-hex.q - hex.r));
      const dist = Math.max(dQ, dR, dS);

      // Example: 10 mins per hex distance
      const travelMins = dist * 10;
      document.getElementById('deploy-npc-time').innerText = `${travelMins} mins`;

      document.getElementById('deploy-avail-s').innerText = window.npcManager.counts.soldier;
      document.getElementById('deploy-avail-m').innerText = window.npcManager.counts.medic;

      // Calculate total conscripts from all captured bases
      let totalConscripts = 0;
      if (this.capturedTiles) {
        for (const ct of this.capturedTiles) {
          totalConscripts += ct.conscript_count;
        }
      }
      document.getElementById('deploy-avail-conscripts').innerText = totalConscripts;

      const maxCap = this.getHighestAvailableGunshipCapacity() || 20;
      const availableStacks = Math.floor(totalConscripts / maxCap);
      document.getElementById('deploy-avail-stacks').innerText = availableStacks;

      document.getElementById('world-deploy-stacks').max = availableStacks;
      document.getElementById('world-deploy-stacks').value = 0;

      document.getElementById('world-deploy-gunships').max = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP').length;
      document.getElementById('world-deploy-gunships').value = 0;

      document.getElementById('world-deploy-s').max = window.npcManager.counts.soldier;
      document.getElementById('world-deploy-s').value = 0;
      document.getElementById('world-deploy-m').max = window.npcManager.counts.medic;
      document.getElementById('world-deploy-m').value = 0;

    } else if (hex.state === 'CAPTURED') {
      document.getElementById('hex-content-captured').style.display = 'block';

      const networkEl = document.getElementById('captured-network-status');
      if (hex.inNetwork) {
        networkEl.innerText = 'Connected';
        networkEl.style.color = '#48bb78';
      } else {
        networkEl.innerText = 'Disconnected';
        networkEl.style.color = '#fc8181';
      }

      const diff = hex.difficulty || 1;
      const baseCap = diff * 50;
      const capMultiplier = hex.inNetwork ? 2 : 1;
      const maxCap = baseCap * capMultiplier;

      const baseRate = diff * 10;
      const rateMultiplier = hex.inNetwork ? 1.5 : 1;
      const hourlyRate = Math.floor(baseRate * rateMultiplier);

      document.getElementById('captured-conscripts').innerText = hex.conscript_count || 0;
      document.getElementById('captured-conscript-cap').innerText = maxCap;
      document.getElementById('captured-conscript-rate').innerText = hourlyRate;

      if (hex.garrison_troops) {
        document.getElementById('captured-s-count').innerText = hex.garrison_troops.soldier || 0;
        document.getElementById('captured-m-count').innerText = hex.garrison_troops.medic || 0;
      }
    }
  }

  updateDeploymentsUI() {
    const panel = document.getElementById('deployments-panel');
    const list = document.getElementById('deployments-list');
    const countEl = document.getElementById('deployments-count');

    if (!panel || !this.activeDeployments) return;

    if (this.activeDeployments.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    countEl.innerText = this.activeDeployments.length;

    list.innerHTML = '';
    const now = new Date();

    for (const dep of this.activeDeployments) {
      const arrival = new Date(dep.arrival_time);
      const remainingMs = arrival - now;
      let timeString = 'Arriving...';

      if (remainingMs > 0) {
        const remainingSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(remainingSecs / 60);
        const secs = remainingSecs % 60;
        timeString = `${mins}m ${secs}s`;
      }

      let title = dep.is_return_trip ? 'Return Trip' : 'Assault Fleet';
      let payloadText = '';
      if (dep.payload.stacks > 0) {
        payloadText += `${dep.payload.stacks}x Conscript Stacks<br>`;
      }
      if (dep.payload.gunships > 0) {
        payloadText += `${dep.payload.gunships}x Gunships (S:${dep.payload.soldiers} M:${dep.payload.medics})<br>`;
      }
      if (dep.is_return_trip) {
        payloadText = 'Empty';
      }

      const item = document.createElement('div');
      item.style.cssText = `background: #1a202c; padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid ${dep.is_return_trip ? '#ecc94b' : '#e53e3e'}; font-family: sans-serif;`;
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <b style="color: ${dep.is_return_trip ? '#ecc94b' : '#fc8181'}; font-size: 13px;">${title}</b>
          <span style="color: #a0aec0; font-size: 12px; font-family: monospace;">${timeString}</span>
        </div>
        <div style="font-size: 11px; color: #cbd5e0; margin-bottom: 4px;">
          Target: (${dep.target_q}, ${dep.target_r})
        </div>
        <div style="font-size: 11px; color: #a0aec0;">
          ${payloadText}
        </div>
      `;
      list.appendChild(item);
    }
  }"""

pattern = re.compile(r'  openDeployMenu\(hex\) \{[\s\S]*?  closeDeployMenu\(\) \{', re.DOTALL)
new_content = pattern.sub(new_open_menu + "\n\n  closeDeployMenu() {", content)

with open('worldMap.js', 'w') as f:
    f.write(new_content)

print("WorldMap UI Patched")
