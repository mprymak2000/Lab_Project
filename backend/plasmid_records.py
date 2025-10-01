import datetime
import re

#todo: consider the fact lots could have letters. ask sean,dave

class Plasmid:
    # empties for records that exist (samples/volumes and notes), None for temp objects
    def __init__(self, lot, sublot, bag, samples, notes=None, date_added=None):
        self._lot, self._sublot = self._validate_plasmid_format(lot=lot, sublot=sublot) #must exist and be valid
        self._bag = self._validate_bag(bag) #must exist and be valid
        self._samples = SampleCollection(samples) #turns into empty collection if None/empty. None means uninitialized, empty means no samples (for old database records)
        self.notes = self._normalize_notes(notes) #no none, just empty if record exists
        self.date_added = date_added

    @classmethod
    def from_id(cls, full_plasmid, bag, samples, notes=None):
        """Load plasmid from full format (xxxx-xx)"""

        # Manual initialization with flexible validation
        plasmid = re.match(r'^(\d+)-(\d+)$', full_plasmid.strip())
        if not plasmid:
            raise ValueError("Invalid Format. Use XXXX-XX")
        lot, sublot = int(plasmid.group(1)), int(plasmid.group(2))

        return cls(lot, sublot, bag, samples, notes)

    """Parital initialization for temporary objects without bag and samples/volumes. For search purposes"""
    @classmethod
    def temp_plasmid_from_id(cls, full_plasmid, bag=None, samples=None, notes=None):
        """Create a temporary plasmid object from full format (xxxx-xx)"""
        # Manual initialization with flexible validation
        plasmid = re.match(r'^(\d+)-(\d+)$', full_plasmid.strip())
        if not plasmid:
            raise ValueError("Invalid Format. Use XXXX-XX")
        lot, sublot = int(plasmid.group(1)), int(plasmid.group(2))
        return cls.temp_plasmid(lot, sublot, bag, samples, notes)

    @classmethod
    def temp_plasmid(cls, lot, sublot, bag=None, samples=None, notes=None):
        """Create a temporary plasmid object with only lot and sublot being required"""
        try:
            lot = int(lot)
            sublot = int(sublot)
        except (ValueError, TypeError):
            raise ValueError("GAYNESS")
        instance = cls.__new__(cls)
        instance._lot, instance._sublot = cls._validate_plasmid_format(lot=lot, sublot=sublot)
        instance._bag = cls._validate_bag(bag) if bag is not None else None
        instance._samples = SampleCollection(samples) if samples is not None else None
        instance.notes = cls._normalize_notes(notes) if notes is not None else None
        return instance

    def __str__(self):
        return f"{self.lot}-{self.sublot}"

    def __repr__(self):
        return f"Plasmid(lot={self.lot}, sublot={self.sublot}, bag={self.bag}, samples={self._samples}, notes={self.notes})"
    
    def to_dict(self):
        """Convert plasmid to dictionary for JSON serialization"""
        return {
            'lot': self.lot,
            'sublot': self.sublot,
            'bag': self.bag,
            'samples': self._samples.to_dict() if self._samples else [],
            'notes': self.notes,
            'date_added': self.date_added
        }

    def __eq__(self, other):
        if not isinstance(other, Plasmid):
            return False
        return self.lot == other.lot and self.sublot == other.sublot and self.bag == other.bag and self._samples == other._samples and self.notes == other.notes

    def __hash__(self):
        return hash((self.lot, self.sublot))

    # Reading properties for lot, sublot, samples/volumes and bag
    # Cannot change them
    @property
    def lot(self):
        return self._lot

    @property
    def sublot(self):
        return self._sublot

    @property
    def samples(self):
        return self._samples
    
    @property
    def volumes(self):
        """Legacy property - returns list of volume values"""
        return self._samples.to_list() if self._samples else []

    @property
    def bag(self):
        return self._bag
    #----------------------------
    # Volume management methods with validation
    #----------------------------

    def add_sample(self, sample_volume):
        """Add a volume to samples collection"""
        self._samples.add_sample(sample_volume)

    def set_sample(self, sample_volume, index):
        """Replace a specified volume"""
        self._samples.set_sample(index, sample_volume)

    def remove_sample(self, index):
        """Remove a specific volume by index"""
        removed_sample = self._samples.remove_sample(index)
        print(f"Volume {removed_sample.volume} at index {index} is removed.")
        return removed_sample

    def clear_all_samples(self):
        """Clear all volumes and metadata"""
        removed_samples = self._samples.clear_all()
        print(f"Volumes are deleted. If no samples exist, please delete the whole plasmid record")
        return removed_samples

    def samples_to_string(self):
        """Convert samples to string format"""
        return self._samples.to_string() if self._samples else ""

    #----------------------------
    # Notes & Bag management methods with validation
    #----------------------------

    def add_notes(self, notes):
        if not self.notes:
            self.notes = notes.strip()
        else:
            self.notes += f"\n{notes.strip()}"

    def update_bag(self, bag):
        self._bag = self._validate_bag(bag)

    #----------------------------
    # Static validation methods
    #----------------------------

    @staticmethod
    def _validate_plasmid_format (lot, sublot):
        """Validate lot and sublot - accept string or int"""
        try:
            lot = int(lot)
            sublot = int(sublot)
        except (ValueError, TypeError):
            raise ValueError("Lot and sublot must be integers")

        if lot <= 0 or sublot < 0:
            raise ValueError("Lot must be positive, sublot must be non-negative")

        print(f"validated!")
        return lot, sublot


    @staticmethod
    def _validate_bag(bag):
        # Check for empty/null bag
        if not bag or not str(bag).strip():
            raise ValueError("Bag cannot be empty or null")
        
        bag = str(bag).strip().upper()  # Normalize to uppercase
        
        # Check bag format: C followed by positive integer (no leading zeros)
        match = re.match(r'^C(\d+)$', bag)
        if not match:
            raise ValueError(f"Invalid bag format '{bag}'. Must be C followed by a number (e.g., C1, C22, C1000)")
        
        bag_str = match.group(1)
        
        # Reject leading zeros
        if bag_str.startswith('0') and len(bag_str) > 1:
            raise ValueError(f"Bag number cannot have leading zeros. Got C{bag_str}")
        
        # Check bag number is positive
        bag_number = int(bag_str)
        if bag_number < 1:
            raise ValueError(f"Bag number must be positive. Got C{bag_number}")
        
        return bag


    @staticmethod
    def _normalize_notes(notes):
        """
        Normalize notes according to these rules:
        - If notes is None → return ""
        - If notes is a string → strip it
        - Otherwise → return notes as-is
        """
        if notes is None:
            return ""
        elif isinstance(notes, str):
            return notes.strip()
        else:
            return notes



#----------------------------
# PLASMID COLLECTION CLASS FOR STORING MULTIPLE PLASMIDS
# #----------------------------

class PlasmidCollection:
    def __init__(self, plasmids=None):
        self.plasmids = plasmids or []

    @classmethod
    def from_user_input(cls, user_input):
        """Create collection from user string like '3380-1, 3380-2, 5280-1'"""
        if not user_input or not user_input.strip():
            raise ValueError('No input provided')

        plasmid_strings = re.split(r'[,\s]+', user_input.strip())
        plasmids = []

        for plasmid_string in plasmid_strings:
            # Use Plasmid validation for parsing
            if plasmid_string.strip():
                temp_plasmid = Plasmid.temp_plasmid_from_id(plasmid_string)
                plasmids.append(temp_plasmid)

        return cls(plasmids)

    def get_lots_sublots(self):
        """Extract lot/sublot pairs for database queries"""
        lots = [p.lot for p in self.plasmids]
        sublots = [p.sublot for p in self.plasmids]
        return lots, sublots

    def get_lot_sublot_tuples(self):
        """Get as tuples for set operations"""
        return {(p.lot, p.sublot) for p in self.plasmids}

    def find_missing(self, found_collection):
        """Find which plasmids weren't found in database"""
        requested_set = self.get_lot_sublot_tuples()
        found_set = found_collection.get_lot_sublot_tuples()
        missing_tuples = requested_set - found_set
        return [f"{lot}-{sublot}" for lot, sublot in missing_tuples]

    def group_by_bags(self):
        """Group plasmids by their bag numbers"""
        from collections import defaultdict
        bag_groups = defaultdict(list)

        for plasmid in self.plasmids:
            if plasmid.bag:  # Only group if plasmid has bag (from database)
                bag_groups[plasmid.bag].append(plasmid.to_dict())
            else:
                raise ValueError("seems something doesnt have a bag! fix this")

        return dict(bag_groups)



    def to_dict(self, found_collection):
        """Convert to dictionary for API responses"""
        output = {
            'found': f"{len(found_collection)}/{len(self)}",
            'bags': found_collection.group_by_bags(),
        }

        missing = self.find_missing(found_collection)
        if missing:
            output['not_found'] = missing

        return output

    def __len__(self):
        return len(self.plasmids)

    def __iter__(self):
        return iter(self.plasmids)

    def __getitem__(self, index):
        return self.plasmids[index]

    def append(self, plasmid):
        """Add plasmid to collection"""
        self.plasmids.append(plasmid)

    def extend(self, other_collection):
        """Add all plasmids from another collection"""
        self.plasmids.extend(other_collection.plasmids)




class Sample:
    def __init__(self, volume, date_created=None, date_modified=None):
        self.volume = self._validate_volume(volume)
        self.date_created = self._parse_date(date_created) if date_created else datetime.datetime.now()
        self.date_modified = self._parse_date(date_modified) if date_modified else self.date_created

    @staticmethod
    def _validate_volume(volume):
        try:
            volume = float(volume)
        except (ValueError, TypeError):
            raise ValueError(f"Volume must be a number, got: '{volume}' (type: {type(volume)})")
        if volume <= 0:
            raise ValueError("Volume must be positive")
        return volume

    @staticmethod
    def _parse_date(date_input):
        """Parse date from various formats"""
        if isinstance(date_input, datetime.datetime):
            return date_input
        elif isinstance(date_input, str):
            try:
                # Try ISO format first
                return datetime.datetime.fromisoformat(date_input.replace('Z', '+00:00'))
            except ValueError:
                try:
                    # Try common formats
                    return datetime.datetime.strptime(date_input, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    raise ValueError(f"Cannot parse date: {date_input}")
        else:
            raise ValueError(f"Invalid date format: {date_input}")


    def __str__(self):
        return str(self.volume)

    def __repr__(self):
        return f"Sample(volume={self.volume})"

    def __eq__(self, other):
        if isinstance(other, Sample):
            return self.volume == other.volume
        return False



class SampleCollection:
    """
       Initialize a collection of samples from various input formats.

       Args:
           samples input: Can be one of the following:
               - None: Creates empty collection
               - List of dicts: [{'volume': 1.5, 'date_created': '2024-01-01T10:00:00', 'date_modified': '2024-01-01T10:00:00'}, ...]
               - List of numbers: [1.5, 2.0, 3.5] (backward compatibility)
               - List with empty/null strings: ['', 'null', 'none'] -> empty collection
               - Single dict: {'volume': 1.5, 'date_created': ..., 'date_modified': ...}
               - Single number: 1.5 (backward compatibility)
               - Empty list: [] -> empty collection
        Returns a proper list of dicts with dmetadata
       """
    def __init__(self, samples=None):
        self._samples = self._parse_samples_input(samples)

    def _parse_samples_input(self, samples):
        """
        Helper function to parse various sample input formats into Sample objects.
        
        Returns:
            List[Sample]: List of Sample objects
        """
        if samples is None:
            return []
        
        if isinstance(samples, list):
            return self._parse_samples_list(samples)
        else:
            # Single value - could be dict or simple volume
            return [self._create_sample_from_input(samples)]

    def _parse_samples_list(self, samples_list):
        """Parse a list of sample inputs into Sample objects."""
        if not samples_list or self._is_empty_samples_list(samples_list):
            return []
        
        parsed_samples = []
        for item in samples_list:
            parsed_samples.append(self._create_sample_from_input(item))
        return parsed_samples

    @staticmethod
    def _is_empty_samples_list(samples_list):
        """Check if the samples list represents empty/null data."""
        return (len(samples_list) == 1 and
                isinstance(samples_list[0], str) and
                samples_list[0].strip().lower() in ('', 'null', 'none'))

    @staticmethod
    def _create_sample_from_input(item):
        """Create a Sample object from various input formats."""
        if isinstance(item, Sample):
            return item
        elif isinstance(item, dict):
            # Handle JSON/dict format: {'volume': float, 'date_created': date, 'date_modified': date}
            volume = item.get('volume')
            date_created = item.get('date_created')
            date_modified = item.get('date_modified')
            return Sample(volume, date_created, date_modified)
        else:
            # Handle simple volume value (backward compatibility)
            return Sample(item)

    @property
    def samples(self):
        return self._samples


    def add_sample(self, volume):
        sample = Sample(volume)
        self._samples.append(sample)
        return sample

    def get_sample(self, index):
        if not self._samples or index >= len(self._samples):
            raise ValueError(f"No sample at index {index}")
        return self._samples[index]

    def set_sample(self, index, volume):
        if not self._samples or index >= len(self._samples):
            raise ValueError(f"No sample at index {index}")
        old_sample = self._samples[index]
        self._samples[index] = Sample(volume)
        self._samples[index].date_modified = datetime.datetime.now()
        return old_sample

    def remove_sample(self, index):
        if not self._samples or index >= len(self._samples):
            raise ValueError(f"No sample at index {index}")
        return self._samples.pop(index)

    def clear_all(self):
        removed_samples = self._samples[:]
        self._samples = []
        return removed_samples

    def to_list(self):
        return [sample.volume for sample in self._samples]

    def to_string(self):
        if not self._samples:
            return ""
        return ', '.join(str(sample.volume) for sample in self._samples)

    def to_dict(self):
        return [{'volume': sample.volume,
                 'date_created': sample.date_created.isoformat(),
                 'date_modified': sample.date_modified.isoformat()} for sample in self._samples]


    def sum_sample_volumes(self):
        return sum(sample.volume for sample in self._samples)


    def __len__(self):
        return len(self._samples)

    def __iter__(self):
        return iter(self._samples)

    def __getitem__(self, index):
        return self._samples[index]

    def __bool__(self):
        return len(self._samples) > 0