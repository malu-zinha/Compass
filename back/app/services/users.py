from sqlalchemy.orm import Session

from app.core.signing import sign
from app.db.models import User, UserSettings
from app.schemas.users import UserOut


def get_or_create_settings(db: Session, user: User) -> UserSettings:
    if user.settings is not None:
        return user.settings
    settings_row = UserSettings(user_id=user.id)
    db.add(settings_row)
    db.commit()
    db.refresh(settings_row)
    return settings_row


def user_out(user: User, settings) -> UserOut:
    avatar_url = None
    if user.avatar_filename:
        expires, signature = sign(f"avatar:{user.id}", settings)
        avatar_url = f"/users/{user.id}/avatar?expires={expires}&signature={signature}"
    return UserOut(
        id=user.id,
        name=user.name,
        username=user.username,
        email=user.email,
        job_title=user.job_title,
        phone=user.phone,
        company=user.company,
        department=user.department,
        avatar_url=avatar_url,
    )
