import re

with open('worldMap.js', 'r') as f:
    content = f.read()

deploy_logic = """  async deployAttack() {
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
  }"""

# Remove old deployGunship and recallTroops and replace with the new logic
pattern = re.compile(r'  deployGunship\(\) \{[\s\S]*?  recallTroops\(\) \{[\s\S]*?\}', re.DOTALL)
new_content = pattern.sub(deploy_logic, content)

with open('worldMap.js', 'w') as f:
    f.write(new_content)

print("Deploy logic patched")
