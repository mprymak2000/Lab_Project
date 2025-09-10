export class PlasmidRecord {
    constructor({id, lot, sublot, vol1, vol2 = '', notes = '', date_added = new Date().toISOString().split('T')[0]}) {
        this.lot = lot;
        this.sublot = sublot;
        this.vol1 = vol1;
        this.vol2 = vol2;
        this.notes = notes;
        this.date_added = date_added;
    }

    validateLot(value) {
        if (/[^a-zA-Z0-9]/.test(value)) return "Lot: this field only accepts numbers (or letters)";
        if (value === "0" || /^0+/.test(value)) return "Lot: this field cannot be zero or have leading zeros";
        else if (value === "") return "Lot: this field cannot be empty";
        return "";
    }

    validateSublot(value) {
        if (/[^a-zA-Z0-9]/.test(value)) return "Sublot: this field only accepts numbers (or letters)";
        if (value === "0" || /^0+/.test(value)) return "Sublot: this field cannot be zero or have leading zeros";
        if(value === "") return "Sublot: this field cannot be empty";
        return "";
    }

    validateVol1(value) {
        if (!/^\d*\.?\d*$/.test(value) || value === '.') return "Volume 1: this field only accepts numbers";
        if (value === "0" || /^0+(?!\.)/.test(value) || /^0+\.0+$/.test(value)) return "Volume 1: this field cannot be zero or have leading zeros";
        else if (value === "") return "Volume 1: this field cannot be empty";
        return "";
    }

    validateVol2(value) {
        if (value === "" || value === null || value === undefined) return "";
        
        // Accept comma-separated numbers like "2.1, 3.0, 5.0"
        const numbers = value.split(',').map(v => v.trim());
        for (const num of numbers) {
            if (num !== "" && (!/^\d*\.?\d*$/.test(num) || num === '.')) {
                return "Volume 2: this field only accepts numbers (comma-separated)";
            }
            if (num === "0" || /^0+(?!\.)/.test(num) || /^0+\.0+$/.test(num)) {
                return "Volume 2: volumes cannot be zero or have leading zeros";
            }
        }
        return "";
    }

    getFullId() {
        return `${this.lot}-${this.sublot}`;
    }

    isValid() {
        return this.validateLot(this.lot) === "" &&
            this.validateSublot(this.sublot) === "" &&
            this.validateVol1(this.vol1) === "" &&
            this.validateVol2(this.vol2) === "";
    }

    static fromPlainObject(obj) {
        return new PlasmidRecord(obj);
    }
}