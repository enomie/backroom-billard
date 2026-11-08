/**
 * Developer tool, loaded only with `?perf` in the URL: shows where a frame goes and lets you switch
 * the expensive parts off one by one, to see on YOUR machine what limits the frame rate.
 *  - fps / frame ms: how often the loop runs (rAF to rAF)
 *  - loop: CPU ms of the whole game loop; render: CPU ms of renderer.render only
 *  - gpu: ms the GPU needs for renderer.render (timer query; "n/a" if the browser has none)
 *  - calls / tris / programs: from three's renderer.info
 * If loop and render are small but gpu is large, the GPU is the limit. Not translated on purpose.
 */
import * as THREE from "three";

const AVERAGE_FRAMES = 30;

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 */
export function createPerfHud(renderer, scene) {
  const gl = renderer.getContext();
  const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  const pending = []; // timer queries not yet read
  const samples = { frame: [], loop: [], render: [], gpu: [] };
  let lastFrame = performance.now();
  let loopStart = 0;
  let renderStart = 0;
  let query = null;

  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;right:8px;bottom:8px;z-index:50;padding:6px 8px;font:11px/1.4 monospace;color:#9f9;background:rgba(0,0,0,.75);border-radius:4px;white-space:pre;pointer-events:auto";
  const text = document.createElement("div");
  const buttons = document.createElement("div");
  panel.append(text, buttons);
  document.body.appendChild(panel);

  const dpr = Math.min(window.devicePixelRatio, 2);
  const setAll = (visible, test) => scene.traverse((o) => { if (test(o)) o.visible = visible; });
  const recompile = () => scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  const features = [
    ["fog layers", (on) => setAll(on, (o) => o.name === "atmosphere")],
    ["shadows", (on) => { renderer.shadowMap.enabled = on; recompile(); }],
    ["pixel ratio", (on) => { renderer.setPixelRatio(on ? dpr : 1); renderer.setSize(window.innerWidth, window.innerHeight); }],
  ];
  for (const [name, apply] of features) {
    let on = true;
    const button = document.createElement("button");
    button.style.cssText = "margin:4px 4px 0 0;font:11px monospace;cursor:pointer";
    const label = () => (button.textContent = `${name}: ${on ? "on" : "OFF"}`);
    button.addEventListener("click", () => { on = !on; apply(on); label(); });
    label();
    buttons.appendChild(button);
  }

  const push = (list, value) => { list.push(value); if (list.length > AVERAGE_FRAMES) list.shift(); };
  const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : NaN);
  const format = (v) => (Number.isFinite(v) ? v.toFixed(1) : "n/a");

  /** Poll the finished GPU timer queries. */
  function readQueries() {
    while (pending.length) {
      const q = pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      pending.shift();
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) push(samples.gpu, gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
  }

  return {
    /** First thing in the game loop. */
    loopStart(now) {
      push(samples.frame, now - lastFrame);
      lastFrame = now;
      loopStart = performance.now();
    },
    /** Right before renderer.render. */
    renderStart() {
      renderStart = performance.now();
      if (timer) {
        query = gl.createQuery();
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      }
    },
    /** Right after renderer.render, also the end of the loop. */
    renderEnd() {
      const now = performance.now();
      if (timer) {
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        pending.push(query);
        readQueries();
      }
      push(samples.render, now - renderStart);
      push(samples.loop, now - loopStart);
      if (samples.frame.length % 10 === 0) {
        const frame = average(samples.frame);
        const info = renderer.info;
        text.textContent =
          `${(1000 / frame).toFixed(1)} fps  frame ${format(frame)} ms\n` +
          `loop ${format(average(samples.loop))} ms  render ${format(average(samples.render))} ms  gpu ${format(average(samples.gpu))} ms\n` +
          `calls ${info.render.calls}  tris ${info.render.triangles}  programs ${info.programs.length}  dpr ${renderer.getPixelRatio()}`;
      }
    },
  };
}
