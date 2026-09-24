# Pendências conhecidas (pós-merge)

Lista das observações menores levantadas nas revisões da reestruturação (branch `refactor/reestruturacao`).
Nenhuma delas bloqueia o merge: as revisões finais classificaram todas como follow-up.
Os itens bloqueantes já foram corrigidos na própria branch.

## Backend

**Robustez**
- `Pipeline._fail` pode lançar quando a entrevista é apagada durante o processamento (`ObjectDeletedError`): gera traceback extra e "Task exception was never retrieved" na manutenção. Envolver em try/except e logar `task.exception()`.
- Os passos de `maintenance.run_once` não são isolados: um erro em um passo impede o requeue naquela rodada. Um try/except por passo resolve.
- `run_once` carrega linhas inteiras (incluindo JSON de transcrição e análise) e filtra datas em Python. Filtrar no SQL ou usar `load_only`.
- `POST /interviews/{id}/audio` não checa `pipeline.is_running` como o reprocessar faz: um reenvio na janela entre a escrita do status e a liberação do guard é descartado silenciosamente (a manutenção recupera, se estiver ligada).
- Erros da SDK da OpenAI que não sejam `ComparisonError` viram 500 genérico em vez de 502 na comparação (mesmo padrão no analisador).
- Corridas de cadastro e de criação de configurações aparecem como 500 em vez de 409.

**Segurança e privacidade**
- Unicidade de e-mail e usuário é sensível a maiúsculas (`Ana@x.com` e `ana@x.com` coexistem); `LoginIn` não faz `strip` do usuário.
- JWT sem `options={"require": ["exp", "sub"]}`.
- O mesmo segredo assina JWT e URLs de mídia; derivar duas subchaves seria mais limpo.
- Avatar sem verificação de magic bytes e sem `X-Content-Type-Options: nosniff` (SVG já está fora da lista permitida).
- Assinaturas de URL aparecem nos access logs do uvicorn.
- `logger.exception` no pipeline pode incluir trecho da saída do modelo num `ValidationError` da SDK.
- Retenção apaga o áudio, mas transcrição e análise (dados pessoais) permanecem; a exclusão completa só acontece via `DELETE /interviews/{id}`.
- Cadastro é aberto e o espaço é compartilhado pelo time: qualquer conta criada lê os dados de todos os candidatos. Um convite ou lista de permissão resolveria.

**Outros**
- Arquivos órfãos em disco se o commit falhar após salvar o áudio, ou em uploads concorrentes.
- Filtro `status` inválido em `GET /interviews` devolve página vazia em vez de 422.
- TTL de rascunho apaga o `.pcm` antes do commit.
- `Utterance(**u)` lança `TypeError` (e não `AnalysisError`) se a transcrição armazenada tiver chave inesperada.
- Lacunas de teste: 409 por entrevista em processamento, remoção do `.pcm` no reenvio, `schedule`/`loop` da manutenção com o loop ligado.

## Frontend

**Experiência em falhas**
- Erro não-404 persistente no detalhe faz nova tentativa a cada 15s enquanto a página estiver aberta; uma falha só do endpoint de perguntas é engolida sem aviso.
- Um 404 que aparece durante o polling (entrevista apagada em outra aba) mantém os dados antigos na tela.
- Falha de rede no primeiro carregamento mostra "Entrevista não encontrada".
- Não há ErrorBoundary: uma análise malformada derruba a página inteira em vez de um painel.
- `SettingsContext` não trata erro ao buscar as configurações (promessa rejeitada sem `catch`).

**Áudio ao vivo**
- O worklet reamostra de 48 kHz para 16 kHz sem filtro passa-baixa, o que gera aliasing também no WAV usado na transcrição final.
- Encerrar durante uma queda de rede faz só uma tentativa de reconexão; o áudio em buffer pode ser perdido e a entrevista fica em `recording` até a manutenção (10 min).
- Sem teste para o fechamento 4404, o teto de 10s do backoff e o timeout de 15s do encerramento.

**Listas e limites**
- `listPositions()` só busca a primeira página (100 vagas): acima disso, vagas somem dos seletores.
- A busca por nome em Entrevistas filtra só o que já foi carregado (páginas de 100): o backend não tem busca por texto.
- O resumo por vaga (lista de vagas e Início) faz duas listagens por vaga para contar entrevistas e achar a melhor pontuação; com muitas vagas, vale um endpoint de estatística.
- `UploadAudioPage` não valida o tamanho no navegador; o arquivo sobe inteiro até o backend recusar.
- `formatDuration(0)` devolve "N/A" em vez de "0s".
- Duas vulnerabilidades altas do `npm audit` em dependências de desenvolvimento (cadeia do Vite).

## Fase de design — concluída (branches `redesign/frontend` e `redesign/estrutura`)

Tudo o que estava listado aqui foi resolvido pelo redesign. A segunda etapa (`redesign/estrutura`) reorganizou as páginas em torno da vaga, trocou a identidade para papel e tinta com laranja de detalhe e Fraunces + Source Sans 3, e centralizou as rotas em `src/app/paths.js`:

- Cores, fontes, espaçamentos, raios, sombras e movimento vêm de `frontend/src/styles/tokens.css`, com temas claro, escuro e "sistema". `npm run lint:tokens` falha se aparecer cor ou fonte literal fora dele (a lista legada está vazia) e `npm run check:contrast` valida os pares de cor em WCAG AA nos dois temas; os dois rodam no CI.
- Uma abordagem de estilo só: CSS Modules colocalizados. Os únicos CSS globais são `tokens.css` e `base.css`; não há mais classes globais colididas nem `!important` de cor.
- Os 34 `alert()`/`confirm()` viraram toast (`useToast`) e `ConfirmDialog` (`useConfirm`).
- Emojis trocados por ícones; `PauseIcon` em uso no player; ícones herdam `currentColor`.
- Estados `:disabled` em todas as primitivas (`components/ui`); modais sobre o `Modal` acessível.
- Comparar tem CSS próprio e colunas de verdade; pontos fortes e de atenção têm tons próprios.
- O destaque da fala ativa permanece nos silêncios e recentraliza ao avançar o áudio (e o horário de cada fala pula o player para ela).
- Typo "disponíveleis" corrigido.

Ficou de fora, de propósito:

- `eslint-plugin-jsx-a11y` não declara suporte ao ESLint 10 usado aqui; em vez de forçar com `--legacy-peer-deps`, a acessibilidade é verificada pelo axe (`src/test/a11y.test.jsx`) em cada tela principal. Vale adicionar o plugin quando ele suportar ESLint 10.
- Teste visual automatizado (Playwright/Storybook) continua fora do escopo.

## Verificações que dependem de uma pessoa

- Percorrer as telas nos dois temas num navegador, com teclado e em largura de celular (375px), e com `prefers-reduced-motion` ligado.
- Gravar uma entrevista ao vivo pelo microfone de ponta a ponta, incluindo reconexão e duas abas na mesma entrevista.
- Apagar as 18 branches remotas já mergeadas no GitHub.
- Trocar as chaves de API que foram coladas em conversa.
