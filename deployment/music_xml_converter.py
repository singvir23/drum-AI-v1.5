# music_xml_converter.py
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Duration mappings
DURATION_MAP = {
    'W': 16,
    'H': 8, 
    'Q': 4,
    'E': 2,
    'S': 1
}

def is_rest(token):
    return token.startswith('R')

def xml_note_type(duration_char):
    mapping = {
        'W': 'whole',
        'H': 'half', 
        'Q': 'quarter',
        'E': 'eighth',
        'S': '16th'
    }
    return mapping.get(duration_char, 'quarter')

def parse_note(token):
    note_info = {
        'rest': False,
        'sticking': None,
        'embellishments': []
    }

    if is_rest(token):
        if len(token) < 2:
            raise ValueError(f"Invalid rest token: '{token}'")
        duration_char = token[1]
        note_info['rest'] = True
        note_info['duration_divisions'] = DURATION_MAP.get(duration_char, 4)
        note_info['type'] = xml_note_type(duration_char)
        return note_info

    if len(token) < 2:
        raise ValueError(f"Invalid note token: '{token}'")

    duration_char = token[0]
    note_info['duration_divisions'] = DURATION_MAP.get(duration_char, 4)
    note_info['type'] = xml_note_type(duration_char)
    note_info['sticking'] = token[1]
    if len(token) > 2:
        note_info['embellishments'] = list(token[2:])
    return note_info

def split_into_measures(tokens):
    measures = []
    current_measure = []
    
    for token in tokens:
        if token == '|':
            if current_measure:
                measures.append(current_measure)
            current_measure = []
        elif token.strip():
            current_measure.append(token)
    
    if current_measure:
        measures.append(current_measure)
    
    return measures

def normalize_measure_duration(measure_tokens, target_divisions=16):
    current_divisions = 0
    normalized_tokens = []
    
    for token in measure_tokens:
        note_info = parse_note(token)
        if current_divisions + note_info['duration_divisions'] > target_divisions:
            break
        normalized_tokens.append(token)
        current_divisions += note_info['duration_divisions']
    
    if current_divisions < target_divisions:
        remaining_divisions = target_divisions - current_divisions
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
    unpitched = ET.SubElement(note_el, 'unpitched')
    display_step = ET.SubElement(unpitched, 'display-step')
    display_step.text = 'C'
    display_oct = ET.SubElement(unpitched, 'display-octave')
    display_oct.text = '5'

def add_lyrics(note_el, text):
    lyric = ET.SubElement(note_el, 'lyric', number="1")
    syl = ET.SubElement(lyric, 'syllabic')
    syl.text = 'single'
    txt = ET.SubElement(lyric, 'text')
    txt.text = text

def add_tremolo(note_el):
    notations = ET.SubElement(note_el, 'notations')
    ornaments = ET.SubElement(notations, 'ornaments')
    tremolo = ET.SubElement(ornaments, 'tremolo', type="single")
    tremolo.text = '1'

def add_grace_note_before(measure):
    note_el = ET.SubElement(measure, 'note')
    ET.SubElement(note_el, 'grace', slash="yes")
    create_unpitched_elements(note_el)
    dur = ET.SubElement(note_el, 'duration')
    dur.text = '1'
    voice = ET.SubElement(note_el, 'voice')
    voice.text = '1'
    type_el = ET.SubElement(note_el, 'type')
    type_el.text = 'eighth'
    stem = ET.SubElement(note_el, 'stem')
    stem.text = 'up'

def create_note_element(measure, info):
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
    if len(beam_group) == 1:
        el, inf = beam_group[0]
        for beam_el in el.findall('beam'):
            el.remove(beam_el)
        return

    for i, (el, inf) in enumerate(beam_group):
        beam_el = el.find('beam[@number="1"]')
        if beam_el is None:
            beam_el = ET.SubElement(el, 'beam', number="1")
        if i == 0:
            beam_el.text = 'begin'
        elif i == len(beam_group) - 1:
            beam_el.text = 'end'
        else:
            beam_el.text = 'continue'

def apply_measure_beaming(notes_info, time_signature=(4,4)):
    if not notes_info:
        return

    beat_duration = 4
    beats = []
    current_beat = []
    current_time = 0

    for note_el, info in notes_info:
        if current_time % beat_duration == 0 and current_beat:
            beats.append(current_beat)
            current_beat = []
        current_beat.append((note_el, info))
        current_time += info['duration_divisions']

    if current_beat:
        beats.append(current_beat)

    for beat in beats:
        apply_beam(beat)

def create_musicxml(tokens, time_signature=(4,4), key=0):
    measures = split_into_measures(tokens)
    
    score_partwise = ET.Element('score-partwise', version="3.1")
    part_list = ET.SubElement(score_partwise, 'part-list')
    score_part = ET.SubElement(part_list, 'score-part', id="P1")
    part_name = ET.SubElement(score_part, 'part-name')
    part_name.text = "Percussion"

    part = ET.SubElement(score_partwise, 'part', id="P1")
    
    for measure_num, measure_tokens in enumerate(measures, 1):
        normalized_tokens = normalize_measure_duration(measure_tokens, 16)
        
        measure = ET.SubElement(part, 'measure', number=str(measure_num))
        
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
                add_grace_note_before(measure)
            note_el = create_note_element(measure, info)
            notes_info.append((note_el, info))

        apply_measure_beaming(notes_info, time_signature)
    
    rough_string = ET.tostring(score_partwise, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    pretty_xml = reparsed.toprettyxml(indent="  ")
    return pretty_xml