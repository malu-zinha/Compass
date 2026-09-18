import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useMicrophonePcm } from './useMicrophonePcm';

let track;
let stream;
let source;
let context;
let nodes;
let getUserMedia;

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.destination = { name: 'destination' };
    this.audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
    this.createMediaStreamSource = vi.fn(() => source);
    this.close = vi.fn(() => { this.state = 'closed'; return Promise.resolve(); });
    context = this;
  }
}

class FakeAudioWorkletNode {
  constructor(ctx, name) {
    this.context = ctx;
    this.name = name;
    this.port = { onmessage: null };
    this.connect = vi.fn();
    this.disconnect = vi.fn();
    nodes.push(this);
  }
}

beforeEach(() => {
  track = { stop: vi.fn() };
  stream = { getTracks: () => [track] };
  source = { connect: vi.fn(), disconnect: vi.fn() };
  context = null;
  nodes = [];
  getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete navigator.mediaDevices;
});

test('start liga microfone → worklet → destino e repassa os frames ao onChunk', async () => {
  const onChunk = vi.fn();
  const { result } = renderHook(() => useMicrophonePcm({ onChunk }));

  await act(async () => { await result.current.start(); });

  expect(getUserMedia).toHaveBeenCalledWith({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  expect(context.audioWorklet.addModule).toHaveBeenCalledWith('/pcm-worklet.js');
  expect(nodes).toHaveLength(1);
  const [node] = nodes;
  expect(node.name).toBe('pcm-worklet');
  expect(context.createMediaStreamSource).toHaveBeenCalledWith(stream);
  expect(source.connect).toHaveBeenCalledWith(node);
  expect(node.connect).toHaveBeenCalledWith(context.destination);

  const frame = new Int16Array(1600).buffer;
  node.port.onmessage({ data: frame });
  expect(onChunk).toHaveBeenCalledWith(frame);
  expect(result.current.error).toBeNull();
});

test('usa sempre o onChunk mais recente', async () => {
  const first = vi.fn();
  const second = vi.fn();
  const { result, rerender } = renderHook(({ onChunk }) => useMicrophonePcm({ onChunk }), {
    initialProps: { onChunk: first },
  });
  await act(async () => { await result.current.start(); });
  rerender({ onChunk: second });

  nodes[0].port.onmessage({ data: new ArrayBuffer(4) });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

test('stop desconecta os nós, fecha o contexto e para as tracks', async () => {
  const { result } = renderHook(() => useMicrophonePcm({ onChunk: vi.fn() }));
  await act(async () => { await result.current.start(); });

  act(() => result.current.stop());

  expect(nodes[0].disconnect).toHaveBeenCalled();
  expect(source.disconnect).toHaveBeenCalled();
  expect(context.close).toHaveBeenCalledTimes(1);
  expect(track.stop).toHaveBeenCalledTimes(1);
});

test('desmontar o componente libera o microfone', async () => {
  const { result, unmount } = renderHook(() => useMicrophonePcm({ onChunk: vi.fn() }));
  await act(async () => { await result.current.start(); });

  unmount();

  expect(context.close).toHaveBeenCalledTimes(1);
  expect(track.stop).toHaveBeenCalledTimes(1);
});

test('guarda o erro quando não há permissão de microfone', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
  const { result } = renderHook(() => useMicrophonePcm({ onChunk: vi.fn() }));

  await act(async () => { await result.current.start(); });

  expect(result.current.error).toBe('Erro ao acessar o microfone. Verifique as permissões.');
  expect(context).toBeNull();
  expect(consoleError).toHaveBeenCalled();
});
