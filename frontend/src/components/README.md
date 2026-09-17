# Componentes

Estrutura organizada dos componentes reutilizáveis do projeto.

## 📁 Estrutura

```
components/
├── layout/           # Componentes de layout (Header, Sidebar)
├── common/           # Componentes comuns reutilizáveis (InfoModal)
├── icons/            # Todos os ícones SVG
└── index.js          # Exportação centralizada
```

## 🎯 Como Usar

### Importação Direta
```javascript
import { Header, Sidebar } from '../components/layout';
import { InfoModal } from '../components/common';
import { CheckIcon, UserIcon } from '../components/icons';
```

### Importação Geral
```javascript
import { Header, Sidebar, InfoModal, CheckIcon } from '../components';
```

## 📦 Componentes Disponíveis

### Layout
- **Header** - Cabeçalho com título e botão de ação
- **Sidebar** - Barra lateral de navegação

### Common
- **InfoModal** - Modal de informações

### Icons
Todos os ícones SVG do projeto estão disponíveis em `components/icons/`:
- BriefcaseIcon, CalendarIcon, ChartIcon, CheckIcon
- ChevronDownIcon, ChevronRightIcon, ClockIcon, CompareIcon
- FileTextIcon, HomeIcon, InfoIcon
- InterviewsIcon, JobsIcon, LogoutIcon, MenuIcon
- MicrophoneIcon, PauseIcon, PlayIcon
- PlusIcon, QuestionsIcon, SettingsIcon
- UserIcon, VolumeIcon

