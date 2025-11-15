# Compass

**Plataforma inteligente de auxílio para entrevistas de emprego**

O Compass é uma solução completa que utiliza Inteligência Artificial para transformar o processo de entrevistas de emprego, oferecendo ferramentas avançadas para entrevistadores organizarem, analisarem e otimizarem suas entrevistas.

---

## Funcionalidades Principais

### 1. Resumo Padronizado de Entrevistas
Geração automática de resumos detalhados e padronizados de todas as entrevistas através da transcrição do áudio em tempo real. Cada resumo inclui:
- **Perguntas** realizadas durante a entrevista
- **Respostas** completas dos candidatos
- **Pontos positivos e negativos** identificados
- **Análise completa** de tudo que foi discutido
- **Padronização** garantida entre todas as entrevistas

### 2. Análise e Ranqueamento de Candidatos
Sistema inteligente de análise comparativa que permite:
- Definir o **perfil ideal** do candidato com suas próprias palavras
- Análise automática de cada entrevista pela IA
- **Ranqueamento** dos candidatos que mais se encaixam no perfil desejado
- Comparação objetiva entre múltiplos candidatos

### 3. Geração de Perguntas Personalizadas
Assistente inteligente que auxilia o entrevistador durante a entrevista:
- **Perguntas padrão** configuradas antes da entrevista
- **Sugestões de novas perguntas** baseadas nas respostas do candidato em tempo real
- **Adaptação de perguntas** existentes conforme o fluxo da conversa
- Suporte contínuo para manter a entrevista relevante e produtiva

---

## Como Rodar o Projeto

### Pré-requisitos
- **Node.js** (v14 ou superior) e **npm**
- **Python** (v3.8 ou superior)
- **Chave de API do AssemblyAI** (para transcrição de áudio)

---

### Frontend

1. **Navegue até a pasta do frontend:**
   ```bash
   cd frontend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```

   O frontend estará disponível em `http://localhost:3000`

---

### Backend

1. **Navegue até a pasta do backend:**
   ```bash
   cd back
   ```

2. **Crie e ative um ambiente virtual (recomendado):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   ```

3. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure a chave da API do AssemblyAI e da OPENAI:**
   
   Crie um arquivo `.env` na pasta `back/` com:
   ```
   ASSEMBLYAI_API_KEY=sua_chave_aqui
   OPENAI_API_KEY=sua_chave_aqui
   ```

5. **Inicie o servidor:**
   ```bash
   python -m uvicorn main:app --reload
   ```

   O backend estará disponível em `http://localhost:8000`
   
   Documentação da API: `http://localhost:8000/docs`

6. **Realize o login com os seguintes dados:**
  
   - usuário: entrevistador
   - senha: trilha

---


## Tecnologias Utilizadas

- **Frontend:** React, React Router
- **Backend:** FastAPI, Python
- **Banco de Dados:** SQLite
- **IA/ML:** OpenAI GPT, AssemblyAI (transcrição)
- **Comunicação:** WebSocket (transcrição em tempo real)

---

## Notas

- O banco de dados SQLite é criado automaticamente na primeira execução
- A transcrição em tempo real requer conexão com a API do AssemblyAI
- Certifique-se de que o backend está rodando antes de iniciar o frontend
