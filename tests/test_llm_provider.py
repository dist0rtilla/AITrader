import unittest
from backend.services import llm_provider

class TestLLMProvider(unittest.TestCase):
    def test_generate_returns_dict(self):
        res = llm_provider.generate('test prompt')
        self.assertIsInstance(res, dict)
        self.assertIn('text', res)
        self.assertIn('tokens_used', res)
        self.assertIsInstance(res['text'], str)
        self.assertIsInstance(res['tokens_used'], int)

if __name__ == '__main__':
    unittest.main()
