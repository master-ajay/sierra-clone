from trust.services.rate_limiter import RateLimiter


def test_requests_within_limit_pass():
    limiter = RateLimiter(rpm=3, now_fn=lambda: 0.0)
    assert limiter.allow("chan-1") is True
    assert limiter.allow("chan-1") is True
    assert limiter.allow("chan-1") is True


def test_first_request_over_limit_is_blocked():
    limiter = RateLimiter(rpm=3, now_fn=lambda: 0.0)
    limiter.allow("chan-1")
    limiter.allow("chan-1")
    limiter.allow("chan-1")
    assert limiter.allow("chan-1") is False


def test_window_slides_old_requests_expire():
    t = [0.0]
    limiter = RateLimiter(rpm=2, now_fn=lambda: t[0])
    assert limiter.allow("chan-1") is True
    assert limiter.allow("chan-1") is True
    assert limiter.allow("chan-1") is False

    t[0] = 61.0  # past the 60s window
    assert limiter.allow("chan-1") is True


def test_multiple_channels_tracked_independently():
    limiter = RateLimiter(rpm=1, now_fn=lambda: 0.0)
    assert limiter.allow("chan-1") is True
    assert limiter.allow("chan-1") is False
    assert limiter.allow("chan-2") is True


def test_get_state_reports_count_and_limit_without_consuming():
    limiter = RateLimiter(rpm=5, now_fn=lambda: 0.0)
    limiter.allow("chan-1")
    limiter.allow("chan-1")
    state = limiter.get_state("chan-1")
    assert state == {"count": 2, "limit": 5}
    # calling get_state again should not itself count as a request
    assert limiter.get_state("chan-1") == {"count": 2, "limit": 5}


def test_get_state_unknown_channel_zero_count():
    limiter = RateLimiter(rpm=5, now_fn=lambda: 0.0)
    assert limiter.get_state("never-seen") == {"count": 0, "limit": 5}
