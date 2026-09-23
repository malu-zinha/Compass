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
- `listPositions()` só busca a primeira página (100 cargos): acima disso, cargos somem dos seletores.
- `UploadAudioPage` não valida o tamanho no navegador; o arquivo sobe inteiro até o backend recusar.
- `formatDuration(0)` devolve "N/A" em vez de "0s".
- Duas vulnerabilidades altas do `npm audit` em dependências de desenvolvimento (cadeia do Vite).

## Fase de design (mudanças visuais, conscientemente adiadas)

- 81 cores hex diferentes nos CSS e quase nenhum uso de variáveis: falta um `tokens.css`.
- Três abordagens de estilo convivendo (CSS global por página, CSS Modules e estilos inline) e classes globais com o mesmo nome em arquivos diferentes.
- 33 `alert()`/`confirm()` a serem trocados por toast e modal.
- Emojis no lugar de ícones (📊, 💼, ⏸) e `PauseIcon` sem uso.
- `.modal-btn-voltar` sem estilo `:disabled`, `.modal-footer` sem espaçamento entre botões, input de edição do modal sem classe, `.type-card.disabled` sem regra.
- Página Comparar usa grade inline em vez de uma classe `.compare-grid`; rótulos reaproveitam o chip verde de "positivos".
- Destaque da fala ativa some nos silêncios e não recentraliza após avançar o áudio.
- Typo "disponíveleis" no banner do cargo.

## Verificações que dependem de uma pessoa

- Comparar todas as telas com a `main` num navegador (as revisões compararam classes e markup, não pixels).
- Gravar uma entrevista ao vivo pelo microfone de ponta a ponta, incluindo reconexão e duas abas na mesma entrevista.
- Apagar as 18 branches remotas já mergeadas no GitHub.
- Trocar as chaves de API que foram coladas em conversa.
