# Guia: Transcrição em Tempo Real - IMPLEMENTADO ✅

## Status
✅ **TRANSCRIÇÃO EM TEMPO REAL JÁ ESTÁ IMPLEMENTADA!**

O código foi atualizado para usar a **API WebSocket direta do AssemblyAI** para transcrição em tempo real.

## Como Funciona

### 1. Conexão com AssemblyAI Realtime API
- O backend conecta ao WebSocket do AssemblyAI: `wss://api.assemblyai.com/v2/realtime/ws`
- Envia configuração de transcrição (português, 2 speakers)
- Recebe áudio do frontend e repassa para AssemblyAI em tempo real

### 2. Fluxo de Dados
```
Frontend → WebSocket → Backend → AssemblyAI Realtime API
                ↓                        ↓
         Salva áudio local      Transcrição em tempo real
                ↓                        ↓
         Banco de dados    ←  Transcrições parciais/finais
```

### 3. Recursos Implementados
- ✅ Transcrição em tempo real (latência ~300ms)
- ✅ Transcrições parciais (enquanto fala)
- ✅ Transcrições finais (quando completa)
- ✅ Detecção de speakers (2 pessoas)
- ✅ Fallback: se não conectar ao AssemblyAI, faz transcrição ao final
- ✅ Geração de perguntas com GPT baseada na transcrição

## Requisitos

### 1. Chave de API do AssemblyAI
Certifique-se de que a chave está no arquivo `.env`:
```
ASSEMBLYAI_API_KEY=sua_chave_aqui
```

### 2. Biblioteca `websockets`
Já está incluída no código. Se precisar instalar:
```bash
pip install websockets
```

### 3. Formato de Áudio
O frontend deve enviar áudio em:
- **Sample Rate**: 16000 Hz
- **Formato**: PCM (raw audio bytes)
- **Canais**: Mono

## Testando

1. **Inicie o backend**:
   ```bash
   cd "/Users/iza/Desktop/compass rep/Compass/back"
   source venv/bin/activate
   python -m uvicorn main:app --reload
   ```

2. **Inicie uma entrevista ao vivo** no frontend

3. **Verifique os logs**:
   - `[DEBUG] Connected to AssemblyAI Realtime API` = sucesso
   - `[WARNING] Could not connect` = fallback para transcrição ao final

## Troubleshooting

### Problema: "Could not connect to AssemblyAI Realtime"
**Soluções**:
1. Verifique se a chave de API está correta no `.env`
2. Verifique sua conexão com a internet
3. Verifique se sua conta AssemblyAI tem créditos/disponível
4. O sistema fará fallback automático para transcrição ao final

### Problema: Transcrições não aparecem
**Soluções**:
1. Verifique o console do backend para erros
2. Verifique se o áudio está sendo enviado corretamente do frontend
3. Verifique o formato do áudio (deve ser 16kHz, mono, PCM)

## Notas Importantes

- **Latência**: ~300ms (muito rápido!)
- **Limite gratuito**: 5 sessões por minuto na conta gratuita
- **Qualidade**: Transcrições em português brasileiro com alta precisão
- **Speakers**: Detecta automaticamente 2 pessoas (entrevistador e candidato)

## Próximos Passos (Opcional)

Se quiser melhorar ainda mais:
1. Adicionar tratamento de erros mais robusto
2. Adicionar métricas de latência
3. Implementar reconexão automática se a conexão cair
4. Adicionar buffer de áudio para melhor qualidade

