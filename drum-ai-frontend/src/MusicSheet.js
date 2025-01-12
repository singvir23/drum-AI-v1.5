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
      <h1>Music Sheet Generator</h1>
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
    </div>
  );
};

export default MusicSheet;