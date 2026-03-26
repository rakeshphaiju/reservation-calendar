from src.auth.auth import manager, User


def mock_logged_in_user(app):
    def _get_logged_in_user():
        return User(
            username="mock-user",
            email="mock-user@example.com",
            fullname="Mock User",
            calendar_slug="mock-user",
            max_weeks=4,
            bookable_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        )

    app.dependency_overrides[manager] = _get_logged_in_user
