I’ve always wanted to build something that blends my passion for music and technology. After ideating, I thought this one was the most applicable. When I started drumming, I was tasked with learning the “40 rudiments.” I like to describe these as the “words” of the drumming “language.” Most drumming phrases consist of these rudiments stitched together in different ways. When I was learning these rudiments, my teacher pointed me to online resources. However, it got much harder to locate online resources as we began adding variations, or "embellishments," to these rudiments. This resulted in my teacher writing down the patterns on sheets that I would lose the next day 😬😅.

This brings me to the creation of the product. After experimenting with a variety of models, I concluded that fine-tuning an LLM would be the most effective strategy. It could easily process a user's textual input and produce an output I could fine-tune. I used musicXML and the Open Sheet Music Display API to write and display the sheet music. My LLM of choice had a foundation of musicXML, and I fine-tuned it on more data points to refine its skills. At the end of the training, the model could produce a measure of music reliably; however, it was EXTREMELY slow and expensive. The outputs would be 200 lines of code for only 8-16 notes. I knew that this wouldn’t be scalable.

After giving it more thought and consulting some people with more experience than myself, I came to the approach the model is currently using. I developed my own custom drum notation, which maps a sequence of characters to a given note. That custom drum notation is what the LLM is fine-tuned on. From there, the sequence of characters is tokenized and then converted to musicXML. That musicXML is processed by the Open Sheet Music Display API and displayed to the user. This nifty approach resulted in times ranging from 5-10 seconds, meaning there was a significant reduction in the output time. It also became much cheaper as the outputs went from 200 lines to 200 characters.

**Viraaj's Drum Notation**

**Base Note Symbols:**
- **W (Whole Note):** Occupies the entire 4/4 measure.
- **H (Half Note):** Half of a 4/4 measure.
- **Q (Quarter Note):** One-quarter of a 4/4 measure.
- **E (Eighth Note):** One-eighth of a 4/4 measure.
- **S (Sixteenth Note):** One-sixteenth of a 4/4 measure.
- **T (Thirty-Second Note):** One thirty-second of a 4/4 measure.

**Triplets (represented with a number suffix):**
- **Q3 (Quarter-Note Triplet):** Three quarter triplets fit into the space of two normal quarter notes. Each Q3 takes up 1/6 of the measure.
- **E3 (Eighth-Note Triplet):** Three eighth triplets fit into the space of two normal eighth notes. Each E3 takes up 1/12 of the measure.
- **S3 (Sixteenth-Note Triplet):** Three sixteenth triplets fit into the space of two normal sixteenth notes. Each S3 takes up 1/24 of the measure.

**Modifiers & Suffixes:**
To modify how a note is played, the following suffixes are used:
- **X (Accent):** Highlights the note with an accent (e.g., RQX).
- **F (Flam):** Indicates a flam, where a grace note precedes the main note (e.g., LSF).
- **D (Diddle):** Represents a diddle, where the note is played as a double stroke (e.g., REXD).
- **G (Ghost):** Marks a ghost note, which is played at a softer dynamic (e.g., S3G).

**Examples of Viraaj's Drum Notation:**

- RQ RQ RE RE RS RS RS RS|LQ LQ LE LE LS LS LS LS
- RQ RQ RQ RQ|RQ RQ RQ RQ
- RQXFD RQXFD RQXFD RQXFD
- RE3 LE3 RE3 RE3F LE3 RE3 LE3 LE3F RE3 LE3 RE3 RE3F
