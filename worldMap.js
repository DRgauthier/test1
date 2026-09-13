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

        const rngVal = this.rng();
        let state = 'EMPTY';
        let difficulty = 0;

        // Roughly 15% chance for a hex to be an NPC Base
        if (rngVal < 0.15) {
          state = 'NPC_BASE';
          // Calculate difficulty 1-5 based on another rng roll
          difficulty = Math.floor(this.rng() * 5) + 1;
        }

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

    if (hexState === 'NPC_BASE') {
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

      const totalGunships = window.structureManager.buildings.filter(b => b.type.id === 'GUNSHIP').length;
      const activePhysicalFleets = this.activeDeployments.reduce((sum, dep) => sum + (dep.payload.gunships || 0), 0);
      document.getElementById('world-deploy-gunships').max = Math.max(0, totalGunships - activePhysicalFleets);
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

    const sCount = parseInt(document.getElementById('world-deploy-s').value) || 0;
    const mCount = parseInt(document.getElementById('world-deploy-m').value) || 0;
    const gunshipsCount = parseInt(document.getElementById('world-deploy-gunships').value) || 0;
    const stacksCount = parseInt(document.getElementById('world-deploy-stacks').value) || 0;

    if (gunshipsCount === 0 && stacksCount === 0) {
      return alert("You must deploy at least one gunship or conscript stack.");
    }

    const maxCap = this.getHighestAvailableGunshipCapacity() || 20;

    // Validate Physical Capacity
    if ((sCount + mCount) > (gunshipsCount * maxCap)) {
      return alert(`Your ${gunshipsCount} gunship(s) can only carry ${gunshipsCount * maxCap} troops. You attempted to deploy ${sCount + mCount}.`);
    }

    // Validate Troops available
    if (sCount > window.npcManager.counts.soldier || mCount > window.npcManager.counts.medic) {
      return alert("You do not have enough base troops available!");
    }

    // Remove base troops locally immediately
    // Note: since we don't have missionManager anymore, we just manually remove them
    let removedS = 0, removedM = 0;
    for (let i = window.npcManager.npcs.length - 1; i >= 0; i--) {
      const npc = window.npcManager.npcs[i];
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
      gunships: gunshipsCount,
      stacks: stacksCount,
      soldiers: sCount,
      medics: mCount
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

        // Calculate Combat Outcome
        const maxCap = this.getHighestAvailableGunshipCapacity() || 20;
        const totalConscripts = dep.payload.stacks * maxCap;
        // Conscripts have half stats (0.5 power). Regulars: S=1, M=1 (medics keep them alive mostly, simple math for now)
        const attackPower = dep.payload.soldiers + dep.payload.medics + (totalConscripts * 0.5);

        const diff = hex.difficulty || 1;
        // Base defense power based on difficulty (1-5 scales heavily)
        const defPower = diff * 15;

        const successChance = Math.min(0.95, attackPower / (defPower || 1));
        const success = Math.random() < successChance;

        console.log(`Attack Resolution at [${hex.q}, ${hex.r}] - Power: ${attackPower} vs ${defPower} - Success: ${success}`);

        if (success) {
          // CAPTURED
          hex.state = 'CAPTURED';

          // 100% of physical troops survive and garrison (placeholder)
          const garrison = {
            soldier: dep.payload.soldiers,
            medic: dep.payload.medics,
            juggernaut: 0
          };
          hex.garrison_troops = garrison;
          hex.conscript_count = 0;
          hex.last_conscript_update = new Date().toISOString();

          // Write to captured_tiles
          const { data: ctData } = await window.supabaseClient
            .from('captured_tiles')
            .insert({
              player_id: window.currentUser.id,
              hex_q: hex.q,
              hex_r: hex.r,
              conscript_count: 0,
              last_conscript_update: hex.last_conscript_update,
              garrison_troops: garrison
            })
            .select()
            .single();

          if (ctData) {
            if (!this.capturedTiles) this.capturedTiles = [];
            this.capturedTiles.push(ctData);
          }

          this.calculateNetworkMultiplier();

          // Spawn return trip for physical gunships
          if (dep.payload.gunships > 0) {
            const travelMs = (new Date() - new Date(dep.created_at || now)) || (10 * 60 * 1000); // reuse travel time or fallback
            // To ensure we get the right dist:
            const homeQ = window.currentUser.hex_x;
            const homeR = window.currentUser.hex_y;
            const dQ = Math.abs(homeQ - hex.q);
            const dR = Math.abs(homeR - hex.r);
            const dS = Math.abs(-homeQ - homeR - (-hex.q - hex.r));
            const dist = Math.max(dQ, dR, dS);
            const actualTravelMs = dist * 10 * 60 * 1000;

            const returnArrival = new Date(Date.now() + actualTravelMs).toISOString();

            const returnDep = {
              player_id: window.currentUser.id,
              origin_q: hex.q,
              origin_r: hex.r,
              target_q: homeQ,
              target_r: homeR,
              payload: { gunships: dep.payload.gunships },
              arrival_time: returnArrival,
              is_return_trip: true
            };

            const { data: retData } = await window.supabaseClient
              .from('deployments')
              .insert(returnDep)
              .select()
              .single();

            if (retData) {
              this.activeDeployments.push(retData);
            }
          }
        } else {
          // Attack failed. All troops lost.
          console.log("Forces routed. Attack failed.");
        }
      }
    }
}

}
