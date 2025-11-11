import sqlite3
from models import QuestionCreateRequest
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from database import get_db_connection

router = APIRouter(
    prefix="/positions/interviews/questions"
)
