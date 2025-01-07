# lambda_function.py
import json
from music_xml_converter import create_musicxml

def lambda_handler(event, context):
    try:
        # Parse input
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
            notation_input = body.get('notation', '').strip()
        else:
            notation_input = event.get('notation', '').strip()
        
        if not notation_input:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'No input provided for Music Notation'
                })
            }
        
        # Convert to MusicXML
        tokens = notation_input.split()
        xml_output = create_musicxml(tokens)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'xml': xml_output
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': str(e)
            })
        }