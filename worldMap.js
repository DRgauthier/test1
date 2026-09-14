// Simple seeded PRNG (Mulberry32)
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

class WorldMap {
  constructor(cols = 20, rows = 20, seed = '12345') {
    this.cols = cols;
    this.rows = rows;
    this.hexRadius = 40;
    this.hexWidth = Math.sqrt(3) * this.hexRadius;
    this.hexHeight = 2 * this.hexRadius;
    this.hexes = [];
    this.seed = parseInt(seed) || 12345;
    this.rng = mulberry32(this.seed);

    // Some placeholder colors for biomes
    this.colors = ['#2d3748', '#4a5568', '#276749', '#2f855a', '#744210'];

    this.generateMap();
  }

  getHexNeighbors(hex) {
    // Odd-r offset coordinates neighbors
    const directions = [
      [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]], // even rows
      [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]] // odd rows
    ];

    const parity = hex.r & 1;
    const neighbors = [];

    for (const dir of directions[parity]) {
      const nq = hex.q + dir[0];
      const nr = hex.r + dir[1];
      const neighbor = this.hexes.find(h => h.q === nq && h.r === nr);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  calculateNetworkMultiplier() {
    if (!window.currentUser) return;

    // Reset network status
    for (const hex of this.hexes) {
      hex.inNetwork = false;
    }

    const homeHex = this.hexes.find(h => h.q === window.currentUser.hex_x && h.r === window.currentUser.hex_y);
    if (!homeHex) return;

    homeHex.inNetwork = true;
    const queue = [homeHex];
    const visited = new Set();
    visited.add(`${homeHex.q},${homeHex.r}`);

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.getHexNeighbors(current);

      for (const neighbor of neighbors) {
        if (!visited.has(`${neighbor.q},${neighbor.r}`) && neighbor.state === 'CAPTURED') {
          visited.add(`${neighbor.q},${neighbor.r}`);
          neighbor.inNetwork = true;
          queue.push(neighbor);
        }
      }
    }
  }

  generateMap() {
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        // Offset coordinates to axial or directly to pixel
        const xOffset = (r % 2 === 0) ? 0 : this.hexWidth / 2;
        const x = q * this.hexWidth + xOffset;
        const y = r * this.hexHeight * 0.75;

        const rngVal = this.rng(); // Consume RNG to preserve seed consistency if needed elsewhere

        // Every tile is an NPC base
        let state = 'NPC_BASE';
        let difficulty = Math.floor(this.rng() * 5) + 1;

        this.hexes.push({
          q: q,
          r: r,
          x: x,
          y: y,
          color: this.colors[Math.floor(this.rng() * this.colors.length)],
          state: state,
          difficulty: difficulty
        });
      }
    }
  }

  drawHex(ctx, x, y, radius, color, hexState) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const hx = x + radius * Math.cos(angle);
      const hy = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    if (hexState === 'PLAYER_BASE') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4299e1'; // Using blue border for all player bases to distinguish from NPC/Empty
      ctx.fillStyle = 'rgba(66, 153, 225, 0.2)';
      ctx.fill();
    } else if (hexState === 'NPC_BASE') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e53e3e';
      ctx.fillStyle = 'rgba(229, 62, 62, 0.5)';
      ctx.fill();
    } else if (hexState === 'CAPTURED') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4299e1';
      ctx.fillStyle = 'rgba(66, 153, 225, 0.5)';
      ctx.fill();
    } else if (hexState === 'ACTIVE') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e53e3e';
      ctx.fillStyle = 'rgba(229, 62, 62, 0.3)';
      ctx.fill();
    } else if (hexState === 'RECALLING') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ecc94b';
      ctx.fillStyle = 'rgba(236, 201, 75, 0.3)';
      ctx.fill();
    } else if (hexState === 'HELD') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#48bb78';
      ctx.fillStyle = 'rgba(72, 187, 120, 0.3)';
      ctx.fill();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e0';
    }

    ctx.stroke();
  }


  async fetchGameData() {
    if (!window.supabaseClient || !window.currentUser) return;

    // Fetch other players (existing logic)
    const { data: players } = await window.supabaseClient
      .from('players')
      .select('*')
      .neq('id', window.currentUser.id);

    if (players) {
      this.otherPlayers = players;

      // Override hex state for other players
      for (const player of players) {
        const hex = this.hexes.find(h => h.q === player.hex_x && h.r === player.hex_y);
        if (hex) {
          hex.state = 'PLAYER_BASE';
        }
      }
    }

    // Override hex state for current player
    const homeHex = this.hexes.find(h => h.q === window.currentUser.hex_x && h.r === window.currentUser.hex_y);
    if (homeHex) {
      homeHex.state = 'PLAYER_BASE';
    }

    // Fetch captured tiles
    const { data: capturedTiles } = await window.supabaseClient
      .from('captured_tiles')
      .select('*')
      .eq('player_id', window.currentUser.id);

    if (capturedTiles) {
      this.capturedTiles = capturedTiles;
      for (const ct of capturedTiles) {
        const hex = this.hexes.find(h => h.q === ct.hex_q && h.r === ct.hex_r);
        if (hex) {
          hex.state = 'CAPTURED';
          hex.conscript_count = ct.conscript_count;
          hex.last_conscript_update = ct.last_conscript_update;
          hex.garrison_troops = ct.garrison_troops;
        }
      }
      this.calculateNetworkMultiplier();
      this.updateConscripts();
    }

    // Fetch active deployments
    const { data: deployments } = await window.supabaseClient
      .from('deployments')
      .select('*')
      .eq('player_id', window.currentUser.id);

    if (deployments) {
      this.activeDeployments = deployments;
    } else {
      this.activeDeployments = [];
    }
  }


  draw(ctx) {
    for (const hex of this.hexes) {
      this.drawHex(ctx, hex.x, hex.y, this.hexRadius, hex.color, hex.state);

      // Draw home base indicator for current player
      if (window.currentUser && hex.q === window.currentUser.hex_x && hex.r === window.currentUser.hex_y) {
        ctx.fillStyle = '#4299e1'; // Blue for home base
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw indicators for other players
      if (this.otherPlayers) {
        for (const player of this.otherPlayers) {
          if (hex.q === player.hex_x && hex.r === player.hex_y) {
            ctx.fillStyle = '#e53e3e'; // Red for enemy bases
            ctx.beginPath();
            ctx.arc(hex.x, hex.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }

    // Draw deployment lines
    if (this.activeDeployments && window.currentUser) {
      const now = new Date();
      const natoAlphabet = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu"];

      for (const dep of this.activeDeployments) {
        const originHex = this.hexes.find(h => h.q === dep.origin_q && h.r === dep.origin_r);
        const targetHex = this.hexes.find(h => h.q === dep.target_q && h.r === dep.target_r);

        if (originHex && targetHex) {
          ctx.beginPath();
          ctx.moveTo(originHex.x, originHex.y);
          ctx.lineTo(targetHex.x, targetHex.y);
          ctx.strokeStyle = dep.is_return_trip ? 'rgba(236, 201, 75, 0.8)' : 'rgba(229, 62, 62, 0.8)'; // Yellow for return, Red for assault
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Get gunship phonetic names
          let names = [];
          if (dep.payload && dep.payload.gunship_ids && window.structureManager) {
             const allGunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP' && !window.structureManager.isBuildingUnderConstruction(b));
             // Sort by dbId for consistent phonetic naming
             allGunships.sort((a, b) => a.dbId.localeCompare(b.dbId));

             for (const id of dep.payload.gunship_ids) {
                const index = allGunships.findIndex(b => b.dbId === id);
                if (index !== -1) {
                    names.push(index < natoAlphabet.length ? natoAlphabet[index] : `S${index + 1}`);
                }
             }
          }

          if (dep.payload && dep.payload.stacks > 0) {
              names.push('Conscript');
          }

          const label = names.length > 0 ? `(${names.join(', ')})` : '(Fleet)';

          // Draw text in middle of line
          const midX = (originHex.x + targetHex.x) / 2;
          const midY = (originHex.y + targetHex.y) / 2;

          // Calculate total travel time based on distance
          const dQ = Math.abs(dep.origin_q - dep.target_q);
          const dR = Math.abs(dep.origin_r - dep.target_r);
          const dS = Math.abs(-dep.origin_q - dep.origin_r - (-dep.target_q - dep.target_r));
          const dist = Math.max(dQ, dR, dS);
          const totalTravelMs = dist * 10 * 60 * 1000;

          const arrival = new Date(dep.arrival_time);
          const remainingMs = arrival - now;
          let timeString = 'Arriving...';

          if (remainingMs > 0) {
             const remainingSecs = Math.floor(remainingMs / 1000);
             const mins = Math.floor(remainingSecs / 60);
             const secs = remainingSecs % 60;
             timeString = `${mins}m ${secs}s`;

             // Optionally calculate ship position along line based on progress
             // let progress = 1 - (remainingMs / totalTravelMs);
             // let shipX = originHex.x + (targetHex.x - originHex.x) * progress;
             // let shipY = originHex.y + (targetHex.y - originHex.y) * progress;
          }

          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, midX, midY - 10);

          // Draw time remaining below label
          ctx.fillStyle = '#cbd5e0';
          ctx.font = '10px sans-serif';
          ctx.fillText(timeString, midX, midY + 4);
        }
      }
    }
  }



  async updateConscripts(forceDBUpdate = false) {
    if (!this.capturedTiles || !window.supabaseClient) return;

    const now = new Date();
    const currentHourMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours());
    const currentHour = new Date(currentHourMs);

    let needsDbSync = false;

    for (const ct of this.capturedTiles) {
      const hex = this.hexes.find(h => h.q === ct.hex_q && h.r === ct.hex_r);
      if (!hex || hex.state !== 'CAPTURED') continue;

      const lastUpdate = new Date(ct.last_conscript_update || now);
      // Floor the last update to the start of its hour for consistent ticking
      const lastUpdateHourMs = Date.UTC(lastUpdate.getUTCFullYear(), lastUpdate.getUTCMonth(), lastUpdate.getUTCDate(), lastUpdate.getUTCHours());

      const hoursPassed = Math.floor((currentHourMs - lastUpdateHourMs) / (1000 * 60 * 60));

      if (hoursPassed > 0) {
        const diff = hex.difficulty || 1;
        const baseCap = diff * 50;
        const capMultiplier = hex.inNetwork ? 2 : 1;
        const maxCap = baseCap * capMultiplier;

        const baseRate = diff * 10;
        const rateMultiplier = hex.inNetwork ? 1.5 : 1;
        const hourlyRate = Math.floor(baseRate * rateMultiplier);

        const newConscripts = Math.min(ct.conscript_count + (hourlyRate * hoursPassed), maxCap);

        if (newConscripts !== ct.conscript_count) {
          ct.conscript_count = newConscripts;
          hex.conscript_count = newConscripts;
          ct.last_conscript_update = currentHour.toISOString();
          hex.last_conscript_update = ct.last_conscript_update;

          needsDbSync = true;

          // Fire and forget update
          window.supabaseClient
            .from('captured_tiles')
            .update({
              conscript_count: newConscripts,
              last_conscript_update: ct.last_conscript_update
            })
            .eq('id', ct.id)
            .then(() => {});
        }
      }
    }

    // Periodically re-render if the panel is open to a captured hex
    if (this.selectedHex && this.selectedHex.state === 'CAPTURED') {
        const hex = this.selectedHex;
        const diff = hex.difficulty || 1;
        const baseCap = diff * 50;
        const capMultiplier = hex.inNetwork ? 2 : 1;
        const maxCap = baseCap * capMultiplier;
        const el = document.getElementById('captured-conscripts');
        if (el) el.innerText = hex.conscript_count;
        const capEl = document.getElementById('captured-conscript-cap');
        if (capEl) capEl.innerText = maxCap;
    }
  }

  update() {
    if (!this.lastConscriptCheck || Date.now() - this.lastConscriptCheck > 60000) {
      this.lastConscriptCheck = Date.now();
      this.updateConscripts();
    }

    this.resolveDeployments();
    this.updateDeploymentsUI();
  }

  getHexAt(worldX, worldY) {

    // Simple distance-based hit test for hexes
    let closestHex = null;
    let minDist = Infinity;

    for (const hex of this.hexes) {
      const dist = Math.hypot(hex.x - worldX, hex.y - worldY);
      if (dist < minDist) {
        minDist = dist;
        closestHex = hex;
      }
    }

    // Ensure we actually clicked *inside* the hex (roughly)
    if (minDist <= this.hexRadius) {
      return closestHex;
    }
    return null;
  }

  handleClick(worldX, worldY) {
    const clickedHex = this.getHexAt(worldX, worldY);
    if (clickedHex) {
      this.openDeployMenu(clickedHex);
    } else {
      this.closeDeployMenu();
    }
  }

  openDeployMenu(hex) {
    this.selectedHex = hex;

    const hexPanel = document.getElementById('hex-panel');
    if (!hexPanel) return;

    hexPanel.style.display = 'block';
    document.getElementById('hex-coords').innerText = `Hex Location: (${hex.q}, ${hex.r})`;

    document.getElementById('hex-content-npc').style.display = 'none';
    document.getElementById('hex-content-captured').style.display = 'none';

    if (hex.state === 'PLAYER_BASE') {
      // Just show basic info, no deploy menu for player bases right now
      document.getElementById('hex-coords').innerText += ' (Player Base)';
    } else if (hex.state === 'NPC_BASE') {
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

      const diffValue = hex.difficulty || 1;
      const baseRate = diffValue * 10;
      const connectedRate = Math.floor(baseRate * 1.5);
      document.getElementById('deploy-npc-reward').innerText = `Yields ${baseRate} conscripts/hr (${connectedRate}/hr if connected to homebase)`;

      document.getElementById('deploy-avail-s').innerText = window.npcManager.counts.soldier;
      document.getElementById('deploy-avail-m').innerText = window.npcManager.counts.medic;
      const juggEl = document.getElementById('deploy-avail-j');
      if (juggEl) juggEl.innerText = window.npcManager.counts.juggernaut;

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

      // Player Gunships List Population
      const playerGunshipsList = document.getElementById('player-gunships-list');
      playerGunshipsList.innerHTML = ''; // Clear existing

      const allGunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP' && !window.structureManager.isBuildingUnderConstruction(b));

      // Sort by dbId to maintain consistent order for naming
      allGunships.sort((a, b) => a.dbId.localeCompare(b.dbId));

      const natoAlphabet = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu"];

      // Find which gunships are currently deployed
      const deployedGunshipIds = new Set();
      for (const dep of this.activeDeployments) {
         if (dep.payload.gunship_ids) {
            for (const id of dep.payload.gunship_ids) {
               deployedGunshipIds.add(id);
            }
         }
      }

      let availableCount = 0;
      allGunships.forEach((gunship, index) => {
         const phonetic = index < natoAlphabet.length ? natoAlphabet[index] : `Squadron ${index + 1}`;
         const name = `Gunship ${phonetic}`;

         if (deployedGunshipIds.has(gunship.dbId)) return; // Skip deployed ones

         let s = 0, m = 0, j = 0;
         if (window.vehicleManager) {
            const v = window.vehicleManager.vehicles.find(veh => veh.building_id === gunship.dbId);
            if (v && v.assigned_troops) {
               s = v.assigned_troops.soldier || 0;
               m = v.assigned_troops.medic || 0;
               j = v.assigned_troops.juggernaut || 0;
            }
         }

         const label = document.createElement('label');
         label.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 11px; color: white; background: #2d3748; padding: 6px; border-radius: 4px; border: 1px solid #718096; cursor: pointer;';

         const checkbox = document.createElement('input');
         checkbox.type = 'checkbox';
         checkbox.value = gunship.dbId;
         checkbox.className = 'player-gunship-checkbox';

         const text = document.createElement('span');
         text.innerText = `${name} [S:${s} M:${m} J:${j}]`;

         label.appendChild(checkbox);
         label.appendChild(text);
         playerGunshipsList.appendChild(label);
         availableCount++;
      });

      if (availableCount === 0) {
         const emptyMsg = document.createElement('div');
         emptyMsg.style.cssText = 'font-size: 11px; color: #a0aec0; font-style: italic;';
         emptyMsg.innerText = "No available gunships.";
         playerGunshipsList.appendChild(emptyMsg);
      }

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
    if (this._lastUiUpdate && Date.now() - this._lastUiUpdate < 1000) return;
    this._lastUiUpdate = Date.now();
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

      // Get phonetic names for UI list
      let names = [];
      if (dep.payload && dep.payload.gunship_ids && window.structureManager) {
         const allGunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP' && !window.structureManager.isBuildingUnderConstruction(b));
         allGunships.sort((a, b) => a.dbId.localeCompare(b.dbId));
         const natoAlphabet = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu"];
         for (const id of dep.payload.gunship_ids) {
            const index = allGunships.findIndex(b => b.dbId === id);
            if (index !== -1) {
                names.push(index < natoAlphabet.length ? natoAlphabet[index] : `S${index + 1}`);
            }
         }
      }

      const namesStr = names.length > 0 ? ` (${names.join(', ')})` : '';

      const item = document.createElement('div');
      item.style.cssText = `background: #1a202c; padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid ${dep.is_return_trip ? '#ecc94b' : '#e53e3e'}; font-family: sans-serif;`;
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <b style="color: ${dep.is_return_trip ? '#ecc94b' : '#fc8181'}; font-size: 13px;">${title}${namesStr}</b>
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
  }

  closeDeployMenu() {
    this.selectedHex = null;
    const hexPanel = document.getElementById('hex-panel');
    if (hexPanel) {
      hexPanel.style.display = 'none';
    }
  }

  getHighestAvailableGunshipCapacity() {
    let maxCap = 0;
    // We get the total number of built gunships
    const gunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP' && !window.structureManager.isBuildingUnderConstruction(b));
    // Currently deployed gunships equal the number of active deployments + recalls
    // Active deployments represent an outgoing or returning gunship
    // For simplicity, we just check each gunship's theoretical max cap.
    // If we wanted to tie a specific gunship instance to a mission, we'd need to mark them 'in-use'.
    // For now, implicit rule: highest level gunship gives max cap.
    for (const b of gunships) {
      const cap = 20 + ((b.level - 1) * 10);
      if (cap > maxCap) {
        maxCap = cap;
      }
    }
    return maxCap;
  }

  async deployAttack() {
    if (!this.selectedHex || this.selectedHex.state !== 'NPC_BASE') return;
    if (!window.supabaseClient || !window.currentUser) return;

    const checkboxes = document.querySelectorAll('.player-gunship-checkbox:checked');
    const gunshipIds = Array.from(checkboxes).map(cb => cb.value);
    const stacksCount = parseInt(document.getElementById('world-deploy-stacks').value) || 0;

    if (gunshipIds.length === 0 && stacksCount === 0) {
      return alert("You must deploy at least one player gunship or conscript gunship.");
    }

    let sCount = 0;
    let mCount = 0;
    let jCount = 0;

    // Tally and deduct troops from assigned gunships
    if (window.vehicleManager) {
      for (const gid of gunshipIds) {
        const vehicle = window.vehicleManager.vehicles.find(v => v.building_id === gid);
        if (vehicle && vehicle.assigned_troops) {
          sCount += vehicle.assigned_troops.soldier || 0;
          mCount += vehicle.assigned_troops.medic || 0;
          jCount += vehicle.assigned_troops.juggernaut || 0;

          // Zero out assignments
          vehicle.assigned_troops.soldier = 0;
          vehicle.assigned_troops.medic = 0;
          vehicle.assigned_troops.juggernaut = 0;
          await window.vehicleManager.saveVehicle(vehicle);
        }
      }

      // Update global total troops to reflect lost troops that are deployed
      window.vehicleManager.totalTroops.soldier = Math.max(0, window.vehicleManager.totalTroops.soldier - sCount);
      window.vehicleManager.totalTroops.medic = Math.max(0, window.vehicleManager.totalTroops.medic - mCount);
      window.vehicleManager.totalTroops.juggernaut = Math.max(0, window.vehicleManager.totalTroops.juggernaut - jCount);
      window.vehicleManager.updateAvailableTroops();

      if (window.npcManager) {
        window.npcManager.syncTroopsToDb();
      }
    }

    // Remove base troops locally immediately
    // Note: since we don't have missionManager anymore, we just manually remove them
    let removedS = 0, removedM = 0, jRemoved = 0;
    for (let i = window.npcManager.npcs.length - 1; i >= 0; i--) {
      const npc = window.npcManager.npcs[i];
      if (npc.type.id === 'JUGGERNAUT' && jRemoved < jCount) {
        window.npcManager.npcs.splice(i, 1);
        window.npcManager.counts.juggernaut--;
        jRemoved++;
        continue;
      }
      if (removedS < sCount && npc.type.id === 'SOLDIER') {
        window.npcManager.npcs.splice(i, 1);
        window.npcManager.counts.soldier--;
        removedS++;
      } else if (removedM < mCount && npc.type.id === 'MEDIC') {
        window.npcManager.npcs.splice(i, 1);
        window.npcManager.counts.medic--;
        removedM++;
      }
    }
    window.npcManager.updateUI();

    const maxCap = this.getHighestAvailableGunshipCapacity() || 20;

    // Deduct conscripts from captured tiles locally immediately
    let conscriptsToDeduct = stacksCount * maxCap;
    if (conscriptsToDeduct > 0 && this.capturedTiles) {
      for (const ct of this.capturedTiles) {
        if (conscriptsToDeduct <= 0) break;
        if (ct.conscript_count > 0) {
          const deduction = Math.min(ct.conscript_count, conscriptsToDeduct);
          ct.conscript_count -= deduction;
          conscriptsToDeduct -= deduction;

          const hexRef = this.hexes.find(h => h.q === ct.hex_q && h.r === ct.hex_r);
          if (hexRef) {
              hexRef.conscript_count = ct.conscript_count;
          }

          // Fire and forget update to supabase for the deducted conscripts
          window.supabaseClient
            .from('captured_tiles')
            .update({ conscript_count: ct.conscript_count })
            .eq('id', ct.id)
            .then(() => {});
        }
      }
    }

    // Calculate Arrival Time
    const homeQ = window.currentUser.hex_x;
    const homeR = window.currentUser.hex_y;
    const dQ = Math.abs(homeQ - this.selectedHex.q);
    const dR = Math.abs(homeR - this.selectedHex.r);
    const dS = Math.abs(-homeQ - homeR - (-this.selectedHex.q - this.selectedHex.r));
    const dist = Math.max(dQ, dR, dS);

    // Example: 10 mins per hex distance (using real time)
    const travelMs = dist * 10 * 60 * 1000;
    const arrivalTime = new Date(Date.now() + travelMs).toISOString();

    const payload = {
      gunships: gunshipIds.length,
      gunship_ids: gunshipIds,
      stacks: stacksCount,
      soldiers: sCount,
      medics: mCount,
      juggernauts: jCount
    };

    const deployment = {
      player_id: window.currentUser.id,
      origin_q: homeQ,
      origin_r: homeR,
      target_q: this.selectedHex.q,
      target_r: this.selectedHex.r,
      payload: payload,
      arrival_time: arrivalTime,
      is_return_trip: false
    };

    const { data, error } = await window.supabaseClient
      .from('deployments')
      .insert(deployment)
      .select()
      .single();

    if (!error && data) {
      this.activeDeployments.push(data);
      console.log(`Attack fleet deployed to [${this.selectedHex.q}, ${this.selectedHex.r}]`);
    } else {
      console.error("Error creating deployment", error);
    }

    this.closeDeployMenu();
  }

  async resolveDeployments() {
    if (!this.activeDeployments || !window.supabaseClient || !window.currentUser) return;

    const now = new Date();
    for (let i = this.activeDeployments.length - 1; i >= 0; i--) {
      const dep = this.activeDeployments[i];
      const arrival = new Date(dep.arrival_time);

      if (now >= arrival) {
        // Remove from local array
        this.activeDeployments.splice(i, 1);

        // Remove from DB
        await window.supabaseClient.from('deployments').delete().eq('id', dep.id);

        if (dep.is_return_trip) {
          console.log(`Gunships returned from [${dep.origin_q}, ${dep.origin_r}]`);
          // Gunships are physical buildings at home base, they just 'become available' again
          // implicitly because the active deployment is gone.
          continue;
        }

        // It's an attack arriving at target
        const hex = this.hexes.find(h => h.q === dep.target_q && h.r === dep.target_r);
        if (!hex || hex.state === 'CAPTURED') continue; // If already captured somehow, ignore

        // Trigger Combat Interactive UI
        if (window.combatManager) {
          window.combatManager.showNotification(dep, hex);
        }
      }
    }
}

}
