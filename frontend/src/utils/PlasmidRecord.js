export class PlasmidRecord {
    constructor({id, lot, sublot, bag, volumes, notes = '', date_added = new Date().toISOString().split('T')[0], total_volume = null}) {
        this.lot = lot;
        this.sublot = sublot;
        this.bag = bag;
        this.volumes = Array.isArray(volumes) ? volumes : [{ volume: null, date_created: "", date_modified: ""}];
        this.notes = notes || '';
        this.date_added = date_added;
        // Use provided total_volume if available (from backend), otherwise calculate it
        this.total_volume = total_volume !== null ? total_volume : this.calculateTotalVolume();
    }

    calculateTotalVolume() {
        if (!this.volumes || !Array.isArray(this.volumes)) return 0;
        return this.volumes.reduce((sum, vol) => sum + (parseFloat(vol.volume) || 0), 0);
    }


    validateLot(value) {
        if (value === "") return "Lot: this field cannot be empty";
        const intValue = parseInt(value, 10);
        if (isNaN(intValue) || intValue <= 0) return "Lot: must be a positive integer with no leading zeros";
        
        return "";
    }

    validateSublot(value) {
        if (value === "") return "Sublot: this field cannot be empty";
        const intValue = parseInt(value, 10);
        if (isNaN(intValue) || intValue <= 0) return "Sublot: must be a positive integer with no leading zeros";
        return "";
    }

    validateBag(value) {
        if (value === "") return "Bag: this field cannot be empty";
        if (!/^[A-Za-z][1-9]\d*$/.test(value)) return "Bag: must be one letter followed by a number with no leading zeros (e.g., C20)";
        return "";
    }


    // Validation for single volume input - handles strings during typing
    validateVolume(volume) {
        if (volume === "") return "Volume: this field cannot be empty";
        const floatValue = parseFloat(volume);
        if (isNaN(floatValue) || floatValue <= 0) return "Volume: must be a positive number with no leading zeros";
        return "";
    }

    // Validates the volumes array for final record validation
    validateVolumesArray(volumes) {
        if (!Array.isArray(volumes)) return "Volumes: must be an array";
        
        // Filter out empty/null volumes for validation
        const validVolumes = volumes.filter(v => v.volume !== null && v.volume !== undefined);
        
        if (validVolumes.length === 0) return "Volumes: at least one volume is required";

        for (let i = 0; i < validVolumes.length; i++) {
            const error = this.validateVolumeObject(validVolumes[i]);
            if (error) return `Volume ${i + 1}: ${error}`;
        }
        return "";
    }
    // Validation for properly formatted volume objects - used in final validation
    validateVolumeObject(volumeObj) {
        if (typeof volumeObj !== "object" || volumeObj === null) return "must be an object";
        if (volumeObj.volume === null || volumeObj.volume === undefined) return "cannot be empty";
        if (typeof volumeObj.volume !== "number" || volumeObj.volume <= 0) return "must be a positive number";
        return "";
    }


    getFullId() {
        return `${this.lot}-${this.sublot}`;
    }

    isValid() {
        const lotError = this.validateLot(this.lot);
        const sublotError = this.validateSublot(this.sublot);
        const bagError = this.validateBag(this.bag);
        const volumesError = this.validateVolumesArray(this.volumes);

        if (lotError) console.log(`PlasmidRecord validation failed - Lot: ${lotError}`);
        if (sublotError) console.log(`PlasmidRecord validation failed - Sublot: ${sublotError}`);
        if (bagError) console.log(`PlasmidRecord validation failed - Bag: ${bagError}`);
        if (volumesError) console.log(`PlasmidRecord validation failed - ${volumesError}`);

        return lotError === "" && sublotError === "" && bagError === "" && volumesError === "";
    }

    static fromPlainObject(obj) {
        return new PlasmidRecord(obj);
    }
}