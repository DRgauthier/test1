class MissionManager {
  constructor(structureManager, npcManager) {
    this.structureManager = structureManager;
    this.npcManager = npcManager;
    this.missions = [];
    this.activeDeployments = [];
    
    this.generateMissions(3);
  }

  generateMissions(count) {
    const types = ["Raid a Bandit Camp", "Scavenge Ruins", "Rescue VIP", "Clear Mutant Hive", "Secure Supply Drop"];
    
    // Clean time scaling table for difficulties 1 to 5: 2m, 10m, 25m, 40m, 60m
    const durationTable = [2, 10, 25, 40, 60];
    
    // Specific troop type requirements per difficulty tier
    const troopReqTable = [
      { soldiers: 1, medics: 0 }, // 1-star: 1 Soldier
      { soldiers: 2, medics: 0 }, // 2-star: 2 Soldiers
      { soldiers: 3, medics: 1 }, // 3-star: 3 Soldiers, 1 Medic
      { soldiers: 4, medics: 1 }, // 4-star: 4 Soldiers, 1 Medic
      { soldiers: 5, medics: 2 }  // 5-star: 5 Soldiers, 2 Medics
    ];

    for (let i = 0; i < count; i++) {
      const difficulty = Math.floor(Math.random() * 5) + 1;
      const durationMinutes = durationTable[difficulty - 1];
      const durationFrames = durationMinutes * 60 * 60; // Converted to frames (60fps)

      const reqs = troopReqTable[difficulty - 1];

      this.missions.push({
        name: types[Math.floor(Math.random() * types.length)],
        difficulty: difficulty,
        duration: durationFrames,
        minSoldiers: reqs.soldiers,
        minMedics: reqs.medics,
        rewards: {
          steel: Math.floor(Math.random() * 100 * difficulty * 2),
          wood: Math.floor(Math.random() * 80 * difficulty * 2),
          food: Math.floor(Math.random() * 50 * difficulty * 2)
        }
      });
    }
  }

  removeTroops(typeId, count) {
    let removed = 0;
    for (let i = this.npcManager.npcs.length - 1; i >= 0; i--) {
      if (removed >= count) break;
      if (this.npcManager.npcs[i].type.id === typeId) {
        this.npcManager.npcs.splice(i, 1);
        this.npcManager.counts[typeId.toLowerCase()]--;
        removed++;
      }
    }
    this.npcManager.updateUI();
  }

  update() {
    for (let i = this.activeDeployments.length - 1; i >= 0; i--) {
      const d = this.activeDeployments[i];
      d.timer--;
      if (d.timer <= 0) {
        if (d.type === 'deploy') {
          this.resolveMission(d);
        } else if (d.type === 'recall') {
          this.resolveRecall(d);
        }
        this.activeDeployments.splice(i, 1);

        // Refresh hex panel if it is currently viewing this hex
        if (window.worldMap && window.worldMap.selectedHex === d.hex && window.worldMap.openDeployMenu) {
            window.worldMap.openDeployMenu(d.hex); // Re-render the menu
        }
      }
    }
  }

  resolveMission(d) {
    const power = (d.soldiers * 2) + (d.medics * 1.5);
    const reqPower = d.mission.difficulty * 2.5; 
    const successChance = Math.min(0.95, power / reqPower);
    const success = Math.random() < successChance;
    
    let msg = `Mission: ${d.mission.name}\nResult: ${success ? "SUCCESS" : "FAILED"}\n\n`;

    if (success) {
      this.structureManager.addResource('steel', d.mission.rewards.steel);
      this.structureManager.addResource('wood', d.mission.rewards.wood);
      this.structureManager.addResource('food', d.mission.rewards.food);
      msg += `Gained: St:${d.mission.rewards.steel}, Wd:${d.mission.rewards.wood}, Fd:${d.mission.rewards.food}\n`;
    }

    let survivingSoldiers = 0;
    let survivingMedics = 0;
    for(let s=0; s<d.soldiers; s++) { if(Math.random() > (success ? 0.1 : 0.4)) survivingSoldiers++; }
    for(let m=0; m<d.medics; m++) { if(Math.random() > (success ? 0.05 : 0.3)) survivingMedics++; }
    
    msg += `Casualties:\nSoldiers: ${d.soldiers - survivingSoldiers} lost\nMedics: ${d.medics - survivingMedics} lost`;

    if (success) {
      d.hex.state = 'HELD';
      d.hex.garrison = {
        soldiers: survivingSoldiers,
        medics: survivingMedics
      };
      msg += `\n\nTerritory Secured! Garrison left on site.`;
    } else {
      d.hex.state = 'EMPTY';
      // If failed, troops are routed/lost. They do not hold the hex.
      // (Any survivors are lost in the wilderness)
      msg += `\n\nForces routed. Hex remains empty.`;
    }

    this.showNotification(msg, success);
  }

  resolveRecall(d) {
    const hex = d.hex;

    let soldiersToReturn = 0;
    let medicsToReturn = 0;

    if (hex.garrison) {
      soldiersToReturn = hex.garrison.soldiers;
      medicsToReturn = hex.garrison.medics;
    }

    const gunship = this.structureManager.buildings.find(b => b.type.id === 'GUNSHIP');
    const spawnX = gunship ? gunship.x + gunship.type.width/2 : 0;
    const spawnY = gunship ? gunship.y + gunship.type.height + 20 : 0;

    for(let s=0; s<soldiersToReturn; s++) {
      this.npcManager.npcs.push(new Soldier(spawnX + (Math.random()*40-20), spawnY + (Math.random()*20)));
      this.npcManager.counts.soldier++;
    }
    for(let m=0; m<medicsToReturn; m++) {
      this.npcManager.npcs.push(new Medic(spawnX + (Math.random()*40-20), spawnY + (Math.random()*20)));
      this.npcManager.counts.medic++;
    }

    hex.state = 'EMPTY';
    hex.garrison = null;
    hex.mission = null; // Clear old mission so a new one can generate
    
    this.npcManager.updateUI();
    this.showNotification(`Troops successfully recalled from territory.`, true);
  }

  showNotification(msg, success) {
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      background: ${success ? 'rgba(47, 133, 90, 0.95)' : 'rgba(155, 44, 44, 0.95)'}; 
      border: 2px solid ${success ? '#48bb78' : '#fc8181'}; color: white;
      padding: 15px 25px; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      text-align: center; white-space: pre-line; font-family: sans-serif;
    `;
    notif.innerText = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 7000); 
  }
}