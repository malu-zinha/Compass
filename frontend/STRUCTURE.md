# 📁 Estrutura do Projeto - Frontend

Organização limpa e modular do código frontend.

## 🎯 Estrutura de Componentes

```
src/
├── components/              # Componentes reutilizáveis
│   ├── layout/             # Componentes de layout
│   │   ├── Header.js       # Cabeçalho com título e botão de ação
│   │   ├── Header.css
│   │   ├── Sidebar.js      # Barra lateral de navegação
│   │   ├── Sidebar.css
│   │   └── index.js        # Exportação centralizada
│   │
│   ├── common/             # Componentes comuns
│   │   ├── InfoModal.js    # Modal de informações
│   │   ├── InfoModal.css
│   │   └── index.js
│   │
│   ├── icons/              # 24 ícones SVG
│   │   ├── index.js        # Exportação centralizada
│   │   └── [IconName].js   # Componentes de ícones
│   │
│   ├── index.js            # Exportação geral de todos os componentes
│   └── README.md           # Documentação dos componentes
│
├── pages/                  # Páginas da aplicação
│   ├── LandingPage.js      # Página inicial (marketing)
│   ├── AuthScreen.js       # Login/Registro
│   ├── HomePage.js         # Dashboard principal
│   ├── ResultsPage.js      # Lista de entrevistas
│   ├── InterviewDetailPage.js  # Detalhes da entrevista
│   ├── RecordPage.js       # Gravação de entrevista
│   ├── NewInterviewpage.js # Nova entrevista
│   ├── JobsPage.js         # Gerenciamento de cargos
│   ├── JobEditorPage.js    # Criar/editar cargo
│   ├── QuestionsPage.js    # Gerenciamento de perguntas
│   ├── ProfilePage.js      # Perfil do usuário
│   ├── SettingsPage.js     # Configurações
│   └── [PageName].css      # Estilos de cada página
│
├── styles/                 # Estilos globais e módulos CSS
│   ├── auth.module.css
│   ├── questions.module.css
│   ├── pages.module.css
│   └── loadFonts.js
│
├── assets/                 # Recursos estáticos
│   └── icons/
│       ├── fonts/
│       │   └── CoolveticaRg.otf
│       └── image 15.svg    # Logo
│
└── fonts/                  # Fontes do projeto
    └── coolvetica.otf

```

## 📦 Como Importar Componentes

### Importação Otimizada (Recomendado)
```javascript
// Layout
import { Header, Sidebar } from '../components/layout';

// Common
import { InfoModal } from '../components/common';

// Icons
import { CheckIcon, ThumbsUpIcon, HomeIcon } from '../components/icons';
```

### Importação Geral
```javascript
// Tudo de uma vez
import { Header, Sidebar, InfoModal, CheckIcon } from '../components';
```

## 🎨 Padrão de Design

- **Layout**: Header fixo + Sidebar + Conteúdo
- **Cores**: Roxo (#371C68), Laranja (#EC7840), Azul (#D2EAFF)
- **Fonte**: Coolvetica (títulos) + Inter (corpo)
- **Espaçamento**: 1rem base, múltiplos de 0.5rem

## 🧹 Limpeza Realizada

✅ Componentes organizados em subpastas (layout, common, icons)  
✅ Arquivos de exportação (index.js) criados  
✅ SVGs não utilizados removidos  
✅ Importações atualizadas em todas as páginas  
✅ Documentação (README.md) criada  
✅ Sem arquivos duplicados ou extras

