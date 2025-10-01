import { useRef, useState } from 'react';
import { PlasmidRecord } from '../utils/PlasmidRecord.js';

/*
Custom hook to manage the state and logic for any new plasmid record input.
In Lab_Project, it's used in addplasmidmodal(bulk adding) and bagcard (for quick adding).

The logic uses PlasmidRecord.js class for validation.

for handling input:
as user types, all chars are rejected unless its notes or bag fields.
the handlers then use plasmidrecord validation methods to bring up any errors, which will be displayed to the user.
A plasmidrecord instance is created with string value inputs (potentially invalid inputs), to allow freedom to user to type whatever they want, and the errors will be shown.
When it's time to save the record, the parent component should call PlasmidRecord.isValid() method to ensure all fields are valid before proceeding.
PlasmidRecord checks all rules strictly only through isValid() validation. no eenforcement
PlasmidRecord only en

Input restrictions
lot, sublot: only digits allowed
volumes: only digits and decimal point allowed
Input supports:
When user blurs a volume input, if its a whole number, .0 is added for clarity.

Alternative approach: restrict chars same way and allow datachange freely as now, but display errors onBlur.
 */

export const usePlasmidRecordInput = (initialData, onDataChange, onDelete, onSave) => {
    const lotRef = useRef(null);
    const sublotRef = useRef(null);

    const [sublotError, setSublotError] = useState('');
    const [lotError, setLotError] = useState('');
    const [volumeErrors, setVolumeErrors] = useState(['', '', '']);
    const [bagError, setBagError] = useState('');
    const [showNotes, setShowNotes] = useState(false);

    const handleLotChange = (e) => {
        const value = e.target.value;

        // Restriction: Only allow digits
        if (!/^\d*$/.test(value)) return;

        //Get errors to display. no validation enforcement yet.
        const error = initialData.validateLot(value);
        setLotError(error);

        // make plasmid record with strings. validation unenforced. allows user to type freely, prevent save if error
        const updatedRecord = new PlasmidRecord({...initialData, lot: value});
        onDataChange(updatedRecord);

        //skip to next line if 4 digits entered
        if (value.length === 4) sublotRef.current?.focus();
    };

    const handleSublotChange = (e) => {
        const value = e.target.value;
        
        // Only allow digits
        if (!/^\d*$/.test(value)) return;

        //below process is same as for lot in function above
        const error = initialData.validateSublot(value);
        setSublotError(error);

        const updatedRecord = new PlasmidRecord({...initialData, sublot: value});
        onDataChange(updatedRecord);
    };

    // go back to lot on backspace when field empty
    const handleSublotKeyDown = (e) => {
        if (e.key === 'Backspace' && initialData.sublot === '') lotRef.current?.focus();
    };

    const handleVolumeChange = (index, e) => {
        const value = e.target.value;
        
        // Only allow digits and decimal point
        if (!/^\d*\.?\d*$/.test(value)) return;

        // get and set errors. no input enforcement, show error, preevent save. same as lot and sublot above
        const error = initialData.validateVolume(value);
        const newErrors = [...volumeErrors];
        newErrors[index] = error;
        setVolumeErrors(newErrors);

        // make new plasmidrecord with string values. no enforcement
        const newSamples = [...initialData.samples];
        const oldVolume = newSamples[index];
        newSamples[index] = {...oldVolume, volume: value, date_modified: new Date().toISOString()};
        const updatedRecord = new PlasmidRecord({...initialData, samples: newSamples});
        onDataChange(updatedRecord);
    };

    const addVolumeInput = () => {
        if (initialData.samples.length >= 3) return;
        //initializing with dates bc no refresh on editing, so useer will be able to instant see the date
        const now = new Date().toISOString();
        const newSamples = [...initialData.samples, { volume: null, date_created: now, date_modified: now}];
        const updatedRecord = new PlasmidRecord({...initialData, samples: newSamples});
        onDataChange(updatedRecord);
    };

    const handleVolumeBlur = (index, e) => {
        const value = e.target.value.trim();

        // Format if no errors
        if (value && volumeErrors[index] === '') {
            let formattedValue = value;
            // Add .0 to whole numbers
            if (!value.includes('.')) {
                formattedValue = value + '.0';
            }
            // Add 0 before decimal if starts with .
            if (value.startsWith('.')) {
                formattedValue = '0' + value;
            }

            const newSamples = [...initialData.samples];
            const oldVolume = newSamples[index];
            newSamples[index] = {...oldVolume, volume: formattedValue, date_modified: new Date().toISOString()};
            
            const updatedRecord = new PlasmidRecord({...initialData, samples: newSamples});
            onDataChange(updatedRecord);
        }

        // Auto-remove empty volumes (except the first one)
        if (!value && index > 0) {
            deleteVolumeInput(index);
        }
    };

    const deleteVolumeInput = (index) => {
        if (initialData.samples.length <= 1) return; // Keep at least one volume

        const newSamples = initialData.samples.filter((_, i) => i !== index);
        const newErrors = volumeErrors.filter((_, i) => i !== index);
        setVolumeErrors(newErrors);

        const updatedRecord = new PlasmidRecord({...initialData, samples: newSamples});
        onDataChange(updatedRecord);
    };

    const handleBagChange = (e) => {
        const value = e.target.value;
        const error = initialData.validateBag(value);
        setBagError(error);

        const updatedRecord = new PlasmidRecord({...initialData, bag: value});
        onDataChange(updatedRecord);
    };

    const handleBagBlur = (e) => {
        const value = e.target.value.trim().toUpperCase();
        
        if (value) {
            const updatedRecord = new PlasmidRecord({...initialData, bag: value});
            onDataChange(updatedRecord);
        }
    };

    const handleNotesChange = (value) => {
        const updatedRecord = new PlasmidRecord({...initialData, notes: value});
        onDataChange(updatedRecord);
    };

    const handleSave = () => {
        if (onSave && initialData.isValid()) {
            onSave(initialData);
        }
    };

    const handleCancel = () => {
        if (onDelete) {
            onDelete();
        }
    };

    // Return all the state and handlers
    return {
        // Refs
        lotRef,
        sublotRef,
        
        // State
        sublotError,
        lotError,
        volumeErrors,
        bagError,
        showNotes,
        setShowNotes,
        
        // Handlers
        handleLotChange,
        handleSublotChange,
        handleSublotKeyDown,
        handleVolumeChange,
        handleVolumeBlur,
        addVolumeInput,
        deleteVolumeInput,
        handleBagChange,
        handleBagBlur,
        handleNotesChange,
        handleSave,
        handleCancel,
        
        // Data
        data: initialData,
        
        // Computed
        hasErrors: lotError || sublotError || bagError || volumeErrors.some(err => err !== ''),
        isValid: initialData.isValid()
    };
};