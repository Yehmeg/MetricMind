"""Groq HTTP adapter. No API calls occur during import or construction."""
import os
import httpx
from .llm_provider import ProviderError

class GroqProvider:
    def __init__(self, *, api_key: str, model: str,
                 transport: httpx.BaseTransport | None = None):
        if not api_key.strip() or not model.strip():
            raise ValueError('GROQ_API_KEY and GROQ_MODEL must be configured')
        self._api_key = api_key.strip()
        self.model = model.strip()
        self._transport = transport

    @classmethod
    def from_env(cls):
        return cls(api_key=os.environ.get('GROQ_API_KEY', ''),
                   model=os.environ.get('GROQ_MODEL', ''))

    def complete(self, *, system: str, question: str) -> str:
        try:
            with httpx.Client(timeout=httpx.Timeout(20.0, connect=5.0),
                              transport=self._transport,
                              follow_redirects=False) as client:
                response = client.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={'Authorization': 'Bearer ' + self._api_key},
                    json={'model': self.model,
                          'messages': [{'role': 'system', 'content': system},
                                       {'role': 'user', 'content': question}],
                          'response_format': {'type': 'json_object'},
                          'temperature': 0, 'max_completion_tokens': 1024})
                response.raise_for_status()
                choice = response.json()['choices'][0]
                if choice.get('finish_reason') != 'stop':
                    raise ProviderError('Provider did not return a complete answer')
                message = choice['message']
                content = message.get('content')
                if message.get('refusal') or not isinstance(content, str) or not content.strip():
                    raise ProviderError('Provider returned no usable answer')
                return content
        except httpx.TimeoutException:
            raise ProviderError('Provider request timed out') from None
        except httpx.HTTPStatusError:
            raise ProviderError('Provider rejected the request; check configuration or availability') from None
        except httpx.RequestError:
            raise ProviderError('Provider connection failed') from None
        except (ValueError, KeyError, IndexError, TypeError, AttributeError):
            raise ProviderError('Provider returned an invalid response') from None
