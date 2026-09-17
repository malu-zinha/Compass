from datetime import datetime
from enum import StrEnum

from sqlalchemy import JSON, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow


class InterviewStatus(StrEnum):
    draft = "draft"
    recording = "recording"
    uploaded = "uploaded"
    transcribing = "transcribing"
    analyzing = "analyzing"
    done = "done"
    error = "error"


PROCESSING_STATUSES = {InterviewStatus.uploaded, InterviewStatus.transcribing, InterviewStatus.analyzing}


class InterviewMode(StrEnum):
    live = "live"
    upload = "upload"


class QuestionSource(StrEnum):
    registered = "registered"
    ai = "ai"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    job_title: Mapped[str] = mapped_column(String(120), nullable=False, default="Entrevistador")
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    company: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    avatar_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    settings: Mapped["UserSettings | None"] = relationship(
        uselist=False, cascade="all, delete-orphan"
    )


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    suggest_questions: Mapped[bool] = mapped_column(nullable=False, default=True)
    suggestion_interval_seconds: Mapped[int] = mapped_column(nullable=False, default=40)
    transcription_language: Mapped[str] = mapped_column(String(5), nullable=False, default="pt")
    auto_save_notes: Mapped[bool] = mapped_column(nullable=False, default=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="America/Sao_Paulo")
    date_format: Mapped[str] = mapped_column(String(10), nullable=False, default="DD/MM/YYYY")


class Position(TimestampMixin, Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    ideal_profile: Mapped[str] = mapped_column(Text, nullable=False, default="")
    skills: Mapped[list] = mapped_column(JSON, nullable=False)
    vacancies: Mapped[int] = mapped_column(nullable=False, default=0)
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="position", cascade="all, delete-orphan", passive_deletes=True
    )
    questions: Mapped[list["Question"]] = relationship(
        back_populates="position", cascade="all, delete-orphan", passive_deletes=True
    )


class Question(TimestampMixin, Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    position_id: Mapped[int | None] = mapped_column(
        ForeignKey("positions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    position: Mapped["Position | None"] = relationship(back_populates="questions")


class Interview(TimestampMixin, Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    position_id: Mapped[int] = mapped_column(
        ForeignKey("positions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interviewer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    candidate_name: Mapped[str] = mapped_column(String(120), nullable=False)
    candidate_email: Mapped[str] = mapped_column(String(254), nullable=False)
    candidate_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    mode: Mapped[InterviewMode] = mapped_column(Enum(InterviewMode, native_enum=False), nullable=False)
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, native_enum=False), nullable=False, default=InterviewStatus.draft, index=True
    )
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="pt")
    recording_consent: Mapped[bool] = mapped_column(nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    audio_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audio_duration_seconds: Mapped[float | None] = mapped_column(nullable=True)
    transcript: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    analysis: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    score: Mapped[int | None] = mapped_column(nullable=True, index=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    position: Mapped["Position"] = relationship(back_populates="interviews")
    interviewer: Mapped["User | None"] = relationship()
    questions: Mapped[list["InterviewQuestion"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="InterviewQuestion.id",
    )


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    interview_id: Mapped[int] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[QuestionSource] = mapped_column(Enum(QuestionSource, native_enum=False), nullable=False)
    based_on: Mapped[str] = mapped_column(Text, nullable=False, default="")
    asked: Mapped[bool] = mapped_column(nullable=False, default=False)
    asked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    interview: Mapped["Interview"] = relationship(back_populates="questions")
