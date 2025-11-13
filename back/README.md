# 📋 Documentação Completa das Mudanças no Backend - Compass

Este documento descreve **todas** as alterações realizadas na pasta `backend` desde o repositório original clonado.

---

## 📦 1. `requirements.txt`

### Mudanças:
- ✅ **Adicionado:** `aiofiles==24.1.0`
- ❌ **Removido:** `audioop-lts==0.2.2` e `pydub`

### Motivo:
- `audioop-lts` causava erros de instalação no macOS (`ERROR: Could not find a version that satisfies the requirement audioop-lts==0.2.2`)
- `aiofiles` é necessário para manipular arquivos de forma assíncrona durante gravação ao vivo
- `pydub` não era usado no código

---

## 🔧 2. `models.py`

### Mudanças:
1. **Adicionado campo `vacancies` em `PositionCreateRequest`:**
   ```python
   vacancies: int = 0
   ```

2. **Criado novo modelo `NotesUpdateRequest`:**
   ```python
   class NotesUpdateRequest(BaseModel):
       notes: str
   ```

### Motivo:
- Frontend enviava `vacancies` mas backend não recebia → aparecia "0 vagas" sempre
- Necessário modelo Pydantic para endpoint PATCH de atualização de notes

---

## 🗄️ 3. `database.py`

### Mudanças:
1. **Adicionada coluna `vacancies` na tabela `positions`:**
   ```sql
   vacancies INTEGER DEFAULT 0
   ```

2. **Adicionada migração automática para bancos existentes:**
   ```python
   try:
       cursor.execute("ALTER TABLE positions ADD COLUMN vacancies INTEGER DEFAULT 0")
   except sqlite3.OperationalError:
       pass  # Coluna já existe
   ```

3. **Criada nova tabela `global_questions`:**
   ```sql
   CREATE TABLE IF NOT EXISTS global_questions (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       question TEXT NOT NULL,
       position_id INTEGER,
       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (position_id) REFERENCES positions(id)
   )
   ```

### Motivo:
- Banco não tinha coluna para armazenar número de vagas
- Migração garante compatibilidade com bancos de dados já existentes
- Necessário para suportar perguntas gerais e perguntas por cargo específico

---

## 📍 4. `routers/positions.py`

### Mudanças:
1. ✅ **CREATE agora salva `vacancies`:**
   ```python
   cursor.execute("""
       INSERT INTO positions (position, skills, description, vacancies)
       VALUES (?, ?, ?, ?)
   """, (request.position, json.dumps(request.skills), request.description, request.vacancies))
   ```

2. ✅ **GET retorna `vacancies`:**
   ```python
   return {
       "id": row["id"],
       "position": row["position"],
       "skills": json.loads(row["skills"]),
       "description": row["description"],
       "vacancies": row["vacancies"] or 0
   }
   ```

3. ➕ **Novo endpoint GET individual `GET /positions/{position_id}`:**
   - Retorna um único cargo por ID

4. ➕ **Novo endpoint PATCH para edição `PATCH /positions/{position_id}`:**
   - Permite atualizar nome, descrição, skills e vacancies de um cargo existente

5. 🔧 **Corrigido endpoint DELETE:**
   - Caminho corrigido de `"/positions/{position_id}"` para `"/positions/{position_id}"` (já estava correto, mas foi verificado)

### Motivo:
- Número de vagas não estava sendo salvo nem exibido
- Usuário pediu feature de **editar cargos** (antes só podia deletar e criar novo)
- Frontend precisava buscar um cargo específico para edição

---

## 🎤 5. `routers/interviews.py`

### Mudanças:
1. ✅ **INSERT agora salva `notes` corretamente:**
   ```python
   cursor.execute("""
       INSERT INTO interviews (name, email, number, notes, transcript, analysis, score, position_id)
       VALUES (?, ?, ?, ?, '', '', '', ?)
   """, (request.name, request.email, request.number, request.notes or '', request.position_id))
   ```

2. ➕ **Novo endpoint PATCH para atualizar notes:**
   ```python
   @router.patch("/{id}/notes")
   def update_interview_notes(id: int, notes_data: NotesUpdateRequest):
       # Atualiza notes de uma entrevista
   ```

3. 🔧 **Corrigido download de áudio:**
   - Path absoluto usando `os.path.join(os.getcwd(), audio_file)`
   - Adicionados headers CORS explícitos: `Access-Control-Allow-Origin: *`

4. 🔧 **Corrigido endpoint DELETE questions:**
   - Caminho alterado de `@router.delete("/{question_id}")` para `@router.delete("/questions/{question_id}")`
   - Resolve conflito de rota com `DELETE /{id}`

5. ✅ **GET interviews agora inclui `notes` no retorno**

### Motivo:
- `notes` não estava sendo salvo no banco (INSERT não incluía)
- Necessário atualizar `notes` após gravação/upload
- Audio player tinha erro 404 (path relativo) e erro CORS
- Endpoint DELETE questions causava conflito de rota com DELETE interview

---

## 🎙️ 6. `routers/interview_processing.py` (MAIOR ARQUIVO COM MUDANÇAS)

### Mudanças Principais:

#### 6.1. Carregamento de Variáveis de Ambiente
- ✅ Adicionado `from dotenv import load_dotenv` e `load_dotenv()`
- ✅ `ASSEMBLYAI_API_KEY` mudado de hardcoded para `os.getenv("ASSEMBLYAI_API_KEY")`
- ✅ `OPENAI_API_KEY` carregado de `.env`

**Motivo:** Código original tinha chave hardcoded que estava desabilitada, causando erro "API key is disabled"

#### 6.2. Correção de Import
- ✅ Mudado `import datetime` para `from datetime import datetime`
- ✅ Corrige erro: `AttributeError: module 'datetime' has no attribute 'now'`

#### 6.3. Transcrição Assíncrona
- ✅ `transcribe_audio_file` refatorada para usar `aai.Transcriber().submit()` assíncrono
- ✅ Polling com `asyncio.sleep(3)` para verificar conclusão
- ✅ Evita timeouts em arquivos de áudio longos

#### 6.4. 🔴 MUDANÇA CRÍTICA: WebSocket com AssemblyAI v3

**Problema Original:**
- Código usava `aai.StreamingClient()` que **não existe** na versão 0.46.0 do AssemblyAI
- Causava erro: `AttributeError: module 'assemblyai' has no attribute 'StreamingClient'`

**Solução Implementada:**
- Conexão direta ao WebSocket da AssemblyAI usando biblioteca `websockets`
- URL atualizada para Universal Streaming v3: `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&encoding=pcm_s16le&speech_model=universal-streaming-multilingual`
- Parâmetros passados na URL (não mais via `session_config`)
- Áudio enviado como binário raw (não mais base64 JSON)
- Mensagens recebidas: `Begin`, `Turn`, `Termination` (novo formato v3)

**Código Original (não funcionava):**
```python
streaming_client = aai.StreamingClient()  # ❌ Não existe
```

**Código Novo:**
```python
streaming_client = await websockets.connect(
    f"wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&encoding=pcm_s16le&speech_model=universal-streaming-multilingual",
    additional_headers={"Authorization": ASSEMBLYAI_API_KEY}
)
```

#### 6.5. Conversão PCM para WAV
- ✅ Adicionada função `convert_pcm_to_wav(pcm_data)`:
  ```python
  def convert_pcm_to_wav(pcm_data):
      # Adiciona header WAV ao raw PCM
      # Permite que players de áudio funcionem corretamente
  ```
- ✅ Conversão executada no `finally` block após gravação

**Motivo:** Áudio raw PCM não funciona em navegadores/players → precisa de header WAV

#### 6.6. Correção de Path de Áudio
- ✅ Linha 352 corrigida: `audio_filename` → `audio_path`
- ✅ Salva caminho completo do arquivo no banco

#### 6.7. Tratamento de Erros e Sincronização
- ✅ Adicionado `stop_event.set()` em `send_audio` quando WebSocket desconecta
- ✅ Fechamento explícito de `streaming_client` em todos os `except` blocks
- ✅ Envio de mensagem `{"type": "Terminate"}` antes de fechar conexão
- ✅ `try/except` ao redor de `streaming_client.close()` para evitar `RuntimeError`

#### 6.8. Salvamento de Transcrição
- ✅ `save_transcript_to_db` agora salva apenas o array `utterances`, não o objeto completo
- ✅ Formato correto para frontend processar

#### 6.9. Timeout na Geração de Análise
- ✅ Adicionado `asyncio.wait_for()` com timeout de 120 segundos (2 minutos)
- ✅ Logs de debug adicionados:
  - `[DEBUG] Iniciando geração de análise para interview {id}`
  - `[DEBUG] Tamanho do prompt: {len(prompt_final)} caracteres`
  - `[DEBUG] Análise gerada com sucesso para interview {id}`
- ✅ Tratamento de `TimeoutError` e outras exceções
- ✅ Retorna HTTP 504 (Gateway Timeout) se exceder 2 minutos

**Motivo:** Análises muito longas podem travar indefinidamente → timeout garante resposta e evita travamentos no frontend

#### 6.10. Fallback de Transcrição
- ✅ Se WebSocket falhar, executa transcrição completa do arquivo salvo
- ✅ Garante que sempre haverá transcrição, mesmo se tempo real falhar

### Estrutura Preservada:
- ✅ Mesmas funções (`send_audio`, `receive_transcripts`, `periodic_gpt_analysis`)
- ✅ Mesmo fluxo (`asyncio.gather` para executar tasks concorrentes)
- ✅ Mesma lógica de save no banco
- ✅ Mesma estrutura de WebSocket handler

---

## 🌐 7. `prompts/prompt_analitico.txt`

### Mudanças:
- ✅ **TODO o prompt traduzido para PORTUGUÊS BRASILEIRO**
- ✅ Adicionada instrução explícita: "IMPORTANTE: Retorne TODOS os textos em PORTUGUÊS BRASILEIRO"
- ✅ Adicionado critério de avaliação: "Compare as habilidades... com os requisitos da vaga (position_data)"
- ✅ Instruções detalhadas sobre como calcular score baseado em requisitos da vaga

### Motivo:
- Análises estavam saindo em inglês
- Scores não consideravam requisitos da vaga → agora compara com `position_data`
- Garante consistência na avaliação de candidatos

---

## 🌐 8. `prompts/prompt_questions.txt`

### Mudanças:
- ✅ **TODO o prompt traduzido para PORTUGUÊS BRASILEIRO**
- ✅ Adicionada instrução explícita: "IMPORTANTE: Gere TODAS as perguntas em PORTUGUÊS BRASILEIRO"

### Motivo:
- Perguntas sugeridas pela IA estavam saindo em inglês

---

## ➕ 9. `routers/global_questions.py` (NOVO ARQUIVO)

### Arquivo Criado:
- ✅ Novo router para gerenciar perguntas gerais e perguntas por cargo

### Endpoints:
1. **POST `/questions`:**
   - Cria pergunta global ou vinculada a um cargo
   - Body: `{ "question": "string", "position_id": int | null }`

2. **GET `/questions`:**
   - Retorna perguntas gerais (`position_id IS NULL`) ou de um cargo específico
   - Query param: `?position_id={id}` (opcional)

3. **DELETE `/questions/{question_id}`:**
   - Deleta uma pergunta global

### Motivo:
- Frontend precisava de sistema para gerenciar perguntas pré-programadas
- Suporte a perguntas gerais (todas as entrevistas) e específicas por cargo

---

## ✅ 10. `main.py`

### Mudanças:
- ✅ **Adicionado import e router de `global_questions`:**
   ```python
   from routers import positions, interviews, interview_processing, global_questions
   # ...
   app.include_router(global_questions.router)
   ```

### Motivo:
- Necessário para registrar endpoints de perguntas globais

---

## 📊 RESUMO EXECUTIVO

| Arquivo | Tipo de Mudança | Impacto | Motivo |
|---------|----------------|---------|--------|
| `requirements.txt` | ➕➖ Dependências | Baixo | Corrigir instalação |
| `models.py` | ➕ Campos | Baixo | Suporte a vacancies/notes |
| `database.py` | ➕ Coluna + Tabela + Migração | Médio | Salvar número de vagas e perguntas globais |
| `positions.py` | ➕ CRUD completo | Médio | Feature de edição |
| `interviews.py` | 🔧 Correções + ➕ PATCH | Médio | Salvar notes e audio |
| `interview_processing.py` | 🔄 **WebSocket reescrito** + Timeout | **Alto** | **StreamingClient não existe** + Prevenir travamentos |
| `prompt_analitico.txt` | 🌐 Tradução + Lógica | Médio | Output em português |
| `prompt_questions.txt` | 🌐 Tradução | Baixo | Output em português |
| `global_questions.py` | ➕ **Novo arquivo** | Médio | Sistema de perguntas pré-programadas |
| `main.py` | ➕ Router | Baixo | Registrar global_questions |

---

## ⚠️ MUDANÇAS "GRANDES"

### 1. `interview_processing.py` - WebSocket

**Por que foi necessário?**

1. ❌ Código original usava `aai.StreamingClient()` que **não existe** na versão 0.46.0 do AssemblyAI
2. ✅ Única solução: conectar **diretamente** ao WebSocket da AssemblyAI
3. ✅ AssemblyAI lançou **Universal Streaming v3** com novo formato de mensagens
4. ✅ Precisava converter PCM → WAV para player funcionar
5. ✅ Fallback garante transcrição mesmo se WebSocket falhar

**Manteve a estrutura original?**
- ✅ Sim! Mesmas funções (`send_audio`, `receive_transcripts`, `periodic_gpt_analysis`)
- ✅ Sim! Mesmo fluxo (`asyncio.gather` para executar tasks concorrentes)
- ✅ Sim! Mesma lógica de save no banco
- ❌ Só mudou: conexão WebSocket (por necessidade técnica)

### 2. `global_questions.py` - Novo Sistema

**Por que foi criado?**
- Frontend precisava gerenciar perguntas pré-programadas
- Suporte a perguntas gerais e específicas por cargo
- Integração com página de perguntas do frontend

---

## 🎯 CONCLUSÃO

### O que foi preservado do código original:
✅ Estrutura geral dos arquivos  
✅ Lógica de negócio principal  
✅ Endpoints existentes (apenas corrigidos)  
✅ Sistema de banco de dados SQLite  
✅ Integração com OpenAI e AssemblyAI (APIs)  
✅ Fluxo assíncrono de processamento  

### O que foi modificado:
🔧 Correções de bugs críticos  
➕ Features solicitadas pelo usuário  
🌐 Tradução para português  
🔄 WebSocket (única mudança estrutural, por necessidade técnica)  
⏱️ Timeouts para prevenir travamentos  
📝 Logs de debug para troubleshooting  

### Princípio seguido:
**"Modificação mínima necessária"** - Cada mudança teve uma justificativa técnica clara:
- Bug que impedia funcionamento
- Feature explicitamente solicitada
- Incompatibilidade de versão de biblioteca
- Prevenção de travamentos e melhorias de UX

---

## 📝 Notas Técnicas

### Timeouts Implementados:
- **Geração de Análise (Backend):** 120 segundos (2 minutos) usando `asyncio.wait_for()`
- **Geração de Análise (Frontend):** 180 segundos (3 minutos) usando `AbortController`
- **Timeout retorna:** HTTP 504 (Gateway Timeout) no backend, erro descritivo no frontend

### Logs de Debug:
- Todos os endpoints críticos agora têm logs `[DEBUG]` e `[ERROR]`
- Facilita troubleshooting em produção

### Compatibilidade:
- Migrações automáticas garantem compatibilidade com bancos existentes
- Código funciona com versão 0.46.0 do AssemblyAI (não requer atualização)

---

**Última atualização:** Documentação completa de todas as mudanças desde o código original.

