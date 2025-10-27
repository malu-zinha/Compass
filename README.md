# 🧭 COMPASS - Plataforma de Auxílio para Entrevistas

Plataforma inteligente para auxiliar entrevistas de emprego com 3 features principais:

## ✨ Features

1. **Resumo Padronizado**: Gera resumos detalhados das entrevistas usando IA, mostrando perguntas, respostas, pontos positivos/negativos do candidato
2. **Análise de Candidatos**: Sistema que ranqueia candidatos baseado no perfil ideal definido pelo entrevistador
3. **Perguntas Personalizadas**: Sugere perguntas personalizadas durante a entrevista baseadas nas respostas do candidato

## 🚀 Setup Rápido

### Opção 1: Script Automático
```bash
# Clone o repositório
git clone <seu-repositorio>
cd Compass

# Execute o script de setup
./setup.sh
```

### Opção 2: Setup Manual

1. **Instalar dependências Python:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r back/requirements.txt
```

2. **Instalar dependências Node.js:**
```bash
cd frontend
npm install
cd ..
```

3. **Configurar variáveis de ambiente:**
```bash
# Copie o arquivo .env.example para .env
cp back/.env.example back/.env

# Edite o arquivo .env e configure sua chave OpenAI
nano back/.env
```

## 🎯 Como Executar

### Terminal 1 - Backend:
```bash
source venv/bin/activate
cd back
uvicorn main:app --reload
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentação API**: http://localhost:8000/docs

## 🔑 Configuração da API OpenAI

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave secreta
3. Cole no arquivo `back/.env` substituindo `your_openai_api_key_here`

## 📁 Estrutura do Projeto

```
Compass/
├── back/                 # Backend (FastAPI)
│   ├── main.py          # API principal
│   ├── prompts/         # Prompts para IA
│   ├── uploads/         # Arquivos de áudio (criado automaticamente)
│   └── .env            # Variáveis de ambiente
├── frontend/            # Frontend (React)
│   └── src/
└── setup.sh            # Script de configuração automática
```

## ✅ Funcionalidades Automáticas

- ✅ Pasta `uploads` criada automaticamente
- ✅ Banco de dados SQLite inicializado automaticamente
- ✅ CORS configurado para desenvolvimento
- ✅ Hot reload ativado para desenvolvimento

## 🛠️ Tecnologias

- **Backend**: FastAPI, SQLite, OpenAI API
- **Frontend**: React, JavaScript
- **IA**: OpenAI GPT + Whisper
