import os
from openai import AsyncOpenAI 
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv


load_dotenv()

app = FastAPI(
    title="API de Resumos de Entrevistas",
    description="Uma API para gerar resumos de transcrições usando o OpenAI GPT.",
    version="1.0.0"
)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("A variável de ambiente OPENAI_API_KEY não foi definida. Verifique o .env.")

client = AsyncOpenAI(api_key=api_key)


PROMPT_PADRAO = """
Você é um assistente de IA especializado em processar transcrições de entrevistas e reuniões. Sua tarefa é ler a transcrição fornecida e gerar um resumo estruturado e conciso.

**Instruções:**
1.  Leia atentamente o texto dentro das tags <transcricao>.
2.  Não adicione nenhuma informação que não esteja na transcrição.
3.  Seja objetivo e direto.
4.  Gere a saída exatamente no formato Markdown solicitado abaixo.

**Transcrição de Entrada:**
<transcricao>
{DADOS_DA_TRANSCRICAO}
</transcricao>

**Formato de Saída Obrigatório:**

---

### Título
(Gere um título curto e descritivo que resuma o tema central da entrevista.)

### Participantes
* **[Nome]** - [Cargo/Contexto, se mencionado]
(Liste os participantes se forem claramente identificados.)

### Resumo Executivo
(Um parágrafo de 2-3 frases resumindo o propósito e a conclusão principal da conversa.)

### Pontos-Chave
(Use bullet points para listar os principais tópicos discutidos, decisões tomadas e insights mais importantes.)
* Ponto 1
* Ponto 2

### Itens de Ação
(Liste todas as tarefas ou pendências que foram atribuídas ou mencionadas.)
* **[Ação]** - (Responsável: [Nome/Equipe, se mencionado])
* (Se nenhuma ação for mencionada, escreva "Nenhum item de ação foi identificado.")
"""

PROMPT_ANALITICO = """
Você é um analista de IA sênior. Sua função é analisar a transcrição de uma entrevista para extrair não apenas os fatos, mas também os principais insights, sentimentos e pontos de fricção.

**Instruções:**
1.  Analise a transcrição dentro das tags <transcricao>.
2.  Concentre-se em identificar o "porquê" por trás das declarações do entrevistado.
3.  Gere a saída estritamente no formato Markdown abaixo.

**Transcrição de Entrada:**
<transcricao>
{DADOS_DA_TRANSCRICAO}
</transcricao

**Formato de Saída Analítico Obrigatório:**

---

### Título da Análise
(Gere um título focado no principal insight obtido.)

### Contexto da Entrevista
* **Tipo:** (Ex: Pesquisa de Usuário, Feedback de Produto)
* **Entrevistador:** [Nome, se conhecido]
* **Entrevistado:** [Nome ou Perfil, se conhecido]

### Objetivo Principal
(Uma frase descrevendo o que a entrevista buscava descobrir.)

### Insights Principais (O "Porquê")
(Em bullet points, liste as descobertas mais profundas.)
* **[Insight 1]:** (Ex: Usuários sentem-se frustrados com o processo de login.)
* **[Insight 2]:** (Ex: A funcionalidade "X" é valorizada, mas não pela razão que esperávamos.)

### Pontos de Fricção / Dores
(Liste as reclamações específicas, problemas ou feedback negativo mencionados.)
* [Problema 1]

### Citações de Destaque
(Copie 1-2 frases exatas do entrevistado que melhor encapsulam o sentimento.)
* > "[Citação]"

### Ações Recomendadas
(Com base na análise, quais são os próximos passos sugeridos?)
* (Ex: Investigar a fundo o fluxo de recuperação de senha.)
"""

class ResumoRequest(BaseModel):
    transcricao: str
    tipo_resumo: str = 'padrao'

class ResumoResponse(BaseModel):
    resumo: str

@app.post("/gerar-resumo", response_model=ResumoResponse)
async def criar_resumo(request_data: ResumoRequest):

    if request_data.tipo_resumo == 'analitico':
        prompt_template = PROMPT_ANALITICO
    else:
        prompt_template = PROMPT_PADRAO

        prompt_final = prompt_template.format(DADOS_DA_TRANSCRICAO=request_data.transcricao)
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": prompt_final}
            ],
            temperature=0.2
        )
        
        resumo_gerado = response.choices[0].message.content
        
        return ResumoResponse(resumo=resumo_gerado)
