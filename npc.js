const NPC_TYPES = {
  SOLDIER: { id: 'SOLDIER', name: 'Soldier', cost: { steel: 100, oil: 20 }, health: 150, speed: 1.2, color: '#e53e3e', size: 12, buildTime: 400, reqBuilding: 'BARRACKS' },
  MEDIC: { id: 'MEDIC', name: 'Medic', cost: { steel: 50, oil: 50 }, health: 80, speed: 1.0, color: '#fc8181', size: 10, buildTime: 400, reqBuilding: 'MEDIC_STATION' }
};

class NPC {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.health = type.health;
    this.maxHealth = type.health;
    
    this.state = 'IDLE';
    this.target = null;
  }

  moveTowards(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > this.type.speed) {
      this.x += (dx / dist) * this.type.speed;
      this.y += (dy / dist) * this.type.speed;
    } else {
      this.x = tx;
      this.y = ty;
    }
    return dist;
  }

  draw(ctx) {
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.type.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.health < this.maxHealth) {
      const barW = 20;
      const barH = 4;
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(this.x - barW/2, this.y - this.type.size - 8, barW, barH);
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(this.x - barW/2, this.y - this.type.size - 8, barW * (this.health / this.maxHealth), barH);
    }
  }

  update() {
    // Override in subclasses
  }
}

class Soldier extends NPC {
  constructor(x, y) {
    super(NPC_TYPES.SOLDIER, x, y);
    this.range = 150;
    this.damage = 10;
    this.patrolTarget = null;
    this.patrolWait = 0;
  }

  update(enemies) {
    if (enemies && enemies.length > 0) {
      this.patrolTarget = null; 
      
      let nearest = enemies[0];
      let minDist = Math.hypot(nearest.x - this.x, nearest.y - this.y);
      
      for (const e of enemies) {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = e;
        }
      }

      if (minDist < this.range) {
        this.state = 'ATTACKING';
      } else {
        this.state = 'MOVING';
        this.moveTowards(nearest.x, nearest.y);
      }
    } else {
      const manager = window.structureManager;
      let hq = null;
      
      if (manager) {
        hq = manager.buildings.find(b => b.type.id === 'HEADQUARTERS');
      }

      if (hq) {
        const patrolRadius = manager.getAOERadius(); 
        const hqCenterX = hq.x + hq.type.width / 2;
        const hqCenterY = hq.y + hq.type.height / 2;

        if (this.state === 'IDLE' || this.state === 'PATROLLING') {
          if (this.patrolWait > 0) {
            this.patrolWait--;
            this.state = 'IDLE';
          } else if (!this.patrolTarget) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * patrolRadius;
            this.patrolTarget = {
              x: hqCenterX + Math.cos(angle) * dist,
              y: hqCenterY + Math.sin(angle) * dist
            };
            this.state = 'PATROLLING';
          } else {
            const distToTarget = this.moveTowards(this.patrolTarget.x, this.patrolTarget.y);
            if (distToTarget <= this.type.speed) {
              this.patrolTarget = null;
              this.patrolWait = Math.floor(Math.random() * 180) + 60; 
              this.state = 'IDLE';
            }
          }
        }
      } else {
        this.state = 'IDLE';
      }
    }
  }
}

class Medic extends NPC {
  constructor(x, y) {
    super(NPC_TYPES.MEDIC, x, y);
    this.healRange = 100;
    this.healAmount = 5;
    this.patrolTarget = null;
    this.patrolWait = 0;
  }

  update(friendlyNPCs) {
    let target = null;
    let minDist = Infinity;

    for (const npc of friendlyNPCs) {
      if (npc.health < npc.maxHealth && npc !== this) {
        const d = Math.hypot(npc.x - this.x, npc.y - this.y);
        if (d < minDist) {
          minDist = d;
          target = npc;
        }
      }
    }

    if (target) {
      this.patrolTarget = null; 
      if (minDist < this.healRange) {
        this.state = 'HEALING';
        target.health = Math.min(target.maxHealth, target.health + this.healAmount);
      } else {
        this.state = 'MOVING';
        this.moveTowards(target.x, target.y);
      }
    } else {
      const manager = window.structureManager;
      let hq = null;
      
      if (manager) {
        hq = manager.buildings.find(b => b.type.id === 'HEADQUARTERS');
      }

      if (hq) {
        const patrolRadius = manager.getAOERadius();
        const hqCenterX = hq.x + hq.type.width / 2;
        const hqCenterY = hq.y + hq.type.height / 2;

        if (this.state === 'IDLE' || this.state === 'PATROLLING') {
          if (this.patrolWait > 0) {
            this.patrolWait--;
            this.state = 'IDLE';
          } else if (!this.patrolTarget) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * patrolRadius;
            this.patrolTarget = {
              x: hqCenterX + Math.cos(angle) * dist,
              y: hqCenterY + Math.sin(angle) * dist
            };
            this.state = 'PATROLLING';
          } else {
            const distToTarget = this.moveTowards(this.patrolTarget.x, this.patrolTarget.y);
            if (distToTarget <= this.type.speed) {
              this.patrolTarget = null;
              this.patrolWait = Math.floor(Math.random() * 180) + 60;
              this.state = 'IDLE';
            }
          }
        }
      } else {
        this.state = 'IDLE';
      }
    }
  }
}

class NPCManager {
  constructor(structureManager) {
    this.structureManager = structureManager;
    this.npcs = [];
    this.trainingQueue = []; 
    this.counts = { soldier: 0, medic: 0 };
    this.initUI();
  }

  initUI() {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'npc-menu';
    uiContainer.style.cssText = `
      position: absolute; bottom: 20px; right: 20px;
      background: rgba(26, 32, 44, 0.9); color: white;
      padding: 15px; border-radius: 8px; font-family: sans-serif;
      width: 250px; border: 1px solid #4a5568;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; cursor: pointer; font-weight: bold;';
    header.innerHTML = `<span>Unit Training</span> <span id="npc-toggle">▶</span>`;
    
    const content = document.createElement('div');
    content.id = 'npc-content';
    content.style.marginTop = '10px';
    content.style.display = 'none';

    header.onclick = () => {
      if (content.style.display === 'none') {
        content.style.display = 'block';
        document.getElementById('npc-toggle').innerText = '▼';
      } else {
        content.style.display = 'none';
        document.getElementById('npc-toggle').innerText = '▶';
      }
    };

    uiContainer.appendChild(header);
    uiContainer.appendChild(content);
    document.body.appendChild(uiContainer);

    this.updateUI();
  }

  formatCostString(costObj) {
    return Object.entries(costObj)
      .filter(([_, amount]) => amount > 0)
      .map(([res, amount]) => `${res.substring(0,2).charAt(0).toUpperCase() + res.substring(1,2)}:${amount}`)
      .join(' ');
  }

  updateUI() {
    const content = document.getElementById('npc-content');
    if (!content) return;

    const caps = this.structureManager.getCapacities();

    if (content.children.length === 0) {
      ['soldier', 'medic'].forEach(typeKey => {
        const typeObj = NPC_TYPES[typeKey.toUpperCase()];
        
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
        
        const info = document.createElement('span');
        info.id = `info-${typeKey}`;
        info.style.fontSize = '12px';

        const btn = document.createElement('button');
        btn.id = `btn-${typeKey}`;
        btn.innerText = 'Train';
        btn.style.cssText = `
          background: ${typeObj.color}; border: none; padding: 5px 10px; 
          color: white; border-radius: 4px; cursor: pointer; transition: opacity 0.2s;
        `;
        
        btn.onclick = () => this.trainNPC(typeKey);
        
        row.appendChild(info);
        row.appendChild(btn);
        content.appendChild(row);
      });
    }

    ['soldier', 'medic'].forEach(typeKey => {
      const typeObj = NPC_TYPES[typeKey.toUpperCase()];
      const count = this.counts[typeKey];
      const cap = caps[typeKey] || 0;
      const queuedCount = this.trainingQueue.filter(t => t.typeKey === typeKey).length;
      
      const costStr = this.formatCostString(typeObj.cost);
      const displayCount = queuedCount > 0 ? `${count} (+${queuedCount})` : `${count}`;
      const totalCount = count + queuedCount;
      
      const info = document.getElementById(`info-${typeKey}`);
      if (info) {
        info.innerText = `${typeObj.name}: ${displayCount}/${cap} (${costStr})`;
      }

      const btn = document.getElementById(`btn-${typeKey}`);
      if (btn) {
        if (totalCount >= cap || !this.structureManager.canAfford(typeObj.cost)) {
          btn.disabled = true;
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        } else {
          btn.disabled = false;
          btn.style.opacity = '1.0';
          btn.style.cursor = 'pointer';
        }
      }
    });
  }

  trainNPC(typeKey) {
    const typeObj = NPC_TYPES[typeKey.toUpperCase()];
    const caps = this.structureManager.getCapacities();
    
    const queuedCount = this.trainingQueue.filter(t => t.typeKey === typeKey).length;
    if (this.counts[typeKey] + queuedCount >= caps[typeKey]) return;
    if (!this.structureManager.canAfford(typeObj.cost)) return;

    let validBuildings = this.structureManager.buildings.filter(b => 
      b.type.id === typeObj.reqBuilding || b.type.id === 'HEADQUARTERS'
    );
    if (validBuildings.length === 0) return;

    validBuildings.sort((a, b) => {
      const qA = this.trainingQueue.filter(t => t.building === a).length;
      const qB = this.trainingQueue.filter(t => t.building === b).length;
      return qA - qB;
    });
    const chosenBuilding = validBuildings[0];

    this.structureManager.deductCost(typeObj.cost);
    this.structureManager.updateResourceUI();

    this.trainingQueue.push({
      typeKey: typeKey,
      typeObj: typeObj,
      timer: typeObj.buildTime,
      maxTime: typeObj.buildTime,
      building: chosenBuilding
    });

    this.updateUI(); 
  }

  update(enemies) {
    let uiNeedsUpdate = false;

    const activeBuildings = new Set();
    for (let i = 0; i < this.trainingQueue.length; i++) {
      const task = this.trainingQueue[i];
      
      if (!this.structureManager.buildings.includes(task.building)) {
        this.structureManager.refundCost(task.typeObj.cost);
        this.trainingQueue.splice(i, 1);
        i--;
        uiNeedsUpdate = true;
        continue;
      }

      if (!activeBuildings.has(task.building)) {
        activeBuildings.add(task.building);
        task.timer--;
        
        if (task.timer <= 0) {
          const spawnX = task.building.x + task.building.type.width / 2 + (Math.random() * 20 - 10);
          const spawnY = task.building.y + task.building.type.height + 15;
          
          let newNPC;
          if (task.typeKey === 'soldier') newNPC = new Soldier(spawnX, spawnY);
          else if (task.typeKey === 'medic') newNPC = new Medic(spawnX, spawnY);

          if (newNPC) {
            this.npcs.push(newNPC);
            this.counts[task.typeKey]++;

            // For soldiers and medics, we no longer store them in supabase workers table as requested
            // (workers table has been removed)
          }
          
          this.trainingQueue.splice(i, 1);
          i--;
          uiNeedsUpdate = true;
        }
      }
    }

    if (this.structureManager.tick % 60 === 0) {
      for (let i = this.npcs.length - 1; i >= 0; i--) {
        const npc = this.npcs[i];

        if (npc.health <= 0) {
          this.counts[npc.type.id.toLowerCase()]--;
          this.npcs.splice(i, 1);
          uiNeedsUpdate = true; 
        }
      }
    }

    for (const npc of this.npcs) {
      if (npc instanceof Medic) npc.update(this.npcs);
      else if (npc instanceof Soldier) npc.update(enemies);
      else npc.update(); 
    }
    
    if (uiNeedsUpdate) {
      this.updateUI();
    }
  }

  draw(ctx) {
    for (const npc of this.npcs) {
      npc.draw(ctx);
    }

    const activeBuildings = new Set();
    for (const task of this.trainingQueue) {
      if (!activeBuildings.has(task.building)) {
        activeBuildings.add(task.building);
        
        const b = task.building;
        const barW = 40;
        const barH = 6;
        const barX = b.x + b.type.width / 2 - barW / 2;
        const barY = b.y - 20; 

        ctx.fillStyle = '#2d3748';
        ctx.fillRect(barX, barY, barW, barH);

        const progress = 1 - (task.timer / task.maxTime);
        ctx.fillStyle = '#4299e1'; 
        ctx.fillRect(barX, barY, barW * progress, barH);
        
        ctx.strokeStyle = '#1a202c';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
      }
    }
  }
}