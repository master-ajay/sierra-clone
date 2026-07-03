from trust.services.pii import scan_pii

def test_no_pii_unchanged():
    clean, flags = scan_pii("Hello, how can I help you?")
    assert clean == "Hello, how can I help you?"
    assert flags == []

def test_email_redacted():
    clean, flags = scan_pii("Contact us at support@example.com for help.")
    assert "[EMAIL]" in clean
    assert "support@example.com" not in clean
    assert any(f.type == "pii" for f in flags)

def test_phone_redacted():
    clean, flags = scan_pii("Call us at 555-867-5309")
    assert "[PHONE]" in clean
    assert any(f.type == "pii" for f in flags)

def test_ssn_redacted():
    clean, flags = scan_pii("My SSN is 123-45-6789")
    assert "[SSN]" in clean
    assert any(f.type == "pii" for f in flags)

def test_credit_card_redacted():
    clean, flags = scan_pii("Card: 4111111111111111")
    assert "[CREDIT_CARD]" in clean
    assert any(f.type == "pii" for f in flags)

def test_invalid_luhn_not_flagged():
    clean, flags = scan_pii("Number: 4111111111111112")
    assert "[CREDIT_CARD]" not in clean

def test_multiple_pii_types():
    clean, flags = scan_pii("Email: test@test.com, SSN: 123-45-6789")
    assert "[EMAIL]" in clean
    assert "[SSN]" in clean
    assert len(flags) == 2

def test_pii_flags_are_warn_severity():
    _, flags = scan_pii("test@example.com")
    assert all(f.severity == "warn" for f in flags)
