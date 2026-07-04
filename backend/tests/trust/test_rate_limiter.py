import pytest
from trust.services.rate_limiter import check_rate_limit, reset_for_testing

CID = "test-channel"

@pytest.fixture(autouse=True)
def clean():
    reset_for_testing(CID)
    yield
    reset_for_testing(CID)

def test_first_request_allowed():
    flags = check_rate_limit(CID, 5)
    assert flags == []

def test_within_limit_allowed():
    for _ in range(5):
        check_rate_limit(CID, 5)
    # 5th request should be the last allowed; 6th blocked
    flags = check_rate_limit(CID, 5)
    assert flags and flags[0].type == "rate_limit"
    assert flags[0].severity == "block"

def test_different_channels_tracked_independently():
    for _ in range(5):
        check_rate_limit("ch-a", 5)
    assert check_rate_limit("ch-a", 5)[0].type == "rate_limit"
    assert check_rate_limit("ch-b", 5) == []
    reset_for_testing("ch-a")
    reset_for_testing("ch-b")
