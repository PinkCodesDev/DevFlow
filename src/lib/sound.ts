let audioContext: AudioContext | null = null;
export async function enableAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
}
export async function playChime() {
  await enableAudio();
  if (!audioContext || audioContext.state !== "running") throw new Error("Sound is blocked by this browser. Try the sound button again.");
  const context = audioContext;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine"; oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + 0.5);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
