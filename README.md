# Compass

**Plataforma inteligente de auxílio para entrevistas de emprego**

O Compass é uma solução completa que utiliza Inteligência Artificial para transformar o processo de entrevistas de emprego, oferecendo ferramentas avançadas para entrevistadores organizarem, analisarem e otimizarem suas entrevistas. Cargos, perguntas e entrevistas são compartilhados por todo o time.

---

## Funcionalidades Principais

### 1. Resumo Padronizado de Entrevistas
Geração automática de resumos detalhados e padronizados de todas as entrevistas a partir da transcrição do áudio. Cada resumo inclui:
- **Perguntas e respostas** (P&R) extraídas automaticamente da conversa
- **Pontos positivos e negativos** identificados
- **Experiências e habilidades** citadas pelo candidato
- **Padronização** garantida entre todas as entrevistas

### 2. Análise e Ranqueamento de Candidatos
Sistema inteligente de análise comparativa que permite:
- Definir o **perfil ideal do cargo** e as competências desejadas
- Análise automática de cada entrevista pela IA, com aderência ao perfil ideal
- **Ranqueamento** dos candidatos por cargo e no geral
- Score geral e por subcritério (técnico, comunicação, cultura, experiência)

### 3. Geração de Perguntas Personalizadas
Assistente inteligente que auxilia o entrevistador durante a entrevista:
- **Perguntas padrão** cadastradas antes da entrevista (gerais ou por cargo)
- **Sugestões de novas perguntas** geradas pela IA em tempo real, no intervalo configurado
- **Adaptação de perguntas** existentes conforme o fluxo da conversa
- Marcação de perguntas feitas durante a entrevista

### 4. Comparação de Candidatos
- Seleção de 2 a 3 entrevistas concluídas do **mesmo cargo**
- Página lado a lado com os resumos de cada candidato
- Botão "Gerar parecer da IA", que compara os candidatos e sugere um ranking (o parecer não é salvo)

---

## Como Rodar o Projeto

### Pré-requisitos
- **Python 3.11+**
- **Node.js 20+**
- Chave de API da **OpenAI**
- Chave de API da **AssemblyAI**

### Backend

```bash
cd back
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
```

Preencha `OPENAI_API_KEY` e `ASSEMBLYAI_API_KEY` no `.env`, e gere o `JWT_SECRET` com:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Depois, aplique as migrações e suba o servidor:
```bash
alembic upgrade head
uvicorn app.main:create_app --factory --reload
```

A API estará em `http://localhost:8000`, com a documentação interativa em `http://localhost:8000/docs`.

A API deve rodar como **processo único** (não use `uvicorn --workers N`): o controle de reprocessamento do pipeline e o registro de sessões ao vivo vivem na memória do processo.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O frontend estará disponível em `http://localhost:3000`.

### Primeiro acesso

Não existem credenciais fixas. Crie sua conta pela tela de entrada, em **"Criar conta"**.

### Testes

```bash
cd back && pytest
cd ../frontend && npm test -- --run
```

No frontend, além de `npm run lint` e dos testes, dois portões rodam no CI:

- `npm run lint:tokens` — falha se aparecer cor (hex, `rgb()`, `hsl()`) ou `font-family` literal fora de `src/styles/tokens.css`. Todo estilo usa os tokens do design system.
- `npm run check:contrast` — mede o contraste WCAG de cada par de tokens usado junto, nos temas claro e escuro, e falha abaixo de AA.

O design system (tokens, temas, primitivas em `src/components/ui`) está descrito em `frontend/src/components/README.md`.

---

## Variáveis de Ambiente

### `back/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `OPENAI_API_KEY` | — (obrigatória) | Chave da API da OpenAI, usada para gerar perguntas, análises e comparações |
| `ASSEMBLYAI_API_KEY` | — (obrigatória) | Chave da API da AssemblyAI, usada na transcrição do áudio |
| `JWT_SECRET` | — (obrigatória) | Segredo usado para assinar os tokens JWT; gere com o comando do `.env.example` |
| `JWT_EXPIRES_MINUTES` | `720` | Validade do token JWT, em minutos |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Origens autorizadas pelo CORS |
| `DATA_DIR` | `./data` | Diretório onde ficam o banco SQLite, os áudios e os avatares |
| `MAX_UPLOAD_MB` | `200` | Tamanho máximo do upload de áudio de entrevista, em MB |
| `MAX_AVATAR_MB` | `2` | Tamanho máximo do avatar do usuário, em MB |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo da OpenAI usado para perguntas, análise e comparação |
| `OPENAI_TIMEOUT_SECONDS` | `120` | Timeout das chamadas à OpenAI, em segundos |
| `ASSEMBLYAI_STREAMING_MODEL` | `universal-streaming-multilingual` | Modelo de transcrição em tempo real (AssemblyAI Streaming v3) |
| `SIGNED_URL_TTL_SECONDS` | `3600` | Validade da URL assinada de áudio/avatar, em segundos |
| `AUDIO_RETENTION_DAYS` | `0` | Dias de retenção do áudio após a entrevista concluída (`0` = sem exclusão automática) |
| `DRAFT_TTL_HOURS` | `24` | Horas até apagar rascunhos de entrevista sem áudio |
| `LIVE_ABANDON_MINUTES` | `10` | Minutos sem atividade para considerar uma gravação ao vivo abandonada |
| `MAINTENANCE_INTERVAL_SECONDS` | `300` | Intervalo entre execuções da rotina de manutenção, em segundos |
| `MAINTENANCE_ENABLED` | `true` | Liga/desliga a rotina de manutenção periódica |
| `LOG_LEVEL` | `INFO` | Nível de log do backend |

### `frontend/.env`

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | URL base da API do backend |
| `VITE_WS_URL` | `ws://localhost:8000` | URL base do WebSocket do backend (entrevista ao vivo) |
| `VITE_MAX_UPLOAD_MB` | `200` | Limite de upload de áudio checado no navegador; mantenha igual ao `MAX_UPLOAD_MB` do backend |

---

## Arquitetura

### Estrutura de pastas

```
back/
├── app/
│   ├── api/routes/     # endpoints FastAPI: auth, users, positions, questions, interviews, live, comparisons, health
│   ├── core/            # config, segurança (JWT), erros, logging, URL assinada, manutenção periódica
│   ├── db/               # models SQLAlchemy, base e sessão
│   ├── schemas/          # schemas Pydantic de request/response
│   ├── services/         # regras de negócio (entrevistas, análise, comparação, transcrição, pipeline, storage, live/)
│   ├── prompts/          # prompts de IA (analysis.txt, comparison.txt, suggestions.txt)
│   └── main.py           # create_app()
├── alembic/               # migrações do banco
├── scripts/               # reset_dev_data.py
├── tests/                 # testes com pytest
└── .env.example

frontend/
└── src/
    ├── api/               # clientes HTTP por recurso (auth, users, positions, questions, interviews, comparisons)
    ├── app/                # rotas (App.jsx), layout autenticado e rota protegida
    ├── auth/               # AuthContext e SettingsContext
    ├── components/         # componentes comuns, ícones e layout (Header, Sidebar)
    ├── features/           # páginas por domínio (auth, home, landing, interviews/{new,live,detail,results}, positions, questions, profile, settings)
    ├── lib/                # utilitários (formatação, transcript)
    └── test/               # setup de testes
```

### Fluxo de status da entrevista

```
draft → recording (ao vivo) → uploaded → transcribing → analyzing → done
                                                                   ↘ error
```

O front faz polling enquanto o status estiver em `uploaded`, `transcribing`, `analyzing` ou `recording`. Em `error`, `error_message` traz uma mensagem amigável e o botão "Tentar novamente".

### Protocolo do WebSocket (entrevista ao vivo)

`WS {VITE_WS_URL}/interviews/{id}/live`

1. O cliente envia, em até 5s, `{"type":"auth","token":"<jwt>"}` (o token nunca vai na URL).
2. O servidor responde `{"type":"ready"}`. A partir daí, o cliente envia frames binários PCM16 LE, 16 kHz, mono (~100 ms cada).
3. O servidor envia:
   - `{"type":"transcript","turn_id":N,"text":"...","is_final":bool}` — o texto substitui o turno inteiro;
   - `{"type":"suggestions","questions":[...]}`;
   - `{"type":"error","message":"..."}` — não encerra a sessão;
   - `{"type":"session_ended"}` — após o `{"type":"stop"}` do cliente, quando o áudio já foi finalizado.
4. Códigos de fechamento: `4401` token inválido (deslogar), `4404` entrevista inexistente, `4409` entrevista fora de draft/recording, `4000` substituída por outra conexão (não reconectar).
5. Reconexões anexam ao mesmo arquivo de áudio; desconectar sem `stop` mantém `recording` até a manutenção finalizar a gravação por inatividade.

---

## Privacidade e LGPD

- O **consentimento de gravação** do candidato é obrigatório para criar uma entrevista.
- **Excluir uma entrevista apaga o áudio** gravado junto com o registro.
- **Excluir um cargo** apaga as entrevistas do cargo, seus áudios e suas perguntas.
- A retenção do áudio é configurável por `AUDIO_RETENTION_DAYS` (dias após a entrevista concluída; `0` desativa a exclusão automática).

---

## Manutenção

Para apagar todos os dados locais de desenvolvimento (banco, áudios e avatares) e recriar o schema do zero:

```bash
cd back
python -m scripts.reset_dev_data
```

---

## Tecnologias Utilizadas

- **Frontend:** React, React Router, Vite, Vitest + Testing Library
- **Backend:** FastAPI, Python 3.11+
- **Banco de Dados:** SQLite, SQLAlchemy 2 e Alembic (migrações)
- **IA/ML:** OpenAI GPT (perguntas, análise, comparação), AssemblyAI Streaming v3 (transcrição em tempo real)
- **Comunicação:** WebSocket (entrevista ao vivo)
- **Autenticação:** JWT
