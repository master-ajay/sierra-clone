from trust.services.pii import redact_pii


def test_clean_message_no_flags():
    clean, flags = redact_pii("How long does shipping take?")
    assert clean == "How long does shipping take?"
    assert flags == []


def test_email_redacted():
    clean, flags = redact_pii("Contact me at jane.doe@example.com please")
    assert "[EMAIL]" in clean
    assert "jane.doe@example.com" not in clean
    assert len(flags) == 1
    assert flags[0]["type"] == "pii"
    assert flags[0]["severity"] == "warn"
    assert "email" in flags[0]["detail"].lower()


def test_email_case_insensitive_and_uppercase():
    clean, flags = redact_pii("Email: JANE.DOE@EXAMPLE.COM")
    assert "[EMAIL]" in clean
    assert "JANE.DOE@EXAMPLE.COM" not in clean
    assert len(flags) == 1


def test_phone_redacted_common_us_format():
    clean, flags = redact_pii("Call me at (415) 555-2671")
    assert "[PHONE]" in clean
    assert "555-2671" not in clean
    assert any(f["type"] == "pii" for f in flags)


def test_phone_redacted_e164():
    clean, flags = redact_pii("My number is +14155552671")
    assert "[PHONE]" in clean
    assert "+14155552671" not in clean


def test_credit_card_luhn_valid_redacted():
    # 4111111111111111 is a well-known Luhn-valid test Visa number
    clean, flags = redact_pii("Card number: 4111111111111111")
    assert "[CREDIT_CARD]" in clean
    assert "4111111111111111" not in clean
    assert any(f["type"] == "pii" for f in flags)


def test_credit_card_luhn_invalid_not_redacted():
    # Same length, fails Luhn check -> not a real card number, should not match
    clean, flags = redact_pii("Reference number: 1234567890123456")
    assert "[CREDIT_CARD]" not in clean
    assert clean == "Reference number: 1234567890123456"
    assert flags == []


def test_ssn_redacted():
    clean, flags = redact_pii("SSN: 123-45-6789")
    assert "[SSN]" in clean
    assert "123-45-6789" not in clean
    assert any(f["type"] == "pii" for f in flags)


def test_multiple_pii_types_in_one_message():
    text = "Email jane@example.com or call (415) 555-2671, SSN 123-45-6789"
    clean, flags = redact_pii(text)
    assert "[EMAIL]" in clean
    assert "[PHONE]" in clean
    assert "[SSN]" in clean
    assert len(flags) == 3
    types_found = {f["detail"] for f in flags}
    assert len(types_found) == 3


def test_order_confirmation_with_card_last_digits_not_over_redacted():
    # a message referencing an order id should not be treated as PII
    clean, flags = redact_pii("Your order #1001 has shipped")
    assert clean == "Your order #1001 has shipped"
    assert flags == []
