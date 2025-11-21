from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List
import time

app = FastAPI()

class AnalyzeRequest(BaseModel):
    user_id: str
    chart_data: dict

class ChatRequest(BaseModel):
    message: str

class IngestRequest(BaseModel):
    documents: List[str]

@app.post('/analyze')
def analyze(req: AnalyzeRequest):
    # Placeholder: LLM + RAG logic
    return {"recommendation": "Buy", "rationale": "Strong uptrend detected."}

@app.post('/chat')
def chat(req: ChatRequest):
    def event_stream():
        for word in ["Hello,", "this", "is", "your", "AI", "analyst."]:
            yield word + ' '
            time.sleep(0.2)
    return StreamingResponse(event_stream(), media_type="text/plain")

@app.post('/ingest')
def ingest(req: IngestRequest):
    # Placeholder: Ingest docs to vector DB
    return {"status": "ingested", "count": len(req.documents)} 