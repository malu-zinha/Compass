#!/bin/bash

# Script de setup para o projeto COMPASS
echo "🚀 Configurando o projeto COMPASS..."

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Por favor, instale o Python3 primeiro."
    exit 1
fi

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Criar ambiente virtual Python
echo "📦 Criando ambiente virtual Python..."
python3 -m venv venv

# Ativar ambiente virtual e instalar dependências
echo "📥 Instalando dependências do backend..."
source venv/bin/activate
pip install --upgrade pip
pip install -r back/requirements.txt

# Instalar dependências do frontend
echo "📥 Instalando dependências do frontend..."
cd frontend
npm install
cd ..

# Criar arquivo .env se não existir
if [ ! -f back/.env ]; then
    echo "🔑 Criando arquivo .env..."
    cat > back/.env << 'EOF'
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_PATH=./interviews.db

# Server Configuration
PORT=8000
HOST=localhost

# CORS Configuration
FRONTEND_URL=http://localhost:3000
EOF
    echo "⚠️  IMPORTANTE: Configure sua chave OpenAI no arquivo back/.env"
fi

echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure sua chave OpenAI no arquivo back/.env"
echo "2. Execute: source venv/bin/activate && cd back && uvicorn main:app --reload"
echo "3. Em outro terminal: cd frontend && npm start"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
