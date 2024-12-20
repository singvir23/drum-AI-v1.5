#!/usr/bin/env python3

import sys
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Duration mappings for different note types (in divisions)
# W = whole note (16 divisions)
# H = half note (8 divisions)
# Q = quarter note (4 divisions)
# E = eighth note (2 divisions)
# S = sixteenth note (1 division)
DURATION_MAP = {
    'W': 16,
    'H': 8,
    'Q': 4,
    'E': 2,
    'S': 1
}

def is_rest(token):
    """Check if a token represents a rest (starts with 'R')."""
    return token.startswith('R')

def xml_note_type(duration_char):
    """Convert duration character to MusicXML note type."""
    mapping = {
        'W': 'whole',
        'H': 'half',
        'Q': 'quarter',
        'E': 'eighth',
        'S': '16th'
    }
    return mapping.get(duration_char, 'quarter')

def parse_note(token):
    """
    Parse a note token into its components.
    Format: [Duration][Sticking][Embellishments]
    Example: "SRF" = Sixteenth note, Right hand, Flam
    """
    note_info = {
        'rest': False,
        'sticking': None,
        'embellishments': []
    }

    if is_rest(token):
        # token like 'RW', 'RH', etc.
        if len(token) < 2:
            raise ValueError(f"Invalid rest token: '{token}'")
        duration_char = token[1]
        note_info['rest'] = True
        note_info['duration_divisions'] = DURATION_MAP.get(duration_char, 4)  # default quarter if unknown
        note_info['type'] = xml_note_type(duration_char)
        return note_info

    if len(token) < 2:
        raise ValueError(f"Invalid note token: '{token}'")

    duration_char = token[0]
    note_info['duration_divisions'] = DURATION_MAP.get(duration_char, 4)
    note_info['type'] = xml_note_type(duration_char)
    # Sticking is next char
    note_info['sticking'] = token[1]
    # Embellishments are any remaining chars
    if len(token) > 2:
        note_info['embellishments'] = list(token[2:])
    return note_info

def split_into_measures(tokens):
    """
    Split tokens into measures based on '|' separator.
    Returns a list of measures, where each measure is a list of tokens.
    """
    measures = []
    current_measure = []
    
    for token in tokens:
        if token == '|':
            if current_measure:  # Don't add empty measures
                measures.append(current_measure)
            current_measure = []
        elif token.strip():  # Skip empty tokens
            current_measure.append(token)
    
    # Add the last measure if it exists
    if current_measure:
        measures.append(current_measure)
    
    return measures

def normalize_measure_duration(measure_tokens, target_divisions=16):
    """
    Normalize measure duration to match the target (16 divisions for 4/4 time).
    If under-filled, add rests. If over-filled, truncate.
    Returns the normalized tokens.
    """
    current_divisions = 0
    normalized_tokens = []
    
    # Calculate current measure duration and keep tokens that fit
    for token in measure_tokens:
        note_info = parse_note(token)
        if current_divisions + note_info['duration_divisions'] > target_divisions:
            break  # Stop adding notes that exceed the measure
        normalized_tokens.append(token)
        current_divisions += note_info['duration_divisions']
    
    # If under-filled, add rests
    if current_divisions < target_divisions:
        remaining_divisions = target_divisions - current_divisions
        
        # Add appropriate rests to fill the measure
        while remaining_divisions > 0:
            if remaining_divisions >= 16:
                normalized_tokens.append('RW')
                remaining_divisions -= 16
            elif remaining_divisions >= 8:
                normalized_tokens.append('RH')
                remaining_divisions -= 8
            elif remaining_divisions >= 4:
                normalized_tokens.append('RQ')
                remaining_divisions -= 4
            elif remaining_divisions >= 2:
                normalized_tokens.append('RE')
                remaining_divisions -= 2
            else:
                normalized_tokens.append('RS')
                remaining_divisions -= 1
    
    return normalized_tokens

def create_unpitched_elements(note_el):
    """Add unpitched elements to a note (for percussion notation)."""
    unpitched = ET.SubElement(note_el, 'unpitched')
    display_step = ET.SubElement(unpitched, 'display-step')
    display_step.text = 'C'
    display_oct = ET.SubElement(unpitched, 'display-octave')
    display_oct.text = '5'

def add_lyrics(note_el, text):
    """Add lyrics element (used for sticking notation)."""
    lyric = ET.SubElement(note_el, 'lyric', number="1")
    syl = ET.SubElement(lyric, 'syllabic')
    syl.text = 'single'
    txt = ET.SubElement(lyric, 'text')
    txt.text = text

def add_tremolo(note_el):
    """Add tremolo notation to a note."""
    notations = ET.SubElement(note_el, 'notations')
    ornaments = ET.SubElement(notations, 'ornaments')
    tremolo = ET.SubElement(ornaments, 'tremolo', type="single")
    tremolo.text = '1'

def add_grace_note_before(measure):
    """
    Add a grace note as a flam before the main note.
    Grace note does not count towards measure duration.
    """
    note_el = ET.SubElement(measure, 'note')
    grace = ET.SubElement(note_el, 'grace', slash="yes")
    create_unpitched_elements(note_el)
    dur = ET.SubElement(note_el, 'duration')
    dur.text = '1'  # minimal placeholder
    voice = ET.SubElement(note_el, 'voice')
    voice.text = '1'
    type_el = ET.SubElement(note_el, 'type')
    type_el.text = 'eighth'
    stem = ET.SubElement(note_el, 'stem')
    stem.text = 'up'

def create_note_element(measure, info):
    """Create a MusicXML note element based on note information."""
    note_el = ET.SubElement(measure, 'note')
    if info['rest']:
        ET.SubElement(note_el, 'rest')
        dur = ET.SubElement(note_el, 'duration')
        dur.text = str(info['duration_divisions'])
        voice = ET.SubElement(note_el, 'voice')
        voice.text = '1'
        type_el = ET.SubElement(note_el, 'type')
        type_el.text = info['type']
    else:
        create_unpitched_elements(note_el)
        dur = ET.SubElement(note_el, 'duration')
        dur.text = str(info['duration_divisions'])
        voice = ET.SubElement(note_el, 'voice')
        voice.text = '1'
        type_el = ET.SubElement(note_el, 'type')
        type_el.text = info['type']
        stem = ET.SubElement(note_el, 'stem')
        stem.text = 'up'
        add_lyrics(note_el, info['sticking'] if info['sticking'] else '')
        if 'D' in info['embellishments']:
            add_tremolo(note_el)
    return note_el

def apply_beam(beam_group):
    """Apply beaming to a group of notes."""
    # If only one note, no beam needed
    if len(beam_group) == 1:
        el, inf = beam_group[0]
        for beam_el in el.findall('beam'):
            el.remove(beam_el)
        return

    # Multiple notes: first=begin, last=end, middle=continue
    for i, (el, inf) in enumerate(beam_group):
        beam_el = el.find('beam[@number="1"]')
        if beam_el is None:
            beam_el = ET.SubElement(el, 'beam', number="1")
        if i == 0:
            beam_el.text = 'begin'
        elif i == len(beam_group)-1:
            beam_el.text = 'end'
        else:
            beam_el.text = 'continue'

def apply_measure_beaming(notes_info, time_signature=(4,4)):
    """Apply beaming rules to notes within a measure."""
    if not notes_info:
        return

    # Group notes by beats (assuming 4/4 time)
    beats = []
    current_beat = []
    current_time = 0
    beat_duration = 4  # quarter note = 4 divisions as per our definition

    for note_el, info in notes_info:
        if current_time % beat_duration == 0 and current_beat:
            beats.append(current_beat)
            current_beat = []
        current_beat.append((note_el, info))
        current_time += info['duration_divisions']

    if current_beat:
        beats.append(current_beat)

    # Apply beaming within each beat
    for beat in beats:
        apply_beam(beat)

def create_musicxml(tokens, time_signature=(4,4), key=0):
    """
    Create MusicXML from drum notation tokens.
    Handles measure divisions marked by '|' and normalizes measure durations.
    """
    measures = split_into_measures(tokens)
    
    score_partwise = ET.Element('score-partwise', version="3.1")
    part_list = ET.SubElement(score_partwise, 'part-list')
    score_part = ET.SubElement(part_list, 'score-part', id="P1")
    part_name = ET.SubElement(score_part, 'part-name')
    part_name.text = "Percussion"

    part = ET.SubElement(score_partwise, 'part', id="P1")
    
    for measure_num, measure_tokens in enumerate(measures, 1):
        normalized_tokens = normalize_measure_duration(measure_tokens)
        
        measure = ET.SubElement(part, 'measure', number=str(measure_num))
        
        # Add attributes to the first measure
        if measure_num == 1:
            attributes = ET.SubElement(measure, 'attributes')
            div_el = ET.SubElement(attributes, 'divisions')
            div_el.text = "4"
            k = ET.SubElement(attributes, 'key')
            fif = ET.SubElement(k, 'fifths')
            fif.text = str(key)
            t = ET.SubElement(attributes, 'time')
            beats_el = ET.SubElement(t, 'beats')
            beats_el.text = str(time_signature[0])
            beat_type_el = ET.SubElement(t, 'beat-type')
            beat_type_el.text = str(time_signature[1])
            clef = ET.SubElement(attributes, 'clef')
            sign = ET.SubElement(clef, 'sign')
            sign.text = 'percussion'
            line = ET.SubElement(clef, 'line')
            line.text = '2'

        notes_info = []
        for token in normalized_tokens:
            info = parse_note(token)
            if 'F' in info.get('embellishments', []):
                # Add a grace note (flam) before main note
                add_grace_note_before(measure)
            note_el = create_note_element(measure, info)
            notes_info.append((note_el, info))

        # Apply beaming
        apply_measure_beaming(notes_info, time_signature)
    
    # Convert the ElementTree to a pretty-printed XML string with declaration
    rough_string = ET.tostring(score_partwise, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    pretty_xml = reparsed.toprettyxml(indent="  ")
    return pretty_xml

if __name__ == "__main__":
    try:
        # Read Viraaj's Music Notation from stdin
        # Example: "SR SL RE | SR SL SR SL | ER EL RQ"
        notation_input = sys.stdin.read().strip()
        if not notation_input:
            raise ValueError("No input provided for Viraaj's Music Notation.")

        tokens = notation_input.split()

        xml_output = create_musicxml(tokens)
        print(xml_output)
    except Exception as e:
        # Output the error message to stderr
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)
