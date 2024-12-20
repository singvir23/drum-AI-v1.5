const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { spawn } = require("child_process");
require('dotenv').config();

const openAIKey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: openAIKey
});

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post("/generate-xml", async (req, res) => {
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

    console.log("Viraaj's Music Notation Output:");
    console.log(viraajsNotation);

    // Step 2: Run the Viraaj's Music Notation through the Python compiler to get MusicXML
    const pythonProcess = spawn('python3', ["/Users/viraajsingh/Desktop/Viraaj's_Projects/drum-AI/compiler.py"]);

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
        console.log("MusicXML Output:");
        console.log(compilerOutput);

        // Check if the output starts with '<?xml'
        if (!compilerOutput.startsWith('<?xml')) {
          console.error("Invalid MusicXML output. Missing '<?xml' declaration.");
          return res.status(500).json({ 
            error: "Invalid MusicXML output from compiler.", 
            xml: compilerOutput, 
            notation: viraajsNotation 
          });
        }

        // Successfully got MusicXML from compiler
        res.json({ 
          xml: compilerOutput, 
          notation: viraajsNotation 
        });
      } else {
        console.error("Compiler error: ", compilerError);
        res.status(500).json({ 
          error: "Error running compiler", 
          compilerError: compilerError.trim(),
          notation: viraajsNotation 
        });
      }
    });

    // Send the Viraaj's Music Notation to the compiler via stdin
    pythonProcess.stdin.write(viraajsNotation);
    pythonProcess.stdin.end();

  } catch (error) {
    console.error("Error generating or compiling MusicXML: ", error);
    res.status(500).json({ 
      error: "Error generating or compiling MusicXML",
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
