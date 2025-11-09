from pydantic import BaseModel

class PositionCreateRequest(BaseModel):
    position: str
    skills: list[str]
    description: str

# Preservando o nome original da classe
class IterrviewCreateRequest(BaseModel):
    id: int
    name: str
    email: str
    number: str
    notes: str
