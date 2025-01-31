import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
from fractions import Fraction

# Weight mappings for notes (using fractions for precise arithmetic)
WEIGHT_MAP = {
    'W': Fraction(1, 1),    # Whole note
    'H': Fraction(1, 2),    # Half note
    'Q': Fraction(1, 4),    # Quarter note
    'E': Fraction(1, 8),    # Eighth note
    'S': Fraction(1, 16),   # Sixteenth note
    'T': Fraction(1, 32),   # Thirty-second note
    'Q3': Fraction(1, 6),   # Quarter note triplet
    'E3': Fraction(1, 12),  # Eighth note triplet
    'S3': Fraction(1, 24),  # Sixteenth note triplet
}

# MusicXML duration values (based on divisions=32)
DURATION_MAP = {
    'W': 128,  # Whole note
    'H': 64,   # Half note
    'Q': 32,   # Quarter note
    'E': 16,   # Eighth note
    'S': 8,    # Sixteenth note
    'T': 4,    # Thirty-second note
    'Q3': 16,  # Quarter triplet
    'E3': 8,   # Eighth triplet
    'S3': 4    # Sixteenth triplet
}

def xml_note_type(duration_char):
    """Convert duration character to MusicXML note type."""
    mapping = {
        'W': 'whole',
        'H': 'half',
        'Q': 'quarter',
        'E': 'eighth',
        'S': '16th',
        'T': '32nd',
        'Q3': 'quarter',
        'E3': 'eighth',
        'S3': '16th'
    }
    return mapping.get(duration_char, 'quarter')

def parse_note(token):
    """Parse a note token into its components."""
    note_info = {
        'rest': False,
        'sticking': None,
        'base_duration': None,
        'embellishments': [],
        'weight': Fraction(0),
        'is_triplet': False,
        'triplet_type': None,
        'duration_divisions': 32  # Default duration
    }
    
    # Handle rests
    if token.endswith('R'):
        base_duration = token[:-1]
        note_info['rest'] = True
        note_info['base_duration'] = base_duration
        note_info['weight'] = WEIGHT_MAP.get(base_duration, Fraction(1, 4))
        note_info['duration_divisions'] = DURATION_MAP.get(base_duration, 32)
        note_info['type'] = xml_note_type(base_duration)
        if base_duration.endswith('3'):
            note_info['is_triplet'] = True
            note_info['triplet_type'] = base_duration
        return note_info
    
    # Handle sticking
    if token.startswith(('R', 'L')):
        note_info['sticking'] = token[0]
        token = token[1:]
    
    # Find base duration
    for duration in sorted(WEIGHT_MAP.keys(), key=len, reverse=True):
        if token.startswith(duration):
            note_info['base_duration'] = duration
            note_info['weight'] = WEIGHT_MAP[duration]
            note_info['duration_divisions'] = DURATION_MAP[duration]
            note_info['type'] = xml_note_type(duration)
            if duration.endswith('3'):
                note_info['is_triplet'] = True
                note_info['triplet_type'] = duration
            token = token[len(duration):]
            break
    
    # Remaining characters are embellishments
    note_info['embellishments'] = list(token)
    
    return note_info

def normalize_measure(measure_tokens):
    """Normalize a measure to exactly weight 1."""
    total_weight = Fraction(0)
    normalized_tokens = []
    
    # Add tokens until we exceed weight 1
    for token in measure_tokens:
        note_info = parse_note(token)
        if total_weight + note_info['weight'] > 1:
            break
        normalized_tokens.append(token)
        total_weight += note_info['weight']
    
    # Fill remaining space with rests if needed
    remaining_weight = Fraction(1) - total_weight
    while remaining_weight > 0:
        if remaining_weight >= Fraction(1, 4):
            normalized_tokens.append('QR')
            remaining_weight -= Fraction(1, 4)
        elif remaining_weight >= Fraction(1, 8):
            normalized_tokens.append('ER')
            remaining_weight -= Fraction(1, 8)
        elif remaining_weight >= Fraction(1, 16):
            normalized_tokens.append('SR')
            remaining_weight -= Fraction(1, 16)
        else:
            normalized_tokens.append('TR')
            remaining_weight -= Fraction(1, 32)
    
    return normalized_tokens

def add_accent(note_el):
    """Add accent notation to a note."""
    notations = note_el.find('notations')
    if notations is None:
        notations = ET.SubElement(note_el, 'notations')
    articulations = ET.SubElement(notations, 'articulations')
    ET.SubElement(articulations, 'accent')

def add_ghost_note(note_el):
    """Add ghost note notation."""
    notehead = ET.SubElement(note_el, 'notehead', parentheses="yes")
    notehead.text = 'normal'

def add_flam(measure, before_note):
    """Add grace note (flam) before a note."""
    grace_note = ET.SubElement(measure, 'note')
    ET.SubElement(grace_note, 'grace', slash="yes")
    create_unpitched_elements(grace_note)
    type_el = ET.SubElement(grace_note, 'type')
    type_el.text = 'eighth'
    stem = ET.SubElement(grace_note, 'stem')
    stem.text = 'up'
    measure.insert(list(measure).index(before_note), grace_note)

def add_diddle(note_el):
    """Add tremolo (diddle) notation."""
    notations = ET.SubElement(note_el, 'notations')
    ornaments = ET.SubElement(notations, 'ornaments')
    tremolo = ET.SubElement(ornaments, 'tremolo', type="single")
    tremolo.text = '1'

def add_triplet_notation(note_el, position=None, note_info=None):
    """Add triplet time modification and optional tuplet notation."""
    time_mod = ET.SubElement(note_el, 'time-modification')
    actual_notes = ET.SubElement(time_mod, 'actual-notes')
    normal_notes = ET.SubElement(time_mod, 'normal-notes')
    
    # Handle sixteenth note triplets differently
    if note_info and note_info['base_duration'] == 'S3':
        actual_notes.text = '6'
        normal_notes.text = '4'
    else:
        actual_notes.text = '3'
        normal_notes.text = '2'
    
    if position:
        notations = note_el.find('notations')
        if notations is None:
            notations = ET.SubElement(note_el, 'notations')
        
        if position == 'start':
            ET.SubElement(notations, 'tuplet', type="start", bracket="no")
        elif position == 'stop':
            ET.SubElement(notations, 'tuplet', type="stop")

def create_unpitched_elements(note_el):
    """Create unpitched note elements."""
    unpitched = ET.SubElement(note_el, 'unpitched')
    display_step = ET.SubElement(unpitched, 'display-step')
    display_step.text = 'C'
    display_oct = ET.SubElement(unpitched, 'display-octave')
    display_oct.text = '5'

def add_sticking(note_el, hand):
    """Add sticking notation as lyrics."""
    lyric = ET.SubElement(note_el, 'lyric', number="1")
    syllabic = ET.SubElement(lyric, 'syllabic')
    syllabic.text = 'single'
    text = ET.SubElement(lyric, 'text')
    text.text = hand

def apply_beaming(notes_info):
    """Apply beaming to groups of notes."""
    if not notes_info:
        return
        
    # First, identify triplet groups
    triplet_groups = []
    current_triplet_group = []
    current_triplet_type = None
    
    for i, (note_el, info) in enumerate(notes_info):
        if info.get('rest'):
            if current_triplet_group:
                triplet_groups.append((current_triplet_type, current_triplet_group))
                current_triplet_group = []
            continue
            
        if info['is_triplet']:
            if not current_triplet_group or info['triplet_type'] == current_triplet_type:
                current_triplet_type = info['triplet_type']
                current_triplet_group.append((note_el, info))
                
                # Check if we've completed a triplet group
                if current_triplet_type == 'Q3' and len(current_triplet_group) == 3:
                    triplet_groups.append((current_triplet_type, current_triplet_group))
                    current_triplet_group = []
                elif current_triplet_type == 'E3' and len(current_triplet_group) == 3:
                    triplet_groups.append((current_triplet_type, current_triplet_group))
                    current_triplet_group = []
                elif current_triplet_type == 'S3' and len(current_triplet_group) == 6:
                    triplet_groups.append((current_triplet_type, current_triplet_group))
                    current_triplet_group = []
            else:
                if current_triplet_group:
                    triplet_groups.append((current_triplet_type, current_triplet_group))
                current_triplet_type = info['triplet_type']
                current_triplet_group = [(note_el, info)]
        else:
            if current_triplet_group:
                triplet_groups.append((current_triplet_type, current_triplet_group))
                current_triplet_group = []
    
    if current_triplet_group:
        triplet_groups.append((current_triplet_type, current_triplet_group))
    
    # Process each triplet group
    for triplet_type, group in triplet_groups:
        # Apply beaming for all triplet groups
        if len(group) > 1:
            apply_beam_group(group)
            
        # Add triplet notations
        for i, (note_el, info) in enumerate(group):
            # Add time modification and tuplet markers
            if i == 0:
                add_triplet_notation(note_el, 'start')
            elif i == len(group) - 1:
                add_triplet_notation(note_el, 'stop')
            else:
                add_triplet_notation(note_el)
    
    # Process regular beaming for non-triplet notes
    current_weight = Fraction(0)
    current_group = []
    
    for i, (note_el, info) in enumerate(notes_info):
        if info.get('rest') or info['weight'] >= Fraction(1, 4) or info['is_triplet']:
            if current_group:
                apply_beam_group(current_group)
                current_group = []
            current_weight = Fraction(0)
            continue
            
        current_group.append((note_el, info))
        current_weight += info['weight']
        
        if current_weight >= Fraction(1, 4) or i == len(notes_info) - 1:
            if len(current_group) > 1:
                apply_beam_group(current_group)
            current_group = []
            current_weight = Fraction(0)

def apply_beam_group(group):
    """Apply beaming to a specific group of notes."""
    if len(group) <= 1:
        return
        
    # Remove any existing beams
    for el, _ in group:
        for beam in el.findall('beam'):
            el.remove(beam)
    
    # Apply primary beam
    for i, (el, info) in enumerate(group):
        beam = ET.SubElement(el, 'beam', number="1")
        if i == 0:
            beam.text = 'begin'
        elif i == len(group) - 1:
            beam.text = 'end'
        else:
            beam.text = 'continue'
        
        # Add secondary beam for 16th notes and smaller
        if info['weight'] <= Fraction(1, 16):
            beam2 = ET.SubElement(el, 'beam', number="2")
            beam2.text = beam.text
            
        # Add tertiary beam for 32nd notes
        if info['weight'] <= Fraction(1, 32):
            beam3 = ET.SubElement(el, 'beam', number="3")
            beam3.text = beam.text

def create_note_element(measure, info):
    """Create a note element with all its attributes."""
    note_el = ET.SubElement(measure, 'note')
    
    if info['rest']:
        ET.SubElement(note_el, 'rest')
    else:
        create_unpitched_elements(note_el)
    
    duration = ET.SubElement(note_el, 'duration')
    duration.text = str(info['duration_divisions'])
    
    voice = ET.SubElement(note_el, 'voice')
    voice.text = '1'
    
    type_el = ET.SubElement(note_el, 'type')
    type_el.text = info['type']
    
    if not info['rest']:
        stem = ET.SubElement(note_el, 'stem')
        stem.text = 'up'
        
        if info['sticking']:
            add_sticking(note_el, info['sticking'])
    
    # Add embellishments
    for emb in info['embellishments']:
        if emb == 'X':
            add_accent(note_el)
        elif emb == 'G':
            add_ghost_note(note_el)
        elif emb == 'D':
            add_diddle(note_el)
        elif emb == 'F':
            add_flam(measure, note_el)
    
    return note_el

def create_musicxml(tokens, time_signature=(4, 4)):
    """Create complete MusicXML document from tokens."""
    # Split into measures
    measures = []
    current_measure = []
    for token in tokens:
        if token == '|':
            if current_measure:
                measures.append(current_measure)
            current_measure = []
        else:
            current_measure.append(token)
    if current_measure:
        measures.append(current_measure)
    
    # Create MusicXML structure
    score_partwise = ET.Element('score-partwise', version="3.1")
    part_list = ET.SubElement(score_partwise, 'part-list')
    score_part = ET.SubElement(part_list, 'score-part', id="P1")
    part_name = ET.SubElement(score_part, 'part-name')
    part_name.text = "Percussion"
    
    part = ET.SubElement(score_partwise, 'part', id="P1")
    
    # Process each measure
    for measure_num, measure_tokens in enumerate(measures, 1):
        normalized_tokens = normalize_measure(measure_tokens)
        measure = ET.SubElement(part, 'measure', number=str(measure_num))
        
        # Add attributes for first measure
        if measure_num == 1:
            attributes = ET.SubElement(measure, 'attributes')
            divisions = ET.SubElement(attributes, 'divisions')
            divisions.text = "32"
            
            time = ET.SubElement(attributes, 'time')
            beats = ET.SubElement(time, 'beats')
            beats.text = str(time_signature[0])
            beat_type = ET.SubElement(time, 'beat-type')
            beat_type.text = str(time_signature[1])
            
            clef = ET.SubElement(attributes, 'clef')
            sign = ET.SubElement(clef, 'sign')
            sign.text = 'percussion'
            line = ET.SubElement(clef, 'line')
            line.text = '2'
        
        # Process notes in measure
        notes_info = []
        for token in normalized_tokens:
            info = parse_note(token)
            note_el = create_note_element(measure, info)
            notes_info.append((note_el, info))
        
        # Apply beaming
        apply_beaming(notes_info)
    
    # Convert to string with proper formatting
    rough_string = ET.tostring(score_partwise, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ")

def main():
    """
    Main method to input Viraaj's music notation and output MusicXML.
    
    Usage:
        Run the script and enter the notation when prompted.
        The MusicXML will be saved to 'output.musicxml'.
    
    Example Input:
        Q Q3 E E E D | H R | Q Q Q Q
    """
    print("Viraaj's Music Notation to MusicXML Converter")
    print("------------------------------------------------")
    print("Enter your notation using the following symbols:")
    print("Notes: W, H, Q, E, S, T (Whole, Half, Quarter, Eighth, Sixteenth, Thirty-second)")
    print("Triplets: Append '3' to the note (e.g., Q3 for quarter triplet)")
    print("Rests: Append 'R' to the note (e.g., QR for quarter rest)")
    print("Sticking: Prefix 'R' or 'L' (e.g., RQ for right hand quarter note)")
    print("Embellishments: X (accent), G (ghost note), D (diddle), F (flam)")
    print("Measures are separated by '|'\n")
    
    notation = input("Enter Viraaj's music notation: ").strip()
    
    # Split tokens by spaces while keeping '|' as separate tokens
    tokens = []
    for part in notation.split('|'):
        part = part.strip()
        if part:
            tokens.extend(part.split())
        tokens.append('|')
    if tokens and tokens[-1] == '|':
        tokens.pop()  # Remove the last '|' if present
    
    try:
        musicxml = create_musicxml(tokens)
        with open("output.musicxml", "w", encoding='utf-8') as f:
            f.write(musicxml)
        print("\nMusicXML has been successfully written to 'output.musicxml'.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()
