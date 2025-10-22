import os
from flask import Flask, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv


# Carrega as variáveis de ambiente, especificamente a "OPENAI_API_KEY" do nosso arquivo .env
load_dotenv()

# Inicia o aplicativo Flask
app = Flask(__name__)

# Pega a chave de API do ambiente e inicia o cliente da OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("A variável de ambiente OPENAI_API_KEY não foi definida. Crie o .env.")

client = OpenAI(api_key=api_key)



# Aqui estão os prompts que desenvolvemos, prontos para serem usados.
# Usamos "DADOS_DA_TRANSCRICAO" como um placeholder que será substituído.

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
</transcricao>

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


@app.route('/gerar-resumo', methods=['POST'])


def handle_gerar_resumo():
    """
    Este é o endpoint que o front-end irá chamar.
    Ele espera um JSON com duas chaves:
    {
        "transcricao": "O texto longo da entrevista...",
        "tipo_resumo": "padrao"  // ou "analitico"
    }
    """
    try:
        # Pega os dados enviados pelo front
        dados = request.json
        transcricao = dados.get('transcricao')
        tipo_resumo = dados.get('tipo_resumo', 'padrao') # padrão = default

        if not transcricao:
            return jsonify({"erro": "Nenhuma transcrição foi fornecida no corpo da requisição."}), 400

        # Escolhe qual prompt vamos usar
        if tipo_resumo == 'analitico':
            prompt_template = PROMPT_ANALITICO
        else:
            prompt_template = PROMPT_PADRAO

        # Insere a transcrição do usuário dentro do prompt
        prompt_final = prompt_template.format(DADOS_DA_TRANSCRICAO=transcricao)

        # Envia o prompt final para a API da OpenAI
        print("Enviando requisição para a OpenAI...")
        response = client.chat.completions.create(
            model="gpt-4o-mini", 
            messages=[
                {"role": "user", "content": prompt_final}
            ],
            temperature=0.2
        )

        resumo_gerado = response.choices[0].message.content
        print("Resumo recebido da OpenAI.") 

        return jsonify({"resumo": resumo_gerado})

    except Exception as e:
        print(f"Erro interno no servidor: {e}")
        return jsonify({"erro": str(e)}), 500



if __name__ == '__main__':
    """
    Isso faz com que o servidor Flask rode quando a gente executar
    o script diretamente com 'python app.py'
    """
    print("Iniciando servidor Flask em http://127.0.0.1:5000")
    app.run(debug=True, port=5000)

