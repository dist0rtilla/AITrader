import unittest
from backend.services import mcp_client

class TestMCPClient(unittest.TestCase):
    def test_get_login_link(self):
        url = mcp_client.get_login_link()
        self.assertIsInstance(url, str)

    def test_get_holdings(self):
        h = mcp_client.get_holdings()
        self.assertIn('holdings', h)
        self.assertIsInstance(h['holdings'], list)

if __name__ == '__main__':
    unittest.main()
