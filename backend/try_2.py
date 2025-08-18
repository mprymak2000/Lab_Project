import re
#todo: consider the fact lots could have letters. ask sean,dave


class Plasmid:
    def __init__(self, lot, sublot, bag, volume_1, volume_2=None, notes=None):
        self._lot, self._sublot = self._validate_plasmid_format(lot=lot, sublot=sublot)
        self._bag = bag
        self.volume_1 = self._validate_volume(volume_1)
        self.volume_2 = self._validate_volume(volume_2, required=False)
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
        """Load plassmid from database values. Fliexble with volumes"""

        # Manual initialization with flexible validation
        instance = cls.__new__(cls)

        instance._lot, instance._sublot = cls._validate_plasmid_format(lot=lot, sublot=sublot)
        instance._bag = bag
        instance.volume_1 = cls._validate_volume(volume_1, required=False)  # Flexible
        instance.volume_2 = cls._validate_volume(volume_2, required=False)
        if instance.volume_1 is None and instance.volume_2 is not None:
            instance.volume_1 = instance.volume_2
            instance.volume_2 = None
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
        instance._bag = None
        instance.volume_1 = None
        instance.volume_2 = None
        instance.notes = None
        return instance

    def __str__(self):
        return f"{self.lot}-{self.sublot}"

    def __repr__(self):
        return f"Plasmid(lot={self.lot}, sublot={self.sublot}, bag={self.bag}, volume_1={self.volume_1}, volume_2={self.volume_2}, notes={self.notes})"

    def __eq__(self, other):
        if not isinstance(other, Plasmid):
            return False
        return self.lot == other.lot and self.sublot == other.sublot

    def __hash__(self):
        return hash((self.lot, self.sublot))

    # Reading properties for lot, sublot, and bag
    # Cannot change them
    @property
    def lot(self):
        return self._lot

    @property
    def sublot(self):
        return self._sublot

    @property
    def bag(self):
        return self._bag


    # Some setter functions with input validation: volume_1, volume_2, notes
    def add_volume(self, volume):
        if self.volume_1 is not None and self.volume_2 is not None:
            raise ValueError("Both volumes already set. Use update_volume_2 to change it.")
        validated_volume = self._validate_volume(volume, required=True)
        if self.volume_1 is not None:
            self.volume_2 = validated_volume
        else:
            self.volume_2 = validated_volume

    #only delete a volume if another exists
    def delete_volume_1(self):
        if self.volume_1 is None and self.volume_2 is None:
            raise ValueError("If no volumes exist, please delete the whole plasmid record")
        if self.volume_2 is not None:
            self.volume_1 = self.volume_2
            self.volume_2 = None
        else:
            self.volume_1 = None
            print(f"Volume 1 is deleted. If no samples exist, please delete the whole plasmid record")

    def delete_volume_2(self):
        if self.volume_2 is None:
            raise ValueError("No volume 2 exists")
        self.volume_2 = None

    def update_volume_1(self, volume):
        self.update_volume(volume, 1)

    def update_volume_2(self, volume):
        self.update_volume(volume, 2)

    def update_volume(self, volume, which_volume):
        if which_volume != 1 and which_volume != 2:
            raise ValueError("You can update either volume 1 or volume 2")

        validated_volume = self._validate_volume(volume, True)

        if which_volume == 1:
            self.volume_1 = validated_volume
        else:
            if self.volume_1 is None:
                self.volume_1 = validated_volume
            else:
                self.volume_2 = validated_volume

    def update_notes(self, notes):
        self.notes = notes.strip()

    def add_notes(self, notes):
        if self.notes is None:
            self.update_notes(notes)
        else:
            self.notes += f"\n{notes.strip()}"

    @staticmethod
    def _validate_plasmid_format (lot, sublot):
        """Validate lot and sublot - accept string or int"""
        try:
            lot = int(lot)
            sublot = int(sublot)
        except (ValueError, TypeError):
            raise ValueError("Lot and sublot must be integers")

        if lot < 0 or sublot < 1:
            raise ValueError("Lot must be non-negative and sublot must be positive")

        print(f"validated!")
        return lot, sublot

    @staticmethod
    def _validate_volume (volume_input, required=True):
        if volume_input is None:
            if required:
                raise ValueError("Volume (mL) is required")
            return None
        try:
            volume = float(volume_input)
        except (ValueError, TypeError):
            raise ValueError("Volume must be a number")
        if volume <= 0:
            raise ValueError("Volume must be positive")
        return volume


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
                bag_groups[plasmid.bag].append(str(plasmid))

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