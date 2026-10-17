export const WHISPER_SAMPLE_RATE = 16_000;

export function mixToMono(channels: Float32Array[]): Float32Array {
  if (!channels.length) return new Float32Array();
  const length = Math.min(...channels.map((channel) => channel.length));
  const mono = new Float32Array(length);
  for (const channel of channels) {
    for (let index = 0; index < length; index += 1) {
      mono[index] += channel[index] / channels.length;
    }
  }
  return mono;
}

export function resampleMono(samples: Float32Array, sourceRate: number, targetRate = WHISPER_SAMPLE_RATE): Float32Array {
  if (!samples.length || sourceRate <= 0 || targetRate <= 0) return new Float32Array();
  if (sourceRate === targetRate) return samples.slice();
  const length = Math.round(samples.length * targetRate / sourceRate);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const position = index * sourceRate / targetRate;
    const before = Math.floor(position);
    const after = Math.min(before + 1, samples.length - 1);
    const fraction = position - before;
    output[index] = samples[before] * (1 - fraction) + samples[after] * fraction;
  }
  return output;
}

export function mixAndResample(channels: Float32Array[], sourceRate: number, targetRate = WHISPER_SAMPLE_RATE): Float32Array {
  return resampleMono(mixToMono(channels), sourceRate, targetRate);
}
