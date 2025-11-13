from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
from routers import positions, interviews, interview_processing, global_questions

app = FastAPI(
    title="API de Resumos de Entrevistas",
    description="Uma API para gerar resumos de transcrições usando o inteligência artificial",
    version="0.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database.create_table()

app.include_router(positions.router)

app.include_router(interviews.router)

app.include_router(interview_processing.router)

app.include_router(global_questions.router)

@app.get("/")
def read_root():
    return {"message": "API de Resumos de Entrevistas está online"}
