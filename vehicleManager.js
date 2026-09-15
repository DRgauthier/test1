class VehicleManager {
  constructor() {
    this.vehicles = [];
    this.totalTroops = { soldier: 0, medic: 0, juggernaut: 0 };
  }

  async loadVehicles() {
    if (!window.currentUser) return;
    
    // Fetch total troops
    const { data: playerData, error: playerError } = await window.supabaseClient
      .from('players')
      .select('troop_counts')
      .eq('id', window.currentUser.id)
      .maybeSingle();
      
    if (!playerError && playerData && playerData.troop_counts) {
      let tc = playerData.troop_counts;
      if (typeof tc === 'string') {
        try { tc = JSON.parse(tc); } catch(e) {}
      }
      this.totalTroops = {
        soldier: tc.soldier || 0,
        medic: tc.medic || 0,
        juggernaut: tc.juggernaut || 0
      };
    }

    // Fetch vehicles
    const { data: vehicleData, error: vehicleError } = await window.supabaseClient
      .from('vehicles')
      .select('*')
      .eq('player_id', window.currentUser.id);
      
    if (!vehicleError && vehicleData) {
      this.vehicles = vehicleData;
    }
    
    this.updateAvailableTroops();
  }

  updateAvailableTroops() {
    this.availableTroops = { ...this.totalTroops };
    
    for (const vehicle of this.vehicles) {
      if (vehicle.assigned_troops) {
        this.availableTroops.soldier -= (vehicle.assigned_troops.soldier || 0);
        this.availableTroops.medic -= (vehicle.assigned_troops.medic || 0);
        this.availableTroops.juggernaut -= (vehicle.assigned_troops.juggernaut || 0);
      }
    }
    
    // Ensure we don't drop below 0 if there was an inconsistency
    this.availableTroops.soldier = Math.max(0, this.availableTroops.soldier);
    this.availableTroops.medic = Math.max(0, this.availableTroops.medic);
    this.availableTroops.juggernaut = Math.max(0, this.availableTroops.juggernaut);
  }

  async saveVehicle(vehicle) {
    if (!window.currentUser) return;
    
    const { error } = await window.supabaseClient
      .from('vehicles')
      .upsert({
        ...vehicle,
        player_id: window.currentUser.id,
      });
      
    if (error) {
      console.error("Error saving vehicle:", error);
    }
  }

  async getVehicleForBuilding(buildingId) {
    let vehicle = this.vehicles.find(v => v.building_id === buildingId);
    
    if (!vehicle) {
      const building = window.structureManager.buildings.find(b => b.dbId === buildingId);
      if (!building) return null;
      
      // Create new vehicle if it doesn't exist yet
      vehicle = {
        building_id: buildingId,
        type: building.type.id === 'TRANSPORT_BAY' ? 'transport' : 'gunship',
        status: 'idle',
        assigned_troops: { soldier: 0, medic: 0, juggernaut: 0 }
      };
      
      const { data, error } = await window.supabaseClient
        .from('vehicles')
        .insert({
          ...vehicle,
          player_id: window.currentUser.id
        })
        .select()
        .single();
        
      if (!error && data) {
        vehicle = data;
        this.vehicles.push(vehicle);
      }
    }
    
    return vehicle;
  }
  
  async updateVehicleTroops(vehicleId, soldierDelta, medicDelta, juggernautDelta = 0) {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const building = window.structureManager.buildings.find(b => b.dbId === vehicle.building_id);
    if (!building) return;
    
    // Calculate new assignments
    const newSoldier = (vehicle.assigned_troops.soldier || 0) + soldierDelta;
    const newMedic = (vehicle.assigned_troops.medic || 0) + medicDelta;
    const newJuggernaut = (vehicle.assigned_troops.juggernaut || 0) + juggernautDelta;
    
    // Prevent negative troops
    if (newSoldier < 0 || newMedic < 0 || newJuggernaut < 0) return;
    
    // Check against capacity (transport bays will use the global max capacity when assigning, but limit to tile capacity on deploy)
    let capacity = 20 + ((building.level - 1) * 10);
    if (building.type.id === 'TRANSPORT_BAY') {
      capacity = 0;
      if (window.structureManager) {
        // Transport bays can carry up to the maximum garrison capacity (1/4 of total gunship capacity)
        const totalGunshipCapacity = window.structureManager.getCapacities().troop;
        capacity = Math.floor(totalGunshipCapacity / 4);
      }
    }

    if (newSoldier + newMedic + newJuggernaut > capacity) {
        return false; // Exceeds capacity
    }
    
    // Check available pool for additions
    if (soldierDelta > 0 && this.availableTroops.soldier < soldierDelta) return false;
    if (medicDelta > 0 && this.availableTroops.medic < medicDelta) return false;
    if (juggernautDelta > 0 && this.availableTroops.juggernaut < juggernautDelta) return false;
    if (juggernautDelta > 0 && this.availableTroops.juggernaut < juggernautDelta) return false;
    
    // Update local state
    vehicle.assigned_troops.soldier = newSoldier;
    vehicle.assigned_troops.medic = newMedic;
    vehicle.assigned_troops.juggernaut = newJuggernaut;
    
    this.updateAvailableTroops();
    await this.saveVehicle(vehicle);
    
    // Explicitly sync player state so that changes (e.g. if we want to save any global state updates) are persisted immediately
    if (window.structureManager) {
      window.structureManager.syncPlayerState();
    }

    // Try to update UI if it's open
    if (window.updateVehicleMenuUI) {
      window.updateVehicleMenuUI(vehicle, capacity);
    }
    
    // Update main UI to show available/total troops correctly
    if (window.npcManager) {
       window.npcManager.updateUI();
    }

    return true;
  }
}

window.vehicleManager = new VehicleManager();
