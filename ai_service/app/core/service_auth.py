import hmac


def is_valid_service_key(provided: str | None, expected: str | None) -> bool:
    """Compare the internal service key without leaking timing information."""
    return bool(provided and expected) and hmac.compare_digest(provided, expected)
