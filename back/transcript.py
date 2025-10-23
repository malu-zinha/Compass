import os
import requests

def transcribe(audio_file_path: str) -> str:
    """
    Gera transcrição de um arquivo de áudio usando a API Whisper da OpenAI.
    Retorna o texto da transcrição ou lança exceção em caso de erro.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise Exception("OPENAI_API_KEY não está definida no ambiente.")

    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}

    with open(audio_file_path, "rb") as audio_file:
        files = {
            "file": (os.path.basename(audio_file_path), audio_file, "audio/wav"),
            "model": (None, "whisper-1"),
        }
        response = requests.post(url, headers=headers, files=files)

    if response.status_code == 200:
        transcript = response.json().get("text", "")
        return transcript
    else:
        raise Exception(f"Erro na transcrição: {response.status_code} - {response.text}")

