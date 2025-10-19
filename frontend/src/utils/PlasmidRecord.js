/*
    PlasmidRecord class to manage record data with validation and total volume calculation.
    Each record includes lot, sublot, bag, samples (array of sample objects), notes, date_added, and total_volume being added in automagically.
    EXCEPT SAMPLES, Constructor allows anythign to be passed in, so it's user input friendly.
    Samples is an object, with volume floats to be passed into it, and therefore its structure is enforced to separate concerns...
    ... each component MUST have this structure in the end, and it makes for easy maintence
    Validation methods ensure data integrity for lot, sublot, bag, and samples.
    Aside from samples structure, No enforcement occurs in constructor, all data is to be validated before finalizing operations, including actual float values passed to samples
 */


export class PlasmidRecord {
    constructor({lot='', sublot='', bag='', samples=null, notes = '', date_added = ''}) {
        this.lot = lot;
        this.sublot = sublot;
        this.bag = bag;
        this.samples = this.normalizeSamples(samples); 
        this.notes = notes;
        this.date_added = date_added;
        // Always calculate total_volume from samples, on each initialization
        this.total_volume = this.calculateTotalVolume();
    }
    /**
     * Normalizes sample input to ensure consistent structure for all samples
     * Every sample must have: {volume, date_created, date_modified}
     */
    normalizeSamples(samples) {
        // Case 1: Array with elements (most common case)
        if (Array.isArray(samples) && samples.length > 0) {
            return samples.map(sample => {
                // Subcase 1a: Object volume (from database or frontend editing)
                if (typeof sample === 'object' && sample !== null) {
                    // Examples: {volume: "5.0", date_created: "2023-01-01"} or {volume: "3.0"}
                    // Ensure all required fields exist
                    return {
                        volume: sample.volume,
                        date_created: sample.date_created || "",
                        date_modified: sample.date_modified || "",
                        is_checked_out: sample.is_checked_out ?? false,
                        checked_out_by: sample.checked_out_by || "",
                        checked_out_at: sample.checked_out_at || "",
                        checked_in_at: sample.checked_in_at || ""
                    };
                } else {
                    // Subcase 1b: Primitive volume (raw numbers/strings)
                    // Examples: "5.0", 3.5, null
                    // Convert to full object structure with current timestamps
                    return {volume: sample, date_created: "", date_modified: "", is_checked_out: false, checked_out_by: "", checked_out_at: "", checked_in_at: ""};
                }
            });
        }
        // Case 2: Single non-array value (rare edge case)
        else if (samples != null && !Array.isArray(samples)) {
            // Examples: "5.0", 3.5
            // Wrap single value in array with proper structure
            return [{volume: samples, date_created: "", date_modified: "", is_checked_out: false, checked_out_by: "", checked_out_at: "", checked_in_at: ""}];
        }
        // Case 3: Null, undefined, or empty array (new record initialization)
        // Create default empty sample with null volume
        return [{volume: null, date_created: "", date_modified: "", is_checked_out: false, checked_out_by: "", checked_out_at: "", checked_in_at: ""}];
    }

    calculateTotalVolume() {
        if (!this.samples || !Array.isArray(this.samples)) return 0;
        return this.samples.reduce((sum, vol) => sum + (parseFloat(vol.volume) || 0), 0);
    }


    validateLot(value) {
        if (value === "" || value == null) return "Lot: this field cannot be empty";
        if (!/^\d+$/.test(value)) return "Lot: must contain only digits";
        if (value.length > 1 && value.startsWith('0')) return "Lot: this field cannot have leading zeros";
        if (parseInt(value, 10) <= 0) return "Lot: this field must be a positive integer";
        
        return "";
    }

    validateSublot(value) {
        if (value === "" || value == null) return "Sublot: this field cannot be empty";
        if (!/^\d+$/.test(value)) return "Sublot: must contain only digits";
        if (value.length > 1 && value.startsWith('0')) return "Sublot: this field cannot have leading zeros";
        if (parseInt(value, 10) < 0) return "Sublot: must be a non-negative integer";
        
        return "";
    }

    validateBag(value) {
        if (value === "" || value == null) return "Bag: this field cannot be empty";
        if (!/^[A-Za-z][1-9]\d*$/.test(value)) return "Bag: must be one letter followed by a number with no leading zeros (e.g., C20)";
        return "";
    }


    // Validation for single sample volume input - handles strings during typing. user friendly messages.
    validateVolume(volume) {
        if (volume === "" || volume == null) return "Sample: this field cannot be empty"; //catches all empties, null and undefined
        if (!/^\d*\.?\d*$/.test(volume) || volume === '.') return "Sample: must an integer or decimal";
        if (parseFloat(volume) <= 0.5) return "Sample: must be a positive number above 0.5mL. Store in microcentrifuge tube if less.";
        return "";
    }

    // static version for use in static contexts
    static staticValidateVolume(volume) {
        if (volume === "" || volume == null) return "Sample: this field cannot be empty"; //catches all empties, null and undefined
        if (!/^\d*\.?\d*$/.test(volume) || volume === '.') return "Sample: must an integer or decimal";
        if (parseFloat(volume) <= 0.5) return "Sample: must be a positive number above 0.5mL. Store in microcentrifuge tube if less.";
        return "";
    }

    // Validates the samples array for final record validation
    validateSamplesArray(samples) {
        // Constructor ensures this is always a properly structured array with at least one {samples:null,date:"",date:""} element
        
        // Validate each sample value
        for (let i = 0; i < samples.length; i++) {
            const sampleError = this.validateVolume(samples[i].volume);
            if (sampleError) {
                // Remove "Sample: " prefix since we add position info
                const cleanError = sampleError.replace("Sample: ", "");
                return `Sample ${i + 1}: ${cleanError}`;
            }
        }
        return "";
    }



    getFullId() {
        return `${this.lot}-${this.sublot}`;
    }

    equals(other) {
        if (!other || !(other instanceof PlasmidRecord)) return false;
        
        // Compare basic fields
        if (this.lot !== other.lot || 
            this.sublot !== other.sublot || 
            this.bag !== other.bag || 
            this.notes !== other.notes) {
            return false;
        }

        // Compare samples arrays
        if (this.samples.length !== other.samples.length) return false;
        
        for (let i = 0; i < this.samples.length; i++) {
            const thisSample = this.samples[i];
            const otherSample = other.samples[i];
            
            if (thisSample.volume !== otherSample.volume ||
                thisSample.date_created !== otherSample.date_created ||
                thisSample.date_modified !== otherSample.date_modified ||
                thisSample.is_checked_out !== otherSample.is_checked_out ||
                thisSample.checked_out_by !== otherSample.checked_out_by ||
                thisSample.checked_out_at !== otherSample.checked_out_at ||
                thisSample.checked_in_at !== otherSample.checked_in_at) {

                return false;
            }
        }
        
        return true;
    }

    isValid() {
        return this.getValidationErrors().length === 0;
    }

    getValidationErrors() {
        const errors = [];
        
        const lotError = this.validateLot(this.lot);
        const sublotError = this.validateSublot(this.sublot);
        const bagError = this.validateBag(this.bag);
        const samplesError = this.validateSamplesArray(this.samples);

        if (lotError) errors.push(lotError);
        if (sublotError) errors.push(sublotError);
        if (bagError) errors.push(bagError);
        if (samplesError) errors.push(samplesError);

        return errors;
    }

    toAPIPayload() {
        return {
            lot: this.lot,
            sublot: this.sublot,
            bag: this.bag,
            samples: this.samples,
            notes: this.notes,
            date_added: this.date_added
        };
    }

    static fromPlainObject(obj) {
        return new PlasmidRecord(obj);
    }
}

/*
normalizeSamples(samples) {
        if (Array.isArray(samples) && samples.length > 0) {
            return samples.map(vol =>
                typeof vol === 'object' && vol !== null ? vol :
                    {volume: vol, date_created: "", date_modified: ""}
            );
        } else if (samples != null && !Array.isArray(samples)) {
            return [{volume: samples, date_created: "", date_modified: ""}];
        }
        return [{volume: null, date_created: "", date_modified: ""}];
    }
 */