from src.auth.auth import manager, User


def mock_logged_in_user(app):
    def _get_logged_in_user():
        return User(username="mock-user", calendar_slug="mock-user")

    app.dependency_overrides[manager] = _get_logged_in_user
