from services.script_generator import _call_llm
from config import get_settings
import pytest

class DummyResponse:
    def __init__(self, status_code, text, json_data=None):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text
    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")
    def json(self):
        return self._json

@pytest.fixture(autouse=True)
def clear_keys(monkeypatch):
    # clear both keys for each test
    settings = get_settings()
    monkeypatch.setattr(settings, 'openai_api_key', '')
    monkeypatch.setattr(settings, 'openrouter_api_key', '')
    yield


def test_llm_errors_without_any_key():
    with pytest.raises(RuntimeError) as exc:
        _call_llm("hello")
    assert "No LLM API key" in str(exc.value)


def test_llm_uses_openai(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'openai_api_key', 'sk-test')

    def fake_post(url, headers, json, timeout):
        assert url.startswith("https://api.openai.com")
        return DummyResponse(200, "", {"choices":[{"message":{"content":"ok"}}]})

    monkeypatch.setattr("httpx.post", fake_post)
    assert _call_llm("hi") == "ok"


def test_openai_rate_limit_message(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'openai_api_key', 'sk-test')

    def fake_post(url, headers, json, timeout):
        # simulate 429 from OpenAI
        return DummyResponse(429, "Too Many Requests")

    monkeypatch.setattr("httpx.post", fake_post)
    with pytest.raises(RuntimeError) as exc:
        _call_llm("hi")
    assert "rate limit" in str(exc.value).lower()


def test_llm_falls_back_to_openrouter(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'openrouter_api_key', 'routerkey')

    def fake_post(url, headers, json, timeout):
        assert url.startswith("https://openrouter.ai")
        return DummyResponse(200, "", {"choices":[{"message":{"content":"done"}}]})

    monkeypatch.setattr("httpx.post", fake_post)
    assert _call_llm("hi") == "done"
