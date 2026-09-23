from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.users import EMAIL_PATTERN, UserOut

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class RegisterIn(BaseModel):
    name: Name
    email: Annotated[str, Field(pattern=EMAIL_PATTERN, max_length=254)]
    username: Username
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut
