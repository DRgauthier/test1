class CombatManager {
  constructor() {
    this.active = false;
    this.hex = null;
    this.deployment = null;

    this.buildings = [];
    this.npcs = [];

    this.selectedGunshipId = null;
    this.availableGunships = [];
    this.incomingGunships = []; // For fly-in animations

    this.totalEnemyBuildings = 0;
    this.hqDestroyed = false;
    this.combatEnded = false;

    this.initUI();
  }

  initUI() {
    const ui = document.createElement('div');
    ui.id = 'combat-ui';
    ui.style.cssText = 'display: none; position: absolute; top: 70px; left: 10px; background: rgba(26, 32, 44, 0.9); padding: 10px; color: white; border-radius: 8px; font-family: sans-serif; border: 1px solid #4a5568; z-index: 10;';

    ui.innerHTML = `
      <h3 style="margin-top: 0;">Combat</h3>
      <div id="combat-gunships-list" style="margin-bottom: 10px;"></div>
      <button id="combat-retreat-btn" style="background: #e53e3e; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Retreat (Forfeit Troops)</button>
    `;
    document.body.appendChild(ui);

    document.getElementById('combat-retreat-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to retreat? All deployed troops will be lost.')) {
        this.endCombat(true);
      }
    });

    const notif = document.createElement('div');
    notif.id = 'combat-notification';
    notif.style.cssText = 'display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(26, 32, 44, 0.95); padding: 20px; color: white; border-radius: 8px; text-align: center; border: 2px solid #e53e3e; z-index: 200; box-shadow: 0 4px 15px rgba(0,0,0,0.5);';
    notif.innerHTML = `
      <h2>Assault Fleet Arrived!</h2>
      <p id="combat-notif-text"></p>
      <button id="combat-start-btn" style="background: #e53e3e; color: white; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 4px; margin-top: 10px;">Attack Base</button>
    `;
    document.body.appendChild(notif);

    document.getElementById('combat-start-btn').addEventListener('click', () => {
      document.getElementById('combat-notification').style.display = 'none';
      if (this.pendingCombat) {
        this.startCombat(this.pendingCombat.deployment, this.pendingCombat.hex);
        this.pendingCombat = null;
      }
    });

    const summary = document.createElement('div');
    summary.id = 'combat-summary';
    summary.style.cssText = 'display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(26, 32, 44, 0.95); padding: 20px; color: white; border-radius: 8px; text-align: center; border: 2px solid #ecc94b; z-index: 200; box-shadow: 0 4px 15px rgba(0,0,0,0.5);';
    summary.innerHTML = `
      <h2>Combat Report</h2>
      <div id="combat-stars" style="font-size: 32px; color: #ecc94b; margin: 10px 0;"></div>
      <p id="combat-destruction-text"></p>
      <p id="combat-rewards-text" style="color: #48bb78; font-weight: bold;"></p>
      <button id="combat-return-btn" style="background: #3182ce; color: white; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 4px; margin-top: 10px;">Return</button>
    `;
    document.body.appendChild(summary);

    document.getElementById('combat-return-btn').addEventListener('click', () => {
      document.getElementById('combat-summary').style.display = 'none';
      const topBar = document.getElementById('top-bar');
      if (topBar) topBar.style.display = 'flex';
      window.sceneManager.currentScene = 'WORLD';
      window.sceneManager.toggleScene(); // toggle twice to refresh proper UI, or just set to WORLD and trigger update
      window.sceneManager.toggleScene();
    });
  }

  showNotification(deployment, hex) {
    this.pendingCombat = { deployment, hex };
    const notif = document.getElementById('combat-notification');
    document.getElementById('combat-notif-text').innerText = `Target: [${hex.q}, ${hex.r}]`;
    notif.style.display = 'block';
  }

  startCombat(deployment, hex) {
    this.active = true;
    this.hex = hex;
    this.deployment = deployment;
    this.combatEnded = false;
    this.buildings = [];
    this.npcs = [];
    this.incomingGunships = [];
    this.selectedGunshipId = null;

    window.sceneManager.currentScene = 'COMBAT';

    // Hide standard UI
    document.getElementById('build-menu-container').style.display = 'none';
    document.getElementById('npc-menu').style.display = 'none';
    document.getElementById('hex-panel').style.display = 'none';
    document.getElementById('deployments-panel').style.display = 'none';
    const topBar = document.getElementById('top-bar');
    if (topBar) topBar.style.display = 'none';

    document.getElementById('combat-ui').style.display = 'block';

    this.generateEnemyBase(hex);

    this.setupGunshipsUI();

    // Reset camera
    if (window.getCurrentCamera) {
      const cam = window.getCurrentCamera();
      if (cam) {
        cam.x = 0;
        cam.y = 0;
        cam.zoom = 1;
      }
    }
  }

  generateEnemyBase(hex) {
    const diff = hex.difficulty || 1;
    // Simple deterministic seed based on hex coordinates and global seed
    const hexSeed = (window.worldMap ? window.worldMap.seed : 12345) + hex.q * 1000 + hex.r;
    const rng = mulberry32(hexSeed);

    this.buildings = [];

    // Always an HQ in the center
    const hq = new Structure('HEADQUARTERS', -75, -75);
    // Buff health based on difficulty
    hq.maxHealth = 1000 + (diff * 500);
    hq.health = hq.maxHealth;
    this.buildings.push(hq);

    // Number of turrets based on difficulty
    const numTurrets = diff * 2;
    for (let i = 0; i < numTurrets; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 150 + rng() * 200;
      const tx = Math.cos(angle) * dist - 25;
      const ty = Math.sin(angle) * dist - 25;

      const turret = new Structure('TURRET', tx, ty);
      turret.maxHealth = 300 + (diff * 100);
      turret.health = turret.maxHealth;
      this.buildings.push(turret);
    }

    // Some random buildings
    const numBuildings = 3 + diff;
    const types = ['BARRACKS', 'STEEL_MINE', 'OIL_PUMP', 'WORKER_HUT'];
    for (let i = 0; i < numBuildings; i++) {
      const typeStr = types[Math.floor(rng() * types.length)];

      let bx, by;
      let valid = false;
      let attempts = 0;
      const tempB = new Structure(typeStr, 0, 0);

      while (!valid && attempts < 50) {
        const angle = rng() * Math.PI * 2;
        const dist = 150 + rng() * 300;
        bx = Math.cos(angle) * dist - tempB.type.width/2;
        by = Math.sin(angle) * dist - tempB.type.height/2;

        valid = true;
        for (const b of this.buildings) {
          if (bx < b.x + b.type.width && bx + tempB.type.width > b.x &&
              by < b.y + b.type.height && by + tempB.type.height > b.y) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (valid) {
        tempB.x = bx;
        tempB.y = by;
        tempB.maxHealth = 200 + (diff * 50);
        tempB.health = tempB.maxHealth;
        this.buildings.push(tempB);
      }
    }

    this.totalEnemyBuildings = this.buildings.length;
    this.hqDestroyed = false;
  }

  setupGunshipsUI() {
    this.availableGunships = [];
    const p = this.deployment.payload;

    if (p.gunship_ids && p.gunship_ids.length > 0) {
      // Find actual troop loadouts from vehicles if possible
      // But since we wiped them in deployAttack, they might just be in the payload totals.
      // For simplicity, we just distribute the payload soldiers/medics evenly, or assume 1 generic gunship per assigned gunship
      let totalS = p.soldiers || 0;
      let totalM = p.medics || 0;
      let totalJ = p.juggernauts || 0;

      for (const gid of p.gunship_ids) {
        // Just rough distribution for now
        const s = Math.min(10, totalS); totalS -= s;
        const m = Math.min(5, totalM); totalM -= m;
        const j = Math.min(2, totalJ); totalJ -= j;

        this.availableGunships.push({
          id: gid,
          name: 'Player Gunship',
          troops: { soldier: s, medic: m, juggernaut: j },
          used: false
        });
      }
    }

    // Add conscript gunships
    if (p.stacks > 0) {
      const maxCap = window.worldMap ? window.worldMap.getHighestAvailableGunshipCapacity() : 20;
      // 1 stack = 1 gunship full of conscripts
      for (let i = 0; i < p.stacks; i++) {
        this.availableGunships.push({
          id: `conscript_${i}`,
          name: 'Conscript Gunship',
          // Give them basic soldiers as conscripts, maybe half health later but for now just raw numbers
          troops: { soldier: maxCap, medic: 0, juggernaut: 0 },
          used: false,
          isConscript: true
        });
      }
    }

    this.renderGunshipsList();
  }

  renderGunshipsList() {
    const list = document.getElementById('combat-gunships-list');
    list.innerHTML = '';

    this.availableGunships.forEach(g => {
      if (g.used) return;

      const btn = document.createElement('button');
      btn.style.cssText = `display: block; width: 100%; margin-bottom: 5px; padding: 8px; background: ${this.selectedGunshipId === g.id ? '#3182ce' : '#2d3748'}; color: white; border: 1px solid #718096; border-radius: 4px; cursor: pointer; text-align: left;`;
      btn.innerHTML = `<strong>${g.name}</strong><br><span style="font-size: 11px;">Soldiers: ${g.troops.soldier} | Medics: ${g.troops.medic} | Jugg: ${g.troops.juggernaut}</span>`;

      btn.addEventListener('click', () => {
        this.selectedGunshipId = g.id;
        this.renderGunshipsList();
      });

      list.appendChild(btn);
    });

    if (this.availableGunships.every(g => g.used)) {
       list.innerHTML = '<div style="color: #a0aec0; font-size: 12px; font-style: italic;">All gunships deployed.</div>';
    }
  }

  handleClick(worldX, worldY) {
    if (!this.active || this.combatEnded) return;

    if (this.selectedGunshipId) {
      const gIndex = this.availableGunships.findIndex(g => g.id === this.selectedGunshipId);
      if (gIndex !== -1 && !this.availableGunships[gIndex].used) {
        this.availableGunships[gIndex].used = true;
        this.selectedGunshipId = null;
        this.renderGunshipsList();

        // Start fly-in animation
        this.incomingGunships.push({
          targetX: worldX,
          targetY: worldY,
          startX: worldX + 800, // Fly in from right
          startY: worldY - 600, // and top
          progress: 0,
          gunshipData: this.availableGunships[gIndex]
        });
      }
    }
  }

  spawnTroops(x, y, data) {
    const { soldier, medic, juggernaut } = data.troops;

    for(let i=0; i<soldier; i++) {
      const n = new Soldier(x + (Math.random()*40-20), y + (Math.random()*40-20));
      if(data.isConscript) { n.maxHealth /= 2; n.health = n.maxHealth; n.type.color = '#ed8936'; } // orange for conscripts
      this.npcs.push(n);
    }
    for(let i=0; i<medic; i++) {
      const n = new Medic(x + (Math.random()*40-20), y + (Math.random()*40-20));
      if(data.isConscript) { n.maxHealth /= 2; n.health = n.maxHealth; }
      this.npcs.push(n);
    }
    for(let i=0; i<juggernaut; i++) {
      const n = new Juggernaut(x + (Math.random()*40-20), y + (Math.random()*40-20));
      if(data.isConscript) { n.maxHealth /= 2; n.health = n.maxHealth; }
      this.npcs.push(n);
    }
  }

  update() {
    if (!this.active || this.combatEnded) return;

    // Update incoming gunships
    for (let i = this.incomingGunships.length - 1; i >= 0; i--) {
      const ig = this.incomingGunships[i];
      ig.progress += 1 / (60 * 5); // 5 seconds at 60fps

      if (ig.progress >= 1) {
        this.spawnTroops(ig.targetX, ig.targetY, ig.gunshipData);
        this.incomingGunships.splice(i, 1);
      }
    }

    // Update NPCs (AI)
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];

      if (npc.health <= 0) {
        this.npcs.splice(i, 1);
        continue;
      }

      if (npc instanceof Medic) {
        npc.update(this.npcs); // heal friends
      } else {
        // Attack logic for soldiers/juggernauts against buildings
        if (!npc.target || !this.buildings.includes(npc.target)) {
          npc.target = this.findClosestBuilding(npc.x, npc.y);
        }

        if (npc.target) {
          const dx = (npc.target.x + npc.target.type.width/2) - npc.x;
          const dy = (npc.target.y + npc.target.type.height/2) - npc.y;
          const dist = Math.hypot(dx, dy);

          if (dist < npc.range + Math.max(npc.target.type.width, npc.target.type.height)/2) {
            // in range, attack
            npc.state = 'ATTACKING';
            // Custom attack logic since standard update expects enemy NPCs, not buildings
            if (!npc.lastAttack || Date.now() - npc.lastAttack > 1000) {
              npc.lastAttack = Date.now();
              const dmg = (npc.effectiveDamage !== undefined) ? npc.effectiveDamage : npc.type.damage;
              npc.target.health -= dmg;

              // Add simple visual effect line
              npc.firingLine = { x1: npc.x, y1: npc.y, x2: npc.target.x + npc.target.type.width/2, y2: npc.target.y + npc.target.type.height/2, alpha: 1 };
            }
          } else {
            // move to target
            npc.state = 'MOVING';
            const vx = (dx / dist) * npc.type.speed;
            const vy = (dy / dist) * npc.type.speed;
            npc.x += vx;
            npc.y += vy;
          }
        } else {
           npc.state = 'IDLE';
        }
      }
    }

    // Update enemy turrets
    const turrets = this.buildings.filter(b => b.type.id === 'TURRET');
    for (const t of turrets) {
      if (!t.lastAttack) t.lastAttack = 0;

      if (Date.now() - t.lastAttack > 1500) { // Turret fire rate
        let closestNPC = null;
        let minDist = 300; // Turret range

        for (const npc of this.npcs) {
          const dist = Math.hypot(npc.x - (t.x + t.type.width/2), npc.y - (t.y + t.type.height/2));
          if (dist < minDist) {
             minDist = dist;
             closestNPC = npc;
          }
        }

        if (closestNPC) {
          closestNPC.health -= 25; // Turret damage
          t.lastAttack = Date.now();

          // Small visual effect hook could go here
          t.firingLine = { x1: t.x + t.type.width/2, y1: t.y + t.type.height/2, x2: closestNPC.x, y2: closestNPC.y, alpha: 1 };
        }
      }
    }

    // Handle building destruction
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      if (this.buildings[i].health <= 0) {
        if (this.buildings[i].type.id === 'HEADQUARTERS') {
          this.hqDestroyed = true;
        }
        this.buildings.splice(i, 1);
      }
    }

    // Check Win/Loss conditions
    const allDeployed = this.availableGunships.every(g => g.used) && this.incomingGunships.length === 0;

    if (this.buildings.length === 0) {
      this.endCombat(false); // Win
    } else if (allDeployed && this.npcs.length === 0) {
      this.endCombat(false); // Loss / Timeout
    }
  }

  findClosestBuilding(x, y) {
    let closest = null;
    let minDist = Infinity;
    for (const b of this.buildings) {
       const bx = b.x + b.type.width/2;
       const by = b.y + b.type.height/2;
       const dist = Math.hypot(bx - x, by - y);
       if (dist < minDist) {
         minDist = dist;
         closest = b;
       }
    }
    return closest;
  }

  async endCombat(retreated) {
    if (this.combatEnded) return;
    this.combatEnded = true;

    document.getElementById('combat-ui').style.display = 'none';
    const summary = document.getElementById('combat-summary');

    let destPercent = 0;
    if (this.totalEnemyBuildings > 0) {
      destPercent = ((this.totalEnemyBuildings - this.buildings.length) / this.totalEnemyBuildings) * 100;
    }
    if (this.buildings.length === 0) destPercent = 100; // guarantee 100 if all gone

    let stars = 0;
    if (destPercent >= 50) stars++;
    if (this.hqDestroyed) stars++;
    if (destPercent >= 100) stars = 3;

    if (retreated) {
       document.getElementById('combat-destruction-text').innerText = 'Retreated. All remaining troops lost.';
       document.getElementById('combat-stars').innerText = '☆☆☆';
       document.getElementById('combat-rewards-text').innerText = 'No rewards.';
    } else {
       document.getElementById('combat-destruction-text').innerText = `Destruction: ${destPercent.toFixed(1)}%`;

       let starText = '';
       for(let i=0; i<3; i++) starText += (i < stars) ? '★' : '☆';
       document.getElementById('combat-stars').innerText = starText;

       const diff = this.hex.difficulty || 1;
       const rewardSteel = stars * diff * 150;
       const rewardOil = stars * diff * 50;

       document.getElementById('combat-rewards-text').innerText = `Loot: ${rewardSteel} Steel, ${rewardOil} Oil`;

       if (stars > 0 && window.currentUser && window.supabaseClient) {
          window.currentUser.steel += rewardSteel;
          window.currentUser.oil += rewardOil;

          await window.supabaseClient
            .from('players')
            .update({ steel: window.currentUser.steel, oil: window.currentUser.oil })
            .eq('id', window.currentUser.id);

          const sb = document.getElementById('steel-balance');
          const ob = document.getElementById('oil-balance');
          if (sb) sb.innerText = window.currentUser.steel;
          if (ob) ob.innerText = window.currentUser.oil;

          if (stars === 3 && this.hex.state !== 'CAPTURED') {
            this.hex.state = 'CAPTURED';
            if (window.worldMap) {
                // Remove base from DB
                await window.supabaseClient.from('bases').delete().eq('hex_x', this.hex.q).eq('hex_y', this.hex.r);

                // Add to captured_tiles
                const garrison = {
                   soldier: this.deployment.payload.soldiers || 0,
                   medic: this.deployment.payload.medics || 0,
                   juggernaut: this.deployment.payload.juggernauts || 0
                };
                this.hex.garrison_troops = garrison;
                this.hex.conscript_count = 0;
                this.hex.last_conscript_update = new Date().toISOString();

                const { data: ctData } = await window.supabaseClient
                  .from('captured_tiles')
                  .insert({
                    player_id: window.currentUser.id,
                    hex_q: this.hex.q,
                    hex_r: this.hex.r,
                    conscript_count: 0,
                    last_conscript_update: this.hex.last_conscript_update,
                    garrison_troops: garrison
                  })
                  .select()
                  .single();

                if (ctData) {
                  if (!window.worldMap.capturedTiles) window.worldMap.capturedTiles = [];
                  window.worldMap.capturedTiles.push(ctData);
                }

                window.worldMap.calculateNetworkMultiplier();
            }
          }
       }
    }

    // Spawn return trip for physical gunships if we didn't retreat
    if (!retreated && this.deployment && (this.deployment.payload.gunships > 0 || (this.deployment.payload.gunship_ids && this.deployment.payload.gunship_ids.length > 0)) && window.supabaseClient) {
       const homeQ = window.currentUser.hex_x;
       const homeR = window.currentUser.hex_y;
       const dQ = Math.abs(homeQ - this.hex.q);
       const dR = Math.abs(homeR - this.hex.r);
       const dS = Math.abs(-homeQ - homeR - (-this.hex.q - this.hex.r));
       const dist = Math.max(dQ, dR, dS);
       const actualTravelMs = dist * 10 * 60 * 1000;
       const returnArrival = new Date(Date.now() + actualTravelMs).toISOString();

       const returnDep = {
         player_id: window.currentUser.id,
         origin_q: this.hex.q,
         origin_r: this.hex.r,
         target_q: homeQ,
         target_r: homeR,
         payload: { gunships: this.deployment.payload.gunships, gunship_ids: this.deployment.payload.gunship_ids },
         arrival_time: returnArrival,
         is_return_trip: true
       };

       const { data: retData } = await window.supabaseClient
         .from('deployments')
         .insert(returnDep)
         .select()
         .single();

       if (retData && window.worldMap) {
         window.worldMap.activeDeployments.push(retData);
       }
    }

    // Cleanup deployment
    if (window.supabaseClient && this.deployment) {
        await window.supabaseClient.from('deployments').delete().eq('id', this.deployment.id);
        if (window.worldMap) {
           window.worldMap.activeDeployments = window.worldMap.activeDeployments.filter(d => d.id !== this.deployment.id);
        }
    }

    summary.style.display = 'block';
  }

  draw(ctx) {
    if (!this.active) return;

    // Draw enemy buildings
    for (const b of this.buildings) {
      b.draw(ctx);

      // Draw health bar
      const barW = b.type.width;
      const barH = 5;
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(b.x, b.y - 10, barW, barH);
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(b.x, b.y - 10, barW * (b.health / b.maxHealth), barH);

      // Draw Turret firing lines
      if (b.type.id === 'TURRET' && b.firingLine && b.firingLine.alpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(b.firingLine.x1, b.firingLine.y1);
        ctx.lineTo(b.firingLine.x2, b.firingLine.y2);
        ctx.strokeStyle = `rgba(236, 201, 75, ${b.firingLine.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        b.firingLine.alpha -= 0.1;
      }
    }

    // Draw deployed troops
    for (const npc of this.npcs) {
      npc.draw(ctx);

      if (npc.firingLine && npc.firingLine.alpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(npc.firingLine.x1, npc.firingLine.y1);
        ctx.lineTo(npc.firingLine.x2, npc.firingLine.y2);
        ctx.strokeStyle = `rgba(229, 62, 62, ${npc.firingLine.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        npc.firingLine.alpha -= 0.1;
      }
    }

    // Draw incoming gunships (shadows + ship)
    for (const ig of this.incomingGunships) {
      const curX = ig.startX + (ig.targetX - ig.startX) * ig.progress;
      const curY = ig.startY + (ig.targetY - ig.startY) * ig.progress;

      // Fly height arc
      const flyHeight = Math.sin(ig.progress * Math.PI) * 100;

      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(curX, curY + 50, 30 - (flyHeight/10), 15 - (flyHeight/20), 0, 0, Math.PI*2);
      ctx.fill();

      // Ship
      ctx.translate(curX, curY - flyHeight);
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(20, 20);
      ctx.lineTo(-20, 20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ig.gunshipData.name, 0, -25);

      ctx.restore();
    }

    // Draw target cursor if selected
    if (this.selectedGunshipId) {
       if (window.getCurrentCamera) {
          const cam = window.getCurrentCamera();
          // This would need mouse position, handled lightly via CSS cursor for now, or just leave it.
       }
    }
  }
}
