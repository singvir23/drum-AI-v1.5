import React, { useState, useRef } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import "./MusicSheet.css";

const MusicSheet = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const osmdRef = useRef(null);

  // Get the API URL from environment variable or default to production URL
  const API_URL = process.env.REACT_APP_API_URL || "https://your-vercel-project.vercel.app/api/generate-xml";

  const handleGenerateMusic = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate music');
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
          drawingParameters: "compact",
          // Add more OSMD options as needed
          followCursor: false,
          disableCursor: true,
        });

        await osmd.load(data.xml);
        osmd.render();

        // Optionally display the notation if you want to show it
        if (data.notation) {
          console.log("Generated Notation:", data.notation);
        }
      } else {
        throw new Error('No XML data received');
      }
    } catch (error) {
      console.error("Error generating music: ", error);
      setError(error.message || 'Failed to generate music. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="music-sheet-container">
      <h1>Music Sheet Generator</h1>
      <div className="input-container">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a music prompt..."
          disabled={loading}
          className="prompt-input"
        />
        <button 
          onClick={handleGenerateMusic} 
          disabled={loading || !prompt.trim()}
          className="generate-button"
        >
          {loading ? "Generating..." : "Generate Music"}
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Generating your music sheet...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div ref={osmdRef} className="osmd-container"></div>
    </div>
  );
};

export default MusicSheet;