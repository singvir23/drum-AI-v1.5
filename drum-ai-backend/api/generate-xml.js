const OpenAI = require("openai");
const { spawn } = require("child_process");
require('dotenv').config();

const openAIKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: openAIKey
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  try {
    // Step 1: Call GPT to get Viraaj's Music Notation
    const completion = await openai.chat.completions.create({
      model: "ft:gpt-4o-2024-08-06:personal:drum-ai:AgcRzsC7",
      messages: [
        { role: "system", content: "You are a helpful assistant who generates Viraaj's Music Notation (a custom drum notation)." },
        { role: "user", content: prompt }
      ],
    });

    const viraajsNotation = completion.choices[0].message.content.trim();

    // Step 2: Run the Python compiler
    const pythonProcess = spawn('python3', ['compiler.py']);

    let compilerOutput = '';
    let compilerError = '';

    // Capture stdout
    pythonProcess.stdout.on('data', (data) => {
      compilerOutput += data.toString();
    });

    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      compilerError += data.toString();
    });

    // Handle process close
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        compilerOutput = compilerOutput.trim();

        if (!compilerOutput.startsWith('<?xml')) {
          return res.status(500).json({
            error: "Invalid MusicXML output. Missing '<?xml' declaration.",
            xml: compilerOutput,
            notation: viraajsNotation
          });
        }

        res.json({
          xml: compilerOutput,
          notation: viraajsNotation
        });
      } else {
        res.status(500).json({
          error: "Error running compiler",
          compilerError: compilerError.trim(),
          notation: viraajsNotation
        });
      }
    });

    // Send the notation to the compiler
    pythonProcess.stdin.write(viraajsNotation);
    pythonProcess.stdin.end();

  } catch (error) {
    res.status(500).json({
      error: "Error generating or compiling MusicXML",
      details: error.message
    });
  }
}