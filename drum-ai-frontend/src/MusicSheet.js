import React, { useState, useRef } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import "./MusicSheet.css"; // Import the new CSS

const MusicSheet = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const osmdRef = useRef(null);

  const handleGenerateMusic = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/generate-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.xml) {
        const osmd = new OpenSheetMusicDisplay(osmdRef.current, {
          autoResize: true,
          drawTitle: false,
        });
        await osmd.load(data.xml);
        osmd.render();
      }
    } catch (error) {
      console.error("Error fetching the MusicXML: ", error);
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
        />
        <button onClick={handleGenerateMusic} disabled={loading}>
          {loading ? "Generating..." : "Generate Music"}
        </button>
      </div>
      {loading && <div className="loading-spinner"></div>}
      <div ref={osmdRef} className="osmd-container"></div>
    </div>
  );
};

export default MusicSheet;
