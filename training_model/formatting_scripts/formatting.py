import json

def convert_format(input_data):
    try:
        # Parse the input JSON
        data = json.loads(input_data)
        
        # Create the new format structure
        new_format = {
            "messages": [
                {
                    "role": "system",
                    "content": "Drum-Lick-Generator is an AI that can produce Viraaj's Music Notation according to your input"
                },
                {
                    "role": "user",
                    "content": data["prompt"]
                },
                {
                    "role": "assistant",
                    "content": data["completion"]
                }
            ]
        }
        
        # Convert to single-line JSON string
        return json.dumps(new_format, separators=(',', ':'))
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

input_file = "/Users/viraajsingh/Desktop/Viraaj's_Projects/drum-AI/training_model/newData.jsonl"
output_file = "/Users/viraajsingh/Desktop/Viraaj's_Projects/drum-AI/training_model/converted_data.jsonl"

# Process the file
try:
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line_number, line in enumerate(infile, 1):
            if line.strip():  # Skip empty lines
                converted = convert_format(line.strip())
                if converted:
                    outfile.write(converted + '\n')
                else:
                    print(f"Skipping line {line_number} due to conversion error")
    print(f"Conversion complete! Output saved to {output_file}")
except FileNotFoundError:
    print(f"Error: Could not find the input file at {input_file}")
except PermissionError:
    print("Error: Permission denied when trying to read/write files")
except Exception as e:
    print(f"An unexpected error occurred: {e}")