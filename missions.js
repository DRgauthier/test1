class MissionManager {
  constructor(structureManager, npcManager) {
    this.structureManager = structureManager;
    this.npcManager = npcManager;
    this.missions = [];
    this.activeDeployments = [];
    
    this.initUI();
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

  initUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'mission-menu';
    this.uiContainer.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(26, 32, 44, 0.98); color: white; padding: 20px; 
      border-radius: 8px; font-family: sans-serif; width: 480px; 
      border: 1px solid #4a5568; display: none; z-index: 100;
      box-shadow: 0 10px 25px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(this.uiContainer);
  }

  openMenu() {
    this.uiContainer.style.display = 'block';
    this.renderMenu();
  }

  closeMenu() {
    this.uiContainer.style.display = 'none';
  }

  renderMenu() {
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4a5568; padding-bottom: 10px; margin-bottom: 10px;">
        <h3 style="margin: 0;">Gunship Mission Control</h3>
        <button onclick="window.missionManager.closeMenu()" style="background: #e53e3e; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold;">X</button>
      </div>
      <div style="margin-bottom: 10px; color: #63b3ed; font-size: 14px;">
        Available Troops: <b>${this.npcManager.counts.soldier} Soldiers</b> | <b>${this.npcManager.counts.medic} Medics</b>
      </div>
      <div style="max-height: 400px; overflow-y: auto;">
    `;

    this.missions.forEach((m, index) => {
      const durationMins = Math.round(m.duration / 3600);
      html += `
        <div style="background: #2d3748; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #4a5568;">
          <h4 style="margin: 0 0 5px 0; color: #fbd38d;">${m.name}</h4>
          <div style="font-size: 13px; margin-bottom: 8px; line-height: 1.4;">
            Difficulty: <span style="color: #ecc94b">${'★'.repeat(m.difficulty)}${'☆'.repeat(5 - m.difficulty)}</span><br>
            Duration: <b>${durationMins} min${durationMins > 1 ? 's' : ''}</b> | Required: <span style="color: #fc8181; font-weight: bold;">${m.minSoldiers} Soldiers, ${m.minMedics} Medics</span><br>
            Rewards: St:${m.rewards.steel} Wd:${m.rewards.wood} Fd:${m.rewards.food}
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <label style="font-size: 12px;">Soldiers:<br><input type="number" id="deploy-s-${index}" min="0" max="${this.npcManager.counts.soldier}" value="0" style="width: 50px; background: #1a202c; color: white; border: 1px solid #4a5568; padding: 4px; border-radius: 4px;"></label>
            <label style="font-size: 12px;">Medics:<br><input type="number" id="deploy-m-${index}" min="0" max="${this.npcManager.counts.medic}" value="0" style="width: 50px; background: #1a202c; color: white; border: 1px solid #4a5568; padding: 4px; border-radius: 4px;"></label>
            <button onclick="window.missionManager.deploy(${index})" style="background: #48bb78; border: none; color: white; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-left: auto; font-weight: bold;">Deploy</button>
          </div>
        </div>
      `;
    });
    
    if (this.activeDeployments.length > 0) {
      html += `<hr style="border-color: #4a5568; margin: 15px 0;"><h4 style="margin: 0 0 10px 0;">Active Deployments</h4>`;
      this.activeDeployments.forEach(d => {
        const progress = Math.round((1 - (d.timer / d.duration)) * 100);
        const remainingSecs = Math.ceil(d.timer / 60);
        const remMins = Math.floor(remainingSecs / 60);
        const remSecs = remainingSecs % 60;
        const timeStr = remMins > 0 ? `${remMins}m ${remSecs}s left` : `${remSecs}s left`;
        
        html += `<div style="font-size: 13px; color: #a0aec0; margin-bottom: 5px; background: #1a202c; padding: 8px; border-radius: 4px; display: flex; justify-content: space-between;">
          <span>${d.mission.name}</span>
          <span>${progress}% (${timeStr})</span>
        </div>`;
      });
    }

    html += `</div>`;
    this.uiContainer.innerHTML = html;
  }

  deploy(index) {
    const sInput = document.getElementById(`deploy-s-${index}`);
    const mInput = document.getElementById(`deploy-m-${index}`);
    const sCount = parseInt(sInput.value) || 0;
    const mCount = parseInt(mInput.value) || 0;
    const mission = this.missions[index];

    if (sCount < mission.minSoldiers || mCount < mission.minMedics) {
      return alert(`This mission requires at least ${mission.minSoldiers} Soldiers and ${mission.minMedics} Medics. You assigned ${sCount} Soldiers and ${mCount} Medics.`);
    }
    if (sCount > this.npcManager.counts.soldier || mCount > this.npcManager.counts.medic) {
      return alert("You do not have enough troops available!");
    }

    this.removeTroops('SOLDIER', sCount);
    this.removeTroops('MEDIC', mCount);
    
    const acceptedMission = this.missions.splice(index, 1)[0];
    this.activeDeployments.push({ mission: acceptedMission, timer: acceptedMission.duration, duration: acceptedMission.duration, soldiers: sCount, medics: mCount });

    this.generateMissions(1); // Replace accepted mission
    this.renderMenu();
    this.npcManager.updateUI();
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
  }

  update() {
    for (let i = this.activeDeployments.length - 1; i >= 0; i--) {
      const d = this.activeDeployments[i];
      d.timer--;
      if (d.timer <= 0) {
        this.resolveMission(d);
        this.activeDeployments.splice(i, 1);
        if (this.uiContainer.style.display === 'block') this.renderMenu();
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
    
    const gunship = this.structureManager.buildings.find(b => b.type.id === 'GUNSHIP');
    const spawnX = gunship ? gunship.x + gunship.type.width/2 : 0;
    const spawnY = gunship ? gunship.y + gunship.type.height + 20 : 0;

    for(let s=0; s<survivingSoldiers; s++) {
      this.npcManager.npcs.push(new Soldier(spawnX + (Math.random()*40-20), spawnY + (Math.random()*20)));
      this.npcManager.counts.soldier++;
    }
    for(let m=0; m<survivingMedics; m++) {
      this.npcManager.npcs.push(new Medic(spawnX + (Math.random()*40-20), spawnY + (Math.random()*20)));
      this.npcManager.counts.medic++;
    }

    msg += `Casualties:\nSoldiers: ${d.soldiers - survivingSoldiers} lost\nMedics: ${d.medics - survivingMedics} lost`;
    
    this.npcManager.updateUI();
    this.showNotification(msg, success);
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