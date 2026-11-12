import unittest

from app.core.service_auth import is_valid_service_key


class ServiceKeyTest(unittest.TestCase):
    def test_matching_key_is_authorized(self):
        self.assertTrue(is_valid_service_key("same-key", "same-key"))

    def test_missing_or_mismatched_key_is_rejected(self):
        self.assertFalse(is_valid_service_key(None, "expected"))
        self.assertFalse(is_valid_service_key("wrong", "expected"))
        self.assertFalse(is_valid_service_key("provided", None))


if __name__ == "__main__":
    unittest.main()
