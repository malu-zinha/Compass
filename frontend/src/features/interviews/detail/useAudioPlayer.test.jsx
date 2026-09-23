import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import AudioPlayer from './AudioPlayer';
import { useAudioPlayer } from './useAudioPlayer';

vi.mock('../../../api/interviews', () => ({ getAudioUrl: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom não implementa reprodução de mídia.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function PlayerHarness({ id }) {
  const player = useAudioPlayer(id, true, [], 90);
  return <AudioPlayer player={player} />;
}

test('busca a url do áudio ao montar quando has_audio é true', async () => {
  const { getAudioUrl } = await import('../../../api/interviews');
  getAudioUrl.mockResolvedValue({ url: 'http://api/interviews/1/audio?expires=1&signature=x', expires_at: 123 });

  const { result } = renderHook(() => useAudioPlayer(1, true, [], null));

  await waitFor(() => expect(result.current.url).toBe('http://api/interviews/1/audio?expires=1&signature=x'));
  expect(getAudioUrl).toHaveBeenCalledWith(1);
});

test('não busca a url quando has_audio é false', async () => {
  const { getAudioUrl } = await import('../../../api/interviews');
  renderHook(() => useAudioPlayer(1, false, [], null));
  await act(async () => {});
  expect(getAudioUrl).not.toHaveBeenCalled();
});

test('no erro do áudio, busca a url de novo uma única vez', async () => {
  const { getAudioUrl } = await import('../../../api/interviews');
  getAudioUrl.mockResolvedValue({ url: 'http://api/audio', expires_at: 123 });
  const { result } = renderHook(() => useAudioPlayer(1, true, [], null));
  await waitFor(() => expect(getAudioUrl).toHaveBeenCalledTimes(1));

  act(() => { result.current.audioHandlers.onError(); });
  await waitFor(() => expect(getAudioUrl).toHaveBeenCalledTimes(2));

  act(() => { result.current.audioHandlers.onError(); });
  await waitFor(() => expect(result.current.audioError).toBeTruthy());
  expect(getAudioUrl).toHaveBeenCalledTimes(2);
});

test('AudioPlayer usa a url assinada no <audio> e o botão chama play', async () => {
  const { getAudioUrl } = await import('../../../api/interviews');
  getAudioUrl.mockResolvedValue({ url: 'http://api/interviews/7/audio?expires=1&signature=y', expires_at: 123 });
  const { container } = render(<PlayerHarness id={7} />);

  await waitFor(() => expect(container.querySelector('audio'))
    .toHaveAttribute('src', 'http://api/interviews/7/audio?expires=1&signature=y'));
  expect(getAudioUrl).toHaveBeenCalledWith(7);
  expect(screen.getByText('00:00 / 01:30')).toBeInTheDocument();

  await userEvent.click(container.querySelector('.play-btn'));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
});

test('falha ao reproduzir avisa por onError', async () => {
  const { getAudioUrl } = await import('../../../api/interviews');
  getAudioUrl.mockResolvedValue({ url: 'http://api/audio', expires_at: 123 });
  HTMLMediaElement.prototype.play.mockRejectedValue(new Error('NotAllowedError'));
  const onError = vi.fn();

  function Harness() {
    const player = useAudioPlayer(1, true, [], 90, { onError });
    return <AudioPlayer player={player} />;
  }
  const { container } = render(<Harness />);
  await waitFor(() => expect(container.querySelector('audio')).toHaveAttribute('src', 'http://api/audio'));

  await userEvent.click(container.querySelector('.play-btn'));
  await waitFor(() => expect(onError).toHaveBeenCalledWith('Não foi possível reproduzir o áudio.'));
});
