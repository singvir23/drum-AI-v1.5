# lambda_function.py
import json
from music_xml_converter import create_musicxml, create_musicxml_from_json

def lambda_handler(event, context):
    try:
        # Parse input
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event

        # Check if JSON notation or string notation
        if 'jsonNotation' in body:
            # New JSON-based format from Claude
            notation_json = body['jsonNotation']
            xml_output = create_musicxml_from_json(notation_json)
        elif 'notation' in body:
            # Legacy string-based format (backward compatibility)
            notation_input = body['notation'].strip()
            if not notation_input:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'No input provided for Music Notation'
                    })
                }
            notation_input = notation_input.replace('|', ' | ')
            tokens = notation_input.split()
            xml_output = create_musicxml(tokens)
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Missing notation or jsonNotation in request body'
                })
            }

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