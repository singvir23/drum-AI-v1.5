import React, { useState, useRef } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import "./MusicSheet.css";

const MusicSheet = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const osmdRef = useRef(null);

  const handleGenerateMusic = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(process.env.REACT_APP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.xml) {
        // Clear previous content
        if (osmdRef.current) {
          osmdRef.current.innerHTML = '';
        }

        const osmd = new OpenSheetMusicDisplay(osmdRef.current, {
          autoResize: true,
          drawTitle: false,
        });

        await osmd.load(data.xml);
        osmd.render();
      }
    } catch (error) {
      console.error("Error generating music: ", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="music-sheet-container">
      <h1>AI Drum Lick Generator</h1>
      <div className="input-container">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a music prompt..."
          disabled={loading}
        />
        <button onClick={handleGenerateMusic} disabled={loading}>
          {loading ? "Generating..." : "Generate Music"}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-spinner"></div>}
      <div ref={osmdRef} className="osmd-container"></div>
      <div className="info-message">
        <p className="text-center">
          This model has been trained on a specific set of rudiments including single strokes, 
          paradiddles, paradiddlediddles, paraparadiddles, and all variations of triplets. 
          It supports embellishments like accents, flams, ghosts, and diddles. Results may be 
          unreliable for patterns outside these rudiments.
        </p>
        <p className="text-center">
          For optimal results, align your prompts with the diction used in the training dataset
        </p>
        <div className="link-container">
          <a 
            href="https://docs.google.com/spreadsheets/d/1aCQaoQlOaqvEH5VkMR_v5W4VfPgw02EmWrTizo5cUdQ/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="training-data-link"
          >
            View Training Data
          </a>
        </div>
      </div>
    </div>
  );
};

export default MusicSheet;