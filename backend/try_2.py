import re
#todo: consider the fact lots could have letters. ask sean,dave


class Plasmid:
    def __init__(self, lot, sublot, bag, vol1, other_volumes=None, notes=None):
        self._lot, self._sublot = self._validate_plasmid_format(lot=lot, sublot=sublot)
        self.bag = self._validate_bag(bag)
        self._vol1 = self._validate_single_volume(vol1)
        self._other_volumes = self._validate_multiple_volumes(other_volumes)
        self.notes = notes

    @classmethod
    def from_full_plasmid(cls, full_plasmid, bag, volume_1, volume_2=None, notes=None):
        """Load plasmid from full format (xxxx-xx)"""

        # Manual initialization with flexible validation
        plasmid = re.match(r'^(\d+)-(\d+)$', full_plasmid.strip())
        if not plasmid:
            raise ValueError("Invalid Format. Use XXXX-XX")
        lot, sublot = int(plasmid.group(1)), int(plasmid.group(2))

        return cls(lot, sublot, bag, volume_1, volume_2, notes)

    @classmethod
    def from_database(cls, lot, sublot, bag, volume_1=None, volume_2=None, notes=None):
        """Load plasmid from database values. Flexible with volumes"""

        # Manual initialization with flexible validation
        instance = cls.__new__(cls)

        instance._lot, instance._sublot = cls._validate_plasmid_format(lot=lot, sublot=sublot)
        instance.bag = instance._validate_bag(bag)
        
        # Handle vol1: try volume_1 first, then fallback to first value from volume_2
        vol1_value = cls._validate_single_volume(volume_1, required=False)
        other_volumes_list = cls._validate_multiple_volumes(volume_2)
        
        if vol1_value is None and other_volumes_list:
            # If vol1 is empty but volume_2 has data, move first volume to vol1
            instance._vol1 = other_volumes_list.pop(0)  # Take first volume
            instance._other_volumes = other_volumes_list  # Remaining volumes
        else:
            instance._vol1 = vol1_value  # This can be None
            instance._other_volumes = other_volumes_list  # This can be []
            
        instance.notes = notes

        return instance

    @classmethod
    def temp_plasmid_from_full(cls, full_plasmid):
        """Create a temporary plasmid object from full format (xxxx-xx)"""
        # Manual initialization with flexible validation
        plasmid = re.match(r'^(\d+)-(\d+)$', full_plasmid.strip())
        if not plasmid:
            raise ValueError("Invalid Format. Use XXXX-XX")
        lot, sublot = int(plasmid.group(1)), int(plasmid.group(2))
        return cls.temp_plasmid(lot, sublot)

    @classmethod
    def temp_plasmid(cls, lot, sublot):
        """Create a temporary plasmid object with only lot and sublot"""
        instance = cls.__new__(cls)
        instance._lot, instance._sublot = cls._validate_plasmid_format(lot=lot, sublot=sublot)
        instance.bag = None
        instance._vol1 = None
        instance._other_volumes = None
        instance.notes = None
        return instance

    def __str__(self):
        return f"{self.lot}-{self.sublot}"

    def __repr__(self):
        return f"Plasmid(lot={self.lot}, sublot={self.sublot}, bag={self.bag}, vol1={self.vol1}, other_volumes={self.other_volumes}, notes={self.notes})"

    def __eq__(self, other):
        if not isinstance(other, Plasmid):
            return False
        return self.lot == other.lot and self.sublot == other.sublot

    def __hash__(self):
        return hash((self.lot, self.sublot))

    # Reading properties for lot, sublot, volumes and bag
    # Cannot change them
    @property
    def lot(self):
        return self._lot

    @property
    def sublot(self):
        return self._sublot

    @property
    def vol1(self):
        return self._vol1

    @property
    def other_volumes(self):
        return self._other_volumes

    # Volume management methods with validation
    def add_volume(self, volume):
        """Add a volume to other_volumes list"""
        validated_volume = self._validate_single_volume(volume, required=True)
        if self._other_volumes is None:
            self._other_volumes = []
        self._other_volumes.append(validated_volume)

    def set_vol1(self, volume):
        """Set the primary volume with validation (allows overwriting)"""
        self._vol1 = self._validate_single_volume(volume, required=True)

    def set_other_volumes(self, volumes_input):
        """Set other volumes from string or list with validation"""
        self._other_volumes = self._validate_multiple_volumes(volumes_input)

    def delete_vol1(self):
        """Delete vol1, moving first other_volume to vol1 if available"""
        if self._vol1 is None and (not self._other_volumes or len(self._other_volumes) == 0):
            raise ValueError("If no volumes exist, please delete the whole plasmid record")
        
        if self._other_volumes and len(self._other_volumes) > 0:
            self._vol1 = self._other_volumes.pop(0)
        else:
            self._vol1 = None
            print(f"Volume 1 is deleted. If no samples exist, please delete the whole plasmid record")

    #todo: not quite sure about this yet
    def remove_other_volume(self, index):
        """Remove a specific volume from other_volumes by index"""
        if not self._other_volumes or index >= len(self._other_volumes):
            raise ValueError(f"No volume at index {index}")
        self._other_volumes.pop(index)

    def clear_all_volumes(self):
        """Clear all volumes"""
        self._vol1 = None
        self._other_volumes = None

    def other_volumes_to_string(self):
        """Convert other_volumes to database string format"""
        if not self._other_volumes:
            return None
        return ', '.join(map(str, self._other_volumes))

    def update_notes(self, notes):
        self.notes = notes.strip()

    def add_notes(self, notes):
        if self.notes is None:
            self.update_notes(notes)
        else:
            self.notes += f"\n{notes.strip()}"

    def update_bag(self, bag):
        self.bag = self._validate_bag(bag)
    #todo: add bag validation

    @staticmethod
    def _validate_plasmid_format (lot, sublot):
        """Validate lot and sublot - accept string or int"""
        try:
            lot = int(lot)
            sublot = int(sublot)
        except (ValueError, TypeError):
            raise ValueError("Lot and sublot must be integers")

        if lot < 0 or sublot < 0:
            raise ValueError("Lot and sublot must be non-negative")

        print(f"validated!")
        return lot, sublot

    @staticmethod
    def _validate_single_volume(volume_input, required=True):
        """Validate a single volume - first column (vol1)"""
        if volume_input is None or (isinstance(volume_input, str) and volume_input.strip() == ""):
            if required:
                raise ValueError("Volume (mL) is required")
            return None
            
        try:
            # Handle Decimal objects from PostgreSQL
            from decimal import Decimal
            if isinstance(volume_input, Decimal):
                volume = float(volume_input)
            else:
                volume = float(volume_input)
            if volume <= 0:
                raise ValueError("Volume must be positive")
            return volume
        except (ValueError, TypeError):
            raise ValueError(f"Volume must be a number, got: '{volume_input}' (type: {type(volume_input)})")

    #TODO: check the below. might have issues
    @staticmethod
    def _validate_multiple_volumes(volume_input):
        """Parse comma-separated volumes like '9.0, 4.0, 8.0' from second column"""
        if volume_input is None or (isinstance(volume_input, str) and volume_input.strip() == ""):
            return []
        
        volume_str = str(volume_input).strip()
        
        # Split by commas, semicolons, pipes, or spaces and extract valid numbers
        parts = re.split(r'[,;|\s]+', volume_str)
        volumes = []
        
        for part in parts:
            # Extract numbers from each part (handles things like '3.0(UNDILUTED)')
            numbers = re.findall(r'\d+\.?\d*', part.strip())
            for num_str in numbers:
                try:
                    volume = float(num_str)
                    if volume > 0:
                        volumes.append(volume)
                except ValueError:
                    print(f"invalid volume {num_str}. Not added.")
                    continue  # Skip invalid numbers
                    
        return volumes

    @staticmethod
    #todo: work on bag validation
    def _validate_bag(bag):
        return bag

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
                temp_plasmid = Plasmid.temp_plasmid_from_full(plasmid_string)
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
                bag_groups[plasmid.bag].append({
                    'lot': plasmid.lot,
                    'sublot': plasmid.sublot,
                    'vol1': plasmid.vol1 or '',
                    'vol2': ', '.join(map(str, plasmid.other_volumes)) if plasmid.other_volumes else '',
                    'notes': plasmid.notes or '',
                    'id': plasmid.__str__()
                })
            else:
                raise ValueError("seems something doesnt have a bag! fix this")

        return dict(sorted(bag_groups.items(), key=lambda x: self._natural_sort_key(x[0])))


        # Natural sort helper function for search operation
    @staticmethod
    def _natural_sort_key(bag):
        return [int(text) if text.isdigit() else text.lower()
                for text in re.split('([0-9]+)', bag)]



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