from src.auth.auth import manager, User


def mock_logged_in_user(app):
    def _get_logged_in_user():
        return User(
            email="mock-user@example.com",
            service_name="Mock User",
            is_verified=True,
            calendar_slug="mock-user",
            calendar_created=True,
            max_weeks=4,
            bookable_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            calendar_description="Bring any documents you need reviewed.",
            calendar_location="Helsinki office",
        )

    app.dependency_overrides[manager] = _get_logged_in_user
