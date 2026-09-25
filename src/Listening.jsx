// Listening sections.
//
// A real listening paper plays a recording once. There is no recorded audio
// here, so the browser reads the transcript aloud instead. It sounds synthetic,
// which is a fair trade for the thing that actually matters: you answer while
// listening, from memory, without a text to scan back through. That is the
// skill the section tests, and reading a transcript does not train it.

import { useEffect, useRef, useState } from "react";
import { sayAs, stopSpeaking } from "./tts.js";

export function speechAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}


export function Player({ transcript, playsAllowed = 1, onFinished }) {
  const [state, setState] = useState("idle"); // idle | playing | done
  const [plays, setPlays] = useState(0);
  const [showText, setShowText] = useState(false);
  const utterance = useRef(null);

  // Leaving the page mid sentence would otherwise keep talking.
  useEffect(() => () => stopSpeaking(), []);

  // Voices load asynchronously in most browsers, so the first call can be empty.
  useEffect(() => {
    if (!speechAvailable()) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);

  function play() {
    if (!speechAvailable() || plays >= playsAllowed) return;

    // A shade under normal pace, closer to how exam recordings sound.
    utterance.current = sayAs("narrator", transcript, {
      rate: 0.95,
      onEnd: () => { setState("done"); onFinished?.(); },
    });
    setPlays((n) => n + 1);
    setState("playing");
  }

  function stop() {
    stopSpeaking();
    setState("done");
  }

  const left = playsAllowed - plays;

  if (!speechAvailable()) {
    return (
      <div className="player">
        <div className="small muted">
          This browser cannot read the recording aloud, so here is the transcript instead.
        </div>
        <div className="passage-body" style={{ marginTop: 12 }}>{transcript}</div>
      </div>
    );
  }

  return (
    <div className={"player" + (state === "playing" ? " on" : "")}>
      <div className="player-row">
        <button className="btn" onClick={state === "playing" ? stop : play} disabled={state !== "playing" && left <= 0}>
          {state === "playing" ? "Stop" : plays === 0 ? "Play the recording" : "Play again"}
        </button>
        <div className="player-state small">
          {state === "playing" ? (
            <span className="player-live"><i /><i /><i /> Playing</span>
          ) : plays === 0 ? (
            <span className="muted">
              {playsAllowed === 1 ? "Plays once, as in the real test" : `You may play it ${playsAllowed} times`}
            </span>
          ) : left > 0 ? (
            <span className="muted">{left} play{left === 1 ? "" : "s"} left</span>
          ) : (
            <span className="muted">That was your only play, as in the real test</span>
          )}
        </div>
      </div>

      {state === "done" && left <= 0 && (
        <button className="btn quiet player-reveal" onClick={() => setShowText((v) => !v)}>
          {showText ? "Hide the transcript" : "Show the transcript"}
        </button>
      )}

      {showText && <div className="passage-body player-text">{transcript}</div>}
    </div>
  );
}
