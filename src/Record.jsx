// What recording a lecture looks like.
//
// The microphone's loudness drives two things. Along the top, a scrolling
// wave of bars like a voice memo, so it is obvious at a glance that sound is
// arriving. Below, water whose level and swell follow the voice, with the duck
// floating on it: it rides up when the speaker gets louder, rocks with the
// waves and throws up a splash on a loud word. Quiet room, calm water.
//
// It reads loudness only, from its own copy of the microphone. The words come
// from the speech recogniser running alongside it, and none of the audio is
// kept or sent anywhere by this component.

import { useEffect, useRef } from "react";
import { DuckParts } from "./Duck.jsx";

export function RecordingView({ seconds = 0, words = 0, lastLine = "", onStop }) {
  const bars = useRef(null);
  const water = useRef(null);
  const duck = useRef(null);
  const splash = useRef(null);

  useEffect(() => {
    let raf = 0, stream = null, ctx = null, analyser = null, data = null;
    let level = 0, smooth = 0, t0 = performance.now(), lastBar = 0, lastSplash = 0;
    let W = 320; // the water's width in its own units, matched to the box so nothing stretches
    const history = [];

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        data = new Uint8Array(analyser.fftSize);
        ctx.createMediaStreamSource(stream).connect(analyser);
      } catch {
        // No microphone reading: the water stays calm and the duck bobs.
      }
    })();

    const draw = (now) => {
      const t = (now - t0) / 1000;
      if (analyser) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        level = Math.min(1, Math.sqrt(sum / data.length) * 4.2);
      } else {
        level = 0.04 + 0.03 * Math.sin(t * 2);
      }
      smooth += (level - smooth) * (level > smooth ? 0.35 : 0.06);

      // The voice memo wave: a new bar every 60ms, scrolling left.
      if (now - lastBar > 60) {
        history.push(Math.max(0.04, level));
        if (history.length > 120) history.shift();
        lastBar = now;
      }
      const c = bars.current;
      if (c) {
        const g = c.getContext("2d");
        const w = c.width, h = c.height, dpr = window.devicePixelRatio || 1;
        g.clearRect(0, 0, w, h);
        const step = 6 * dpr, bw = 3 * dpr;
        const color = getComputedStyle(c).color;
        for (let i = history.length - 1, x = w - 40 * dpr; i >= 0 && x > -step; i--, x -= step) {
          const bh = Math.max(3 * dpr, history[i] * (h - 8 * dpr));
          g.globalAlpha = Math.max(0.25, 1 - (w - x) / w);
          g.fillStyle = color;
          g.beginPath();
          g.roundRect?.(x, (h - bh) / 2, bw, bh, bw / 2) ?? g.rect(x, (h - bh) / 2, bw, bh);
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = "#e5484d";
        g.fillRect(w - 38 * dpr, 4 * dpr, 2 * dpr, h - 8 * dpr);
      }

      // The water: its level rises with the voice and its swell with it.
      const H = 150;
      const base = 118 - smooth * 40;
      const amp = 3 + smooth * 12;
      const surf = (x) => base + Math.sin(x / 34 + t * 2.4) * amp + Math.sin(x / 17 - t * 3.1) * amp * 0.35;
      if (water.current) {
        let d = `M0 ${H} L0 ${surf(0).toFixed(1)}`;
        for (let x = 8; x <= W; x += 8) d += ` L${x} ${surf(x).toFixed(1)}`;
        water.current.querySelector(".rw-front").setAttribute("d", d + ` L${W} ${H} Z`);
        let d2 = `M0 ${H} L0 ${(surf(20) - 7).toFixed(1)}`;
        for (let x = 8; x <= W; x += 8) d2 += ` L${x} ${(surf(x + 40) - 7).toFixed(1)}`;
        water.current.querySelector(".rw-back").setAttribute("d", d2 + ` L${W} ${H} Z`);
      }

      // The duck floats at the middle of the surface, tilting with its slope.
      const mid = W / 2;
      const y = surf(mid), slope = (surf(mid + 6) - surf(mid - 6)) / 12;
      if (duck.current) {
        duck.current.setAttribute("transform",
          `translate(${mid - 47} ${y - 86}) rotate(${(Math.atan(slope) * 57).toFixed(1)} 47 86) scale(0.75)`);
      }

      // A loud word throws up a splash either side of the duck.
      if (level > 0.62 && now - lastSplash > 700) {
        lastSplash = now;
        splash.current?.classList.remove("go");
        void splash.current?.getBoundingClientRect();
        splash.current?.classList.add("go");
      }
      if (splash.current) splash.current.setAttribute("transform", `translate(${mid} ${y - 6})`);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const size = () => {
      const sv = water.current;
      if (sv && sv.clientHeight) {
        W = Math.round((sv.clientWidth / sv.clientHeight) * 150);
        sv.setAttribute("viewBox", `0 0 ${W} 150`);
      }
      const c = bars.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    };
    size();
    addEventListener("resize", size);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      stream?.getTracks().forEach((tr) => tr.stop());
      ctx?.close().catch(() => {});
    };
  }, []);

  const mm = Math.floor(seconds / 60), ss = String(Math.floor(seconds % 60)).padStart(2, "0");

  return (
    <div className="rv card fade" role="status" aria-live="polite">
      <div className="rv-top">
        <span className="rv-live"><i /> Recording</span>
        <span className="rv-time">{mm}:{ss}</span>
      </div>
      <canvas className="rv-bars" ref={bars} aria-hidden="true" />
      <svg className="rv-water" viewBox="0 0 320 150" preserveAspectRatio="xMidYMax meet" ref={water} aria-hidden="true">
        <path className="rw-back" />
        <g ref={duck}><DuckParts /></g>
        <g ref={splash} className="rv-splash">
          <circle cx="-52" cy="0" r="3.6" /><circle cx="-62" cy="-5" r="2.4" /><circle cx="-44" cy="-7" r="2.2" />
          <circle cx="52" cy="0" r="3.6" /><circle cx="62" cy="-5" r="2.4" /><circle cx="44" cy="-7" r="2.2" />
        </g>
        <path className="rw-front" />
      </svg>
      <div className="rv-foot">
        <p className="rv-line">{lastLine ? `"...${lastLine}"` : "Start talking, or hold the device near the speaker."}</p>
        <div className="rv-actions">
          <span className="small muted">{words.toLocaleString()} word{words === 1 ? "" : "s"} so far</span>
          <button className="btn rv-stop" onClick={onStop}><span className="rv-square" /> Stop</button>
        </div>
      </div>
    </div>
  );
}
