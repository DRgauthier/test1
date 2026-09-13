class VehicleManager {
  constructor() {
    this.vehicles = [];
    this.totalTroops = { soldier: 0, medic: 0 };
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
      this.totalTroops = {
        soldier: playerData.troop_counts.soldier || 0,
        medic: playerData.troop_counts.medic || 0
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
      }
    }
    
    // Ensure we don't drop below 0 if there was an inconsistency
    this.availableTroops.soldier = Math.max(0, this.availableTroops.soldier);
    this.availableTroops.medic = Math.max(0, this.availableTroops.medic);
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
      const building = window.structureManager.buildings.find(b => b.id === buildingId);
      if (!building) return null;
      
      // Create new vehicle if it doesn't exist yet
      vehicle = {
        building_id: buildingId,
        type: 'gunship', // Default for now
        status: 'idle',
        assigned_troops: { soldier: 0, medic: 0 }
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
  
  async updateVehicleTroops(vehicleId, soldierDelta, medicDelta) {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const building = window.structureManager.buildings.find(b => b.id === vehicle.building_id);
    if (!building) return;
    
    // Calculate new assignments
    const newSoldier = (vehicle.assigned_troops.soldier || 0) + soldierDelta;
    const newMedic = (vehicle.assigned_troops.medic || 0) + medicDelta;
    
    // Prevent negative troops
    if (newSoldier < 0 || newMedic < 0) return;
    
    // Check against capacity
    const capacity = 20 + ((building.level - 1) * 10);
    if (newSoldier + newMedic > capacity) {
        return false; // Exceeds capacity
    }
    
    // Check available pool for additions
    if (soldierDelta > 0 && this.availableTroops.soldier < soldierDelta) return false;
    if (medicDelta > 0 && this.availableTroops.medic < medicDelta) return false;
    
    // Update local state
    vehicle.assigned_troops.soldier = newSoldier;
    vehicle.assigned_troops.medic = newMedic;
    
    this.updateAvailableTroops();
    await this.saveVehicle(vehicle);
    
    // Try to update UI if it's open
    if (window.updateVehicleMenuUI) {
      window.updateVehicleMenuUI(vehicle, capacity);
    }
    
    return true;
  }
}

window.vehicleManager = new VehicleManager();
