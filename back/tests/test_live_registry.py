import asyncio

from app.services.live.registry import LiveRegistry


class FakeSocket:
    def __init__(self, registry: LiveRegistry, interview_id: int):
        self.registry, self.interview_id, self.close_code = registry, interview_id, None

    async def close(self, code: int = 1000):
        self.close_code = code
        # a sessão antiga termina logo depois de ser fechada
        asyncio.get_running_loop().call_soon(self.registry.release, self.interview_id, self)


def test_new_connection_replaces_previous_one():
    async def scenario():
        registry = LiveRegistry()
        old, new = FakeSocket(registry, 1), FakeSocket(registry, 1)
        await registry.acquire(1, old)
        assert registry.is_active(1) and not registry.is_active(2)
        await asyncio.wait_for(registry.acquire(1, new), timeout=1)
        assert old.close_code == 4000 and new.close_code is None
        registry.release(1, old)  # não é a conexão registrada: nada muda
        assert registry.is_active(1)
        registry.release(1, new)
        assert not registry.is_active(1)

    asyncio.run(scenario())
