// fewShotExamples.js
// Curated few-shot examples based on XML training data

const CURATED_EXAMPLES = [
  // Single Strokes
  {
    category: 'singleStrokes',
    prompt: 'Generate me a measure of 16th note single strokes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' }
          ]
        }
      ]
    }
  },
  {
    category: 'singleStrokes',
    prompt: 'Create a measure of quarter note single strokes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'Q' },
            { sticking: 'L', duration: 'Q' },
            { sticking: 'R', duration: 'Q' },
            { sticking: 'L', duration: 'Q' }
          ]
        }
      ]
    }
  },
  {
    category: 'singleStrokes',
    prompt: 'Make me a measure of 8th note single strokes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'E' }
          ]
        }
      ]
    }
  },

  // Paradiddles
  {
    category: 'paradiddles',
    prompt: 'Generate a full measure of paradiddles (RLRR LRLL)',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'L', duration: 'S' }
          ]
        }
      ]
    }
  },

  // Accents
  {
    category: 'accents',
    prompt: 'Write me a measure of 16th note single strokes with an accent every 4 notes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'S', embellishments: ['X'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['X'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['X'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['X'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' }
          ]
        }
      ]
    }
  },
  {
    category: 'accents',
    prompt: 'Create 16th notes with accents on beats 1 and 3',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'S', embellishments: ['X'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['X'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' }
          ]
        }
      ]
    }
  },

  // Flams
  {
    category: 'flams',
    prompt: 'Generate a measure of 16th note single strokes with a flam every 4 notes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'S', embellishments: ['F'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['F'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['F'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S', embellishments: ['F'] },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' }
          ]
        }
      ]
    }
  },

  // Triplets
  {
    category: 'triplets',
    prompt: 'Create a full measure of eighth note triplets',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'E3' },
            { sticking: 'L', duration: 'E3' },
            { sticking: 'R', duration: 'E3' },
            { sticking: 'L', duration: 'E3' },
            { sticking: 'R', duration: 'E3' },
            { sticking: 'L', duration: 'E3' },
            { sticking: 'R', duration: 'E3' },
            { sticking: 'L', duration: 'E3' },
            { sticking: 'R', duration: 'E3' },
            { sticking: 'L', duration: 'E3' },
            { sticking: 'R', duration: 'E3' },
            { sticking: 'L', duration: 'E3' }
          ]
        }
      ]
    }
  },
  {
    category: 'triplets',
    prompt: 'Generate a measure of sixteenth note triplets',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' },
            { sticking: 'R', duration: 'S3' },
            { sticking: 'L', duration: 'S3' }
          ]
        }
      ]
    }
  },

  // Fivelets
  {
    category: 'fivelets',
    prompt: 'Create a measure of eighth note fivelets',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' },
            { sticking: 'R', duration: 'E5' },
            { sticking: 'L', duration: 'E5' }
          ]
        }
      ]
    }
  },

  // Sevenlets
  {
    category: 'sevenlets',
    prompt: 'Generate a measure of eighth note sevenlets',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' },
            { sticking: 'R', duration: 'E7' },
            { sticking: 'L', duration: 'E7' }
          ]
        }
      ]
    }
  },

  // Diddles
  {
    category: 'diddles',
    prompt: 'Make a measure of 8th notes with a diddle every 4 notes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'E', embellishments: ['D'] },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'E', embellishments: ['D'] },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'E' }
          ]
        }
      ]
    }
  },

  // Mixed Durations
  {
    category: 'mixed',
    prompt: 'Create a measure with mixed note values: quarter, eighth, and sixteenth notes',
    json: {
      timeSignature: [4, 4],
      measures: [
        {
          notes: [
            { sticking: 'R', duration: 'Q' },
            { sticking: 'L', duration: 'E' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'S' },
            { sticking: 'L', duration: 'S' },
            { sticking: 'R', duration: 'E' },
            { sticking: 'L', duration: 'Q' }
          ]
        }
      ]
    }
  }
];

// Keywords for category matching
const CATEGORY_KEYWORDS = {
  singleStrokes: ['single stroke', 'singles', 'alternating', 'rlrl', 'lrlr'],
  paradiddles: ['paradiddle', 'rlrr', 'lrll', 'para'],
  triplets: ['triplet', 'trip', 'three'],
  fivelets: ['fivelet', 'five', 'quintuplet', '5-let', '5let'],
  sevenlets: ['sevenlet', 'seven', 'septuplet', '7-let', '7let'],
  flams: ['flam', 'grace note', 'grace'],
  diddles: ['diddle', 'double', 'buzz', 'roll'],
  accents: ['accent', 'emphasis', 'loud', 'strong'],
  mixed: ['mix', 'combination', 'combine', 'various', 'different'],
  ghost: ['ghost', 'quiet', 'soft', 'parenthes']
};

/**
 * Select relevant few-shot examples based on user prompt
 * @param {string} userPrompt - The user's request
 * @param {number} numExamples - Number of examples to return (default 3)
 * @returns {Array} Array of selected examples
 */
function selectFewShotExamples(userPrompt, numExamples = 3) {
  const promptLower = userPrompt.toLowerCase();
  const scoredExamples = [];

  // Score each example based on relevance
  for (const example of CURATED_EXAMPLES) {
    let score = 0;

    // Check category keywords
    const categoryKeywords = CATEGORY_KEYWORDS[example.category] || [];
    for (const keyword of categoryKeywords) {
      if (promptLower.includes(keyword)) {
        score += 10;
      }
    }

    // Check for duration keywords
    if (promptLower.includes('16th') || promptLower.includes('sixteenth')) {
      if (example.json.measures[0].notes.some(n => n.duration === 'S' || n.duration === 'S3' || n.duration === 'S5' || n.duration === 'S7')) {
        score += 5;
      }
    }
    if (promptLower.includes('8th') || promptLower.includes('eighth')) {
      if (example.json.measures[0].notes.some(n => n.duration === 'E' || n.duration === 'E3' || n.duration === 'E5' || n.duration === 'E7')) {
        score += 5;
      }
    }
    if (promptLower.includes('quarter')) {
      if (example.json.measures[0].notes.some(n => n.duration === 'Q' || n.duration === 'Q3' || n.duration === 'Q5' || n.duration === 'Q7')) {
        score += 5;
      }
    }

    scoredExamples.push({ ...example, score });
  }

  // Sort by score and return top N
  scoredExamples.sort((a, b) => b.score - a.score);

  // If no matches, return diverse examples
  if (scoredExamples.every(ex => ex.score === 0)) {
    return [
      CURATED_EXAMPLES[0],  // Single strokes 16ths
      CURATED_EXAMPLES[3],  // Paradiddles
      CURATED_EXAMPLES[7]   // Triplets
    ].slice(0, numExamples);
  }

  return scoredExamples.slice(0, numExamples);
}

/**
 * Format examples for Claude prompt
 * @param {Array} examples - Array of example objects
 * @returns {string} Formatted examples string
 */
function formatExamplesForPrompt(examples) {
  if (!examples || examples.length === 0) return '';

  let formatted = '<examples>\n';
  for (const ex of examples) {
    formatted += '<example>\n';
    formatted += `<user_prompt>${ex.prompt}</user_prompt>\n`;
    formatted += `<json_output>${JSON.stringify(ex.json, null, 2)}</json_output>\n`;
    formatted += '</example>\n';
  }
  formatted += '</examples>\n\n';

  return formatted;
}

module.exports = {
  selectFewShotExamples,
  formatExamplesForPrompt,
  CURATED_EXAMPLES
};
