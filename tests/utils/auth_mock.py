from src.auth.auth import manager, User


def mock_logged_in_user(app):
    def _get_logged_in_user():
        return User(
            username="mock-user",
            email="mock-user@example.com",
            fullname="Mock User",
            calendar_slug="mock-user",
            calendar_created=True,
            max_weeks=4,
            bookable_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            calendar_description="Bring any documents you need reviewed.",
            calendar_location="Helsinki office",
        )

    app.dependency_overrides[manager] = _get_logged_in_user
