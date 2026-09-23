from app.db.models import User
from app.services.users import get_or_create_settings


def test_get_or_create_settings_is_idempotent_within_session(app):
    with app.state.session_factory() as db:
        new_user = User(name="Bea", username="bea", email="bea@example.com", password_hash="x")
        db.add(new_user)
        db.commit()

        first = get_or_create_settings(db, new_user)
        second = get_or_create_settings(db, new_user)

        assert first is second
        assert first.user_id == new_user.id
        assert first.suggest_questions is True
