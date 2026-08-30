# AZ-104 Practice Exam Portal

Portal local de simulados para a certificação **Microsoft Azure Administrator (AZ-104)**, com questões
originais em português do Brasil, modo prova cronometrada, modo treino, diagnóstico de lacunas,
histórico de desempenho e um banco de questões pesquisável/importável.

Roda 100% localmente, sem backend, autenticação ou serviços pagos. Todo o progresso é salvo no
`localStorage` do navegador.

> Este projeto **não é afiliado à Microsoft** e **não contém questões reais de exame**. As questões
> são originais, escritas com base em conceitos do conteúdo oficial (Microsoft Learn) para fins de
> estudo.

## Objetivo

Servir como ferramenta de preparação intensiva para o exame AZ-104, cobrindo os cinco domínios
oficiais:

1. **Identity and Governance** — Manage Azure identities and governance
2. **Storage** — Implement and manage storage
3. **Compute** — Deploy and manage Azure compute resources
4. **Networking** — Implement and manage virtual networking
5. **Monitoring** — Monitor and maintain Azure resources

## Instalação

Pré-requisito: Node.js 18+ (ou superior) e npm.

```sh
npm install
```

## Execução (desenvolvimento)

```sh
npm run dev
```

Abra o endereço exibido no terminal (por padrão `http://localhost:8080`).

## Build de produção

```sh
npm run build
npm run preview   # opcional: serve o build de produção localmente
```

## Lint / formatação

```sh
npm run lint
npm run format
```

## Arquitetura

- **React 19 + TypeScript**
- **Vite** como build tool, com **TanStack Start** (SSR) e **TanStack Router** (roteamento por
  arquivo, em `src/routes`)
- **Tailwind CSS 4** + componentes shadcn/ui (`src/components/ui`)
- **Dataset local em JSON** (`src/data/questions.json`) — nenhum banco de dados externo
- **`localStorage`** para histórico, erros, questões importadas e preferência de tema

Não há backend próprio além do necessário para o SSR do TanStack Start (`src/server.ts`,
`src/start.ts`), não há autenticação e não há chamadas a APIs pagas.

## Estrutura de diretórios

```
src/
  components/
    AppShell.tsx        Layout, navegação e alternância de tema
    Bar.tsx              Barras de progresso/score
    QuestionView.tsx      Renderização de questões (todos os tipos) e explicação
    ui/                  Componentes shadcn/ui
  data/
    questions.json        Banco de questões (dataset local)
    question-schema.json  JSON Schema usado para validar o formato das questões
  lib/
    domains.ts            Domínios oficiais, pesos, labels e traduções
    exam.ts                Seleção/embaralhamento de questões, correção, formatação
    questions.ts            Acesso ao banco (base + importadas) e validação de importação
    storage.ts              Leitura/escrita no localStorage (histórico, erros, tema, importadas)
    types.ts                Tipos TypeScript compartilhados
  routes/
    index.tsx              Dashboard / painel de controle
    exam.tsx                Sessão de prova (simulado, treino, domínio, erros, diagnóstico)
    historico.tsx            Histórico e progresso
    erros.tsx                 Minhas questões erradas
    banco.tsx                  Banco de Questões (pesquisa, filtros, importar/exportar)
```

## Modos de estudo

| Modo | Descrição |
|---|---|
| **Simulado** | 20/40/60/100 questões, cronometrado, balanceado entre os cinco domínios |
| **Treino** | Mostra resposta e explicação imediatamente após responder cada questão |
| **Domínio** | Foca em um único domínio, com a quantidade de questões escolhida |
| **Meus erros** | Refaz apenas as questões já erradas anteriormente |
| **Diagnóstico** | 25 questões balanceadas; ao final mostra domínio mais forte/fraco e tópicos críticos |

Ao final de qualquer sessão: score, percentual, acertos, erros, não respondidas, tempo total, tempo
médio por questão e desempenho por domínio/tópico. Um resultado único nunca é apresentado como
garantia de aprovação — apenas como indicador ("Ready" / "Needs Review").

## Simulado V2 (Exam Sandbox)

Além do Simulado clássico (`/exam`), a página **Exam Sandbox** (`/exam-sandbox`, acessível pelo
card "Simulado V2" no painel) oferece uma experiência mais próxima dos padrões de interação do
Microsoft Certification Exam Sandbox oficial — sem reproduzir seu conteúdo ou identidade visual.

Formatos de questão suportados, cada um com seu próprio componente de resposta:

| Tipo (`type`) | Interação |
|---|---|
| `multiple-choice`, `multiple-response`, `yes-no`, `matching`, `scenario` | Já existentes na V1 |
| `ordering` (Build List) | Reordenar itens arrastando (drag nativo) ou pelas setas ↑/↓ |
| `drag-drop` | Arrastar itens até categorias/áreas de destino (ou clicar no item e depois na categoria) |
| `hot-area` | Seleção de uma ou mais "regiões" em grade — aproximação funcional do Hot Area oficial (não há diagrama de imagem real para mapear cliques) |
| `case-study` (via `caseStudyId`) | Não é um `type` próprio: qualquer questão pode referenciar um Case Study de `case-studies.json`, exibido em um painel lateral consultável (Visão Geral / Requisitos / Ambiente) enquanto o usuário responde |
| `lab-simulation` | Cenário + requisitos + lista de tarefas de configuração avaliadas em conjunto, sem terminal ou portal simulado |

A configuração do Simulado V2 (na própria página) permite escolher quantidade de questões avulsas,
duração, domínios, dificuldade, quais tipos de questão avulsa incluir, e se o Case Study e o Lab
Simulation entram na sessão. A seleção aleatória, balanceamento por domínio e persistência de
histórico/erros reaproveitam o mesmo motor (`src/lib/exam.ts`) do Simulado V1.

O dataset inclui 7 questões de demonstração para a V2 (IDs `DEMO-0001` a `DEMO-0007`, tópico
prefixado com "Demo V2"), usadas apenas para validar o engine de cada formato — **não contam** para
a meta de 300+ questões originais da AZ-104 e ficam de fora da seleção do Simulado V1 (exceto
`drag-drop`/`hot-area`, que também funcionam normalmente lá). Novos lotes de questões para qualquer
tipo podem ser adicionados em `questions.json` ou importados via `/banco`, seguindo o schema abaixo.

## Formato das questões

Cada questão em `src/data/questions.json` segue o schema definido em
`src/data/question-schema.json`:

```json
{
  "id": "AZ104-0001",
  "domain": "Identity and Governance",
  "topic": "Microsoft Entra ID",
  "difficulty": "medium",
  "type": "multiple-choice",
  "question": "Texto da questão (cenário).\nUma segunda linha opcional vira um parágrafo de apoio.",
  "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
  "correctAnswer": 0,
  "explanation": "Explicação técnica da resposta correta.",
  "reference": "Microsoft Learn",
  "referenceUrl": "https://learn.microsoft.com/..."
}
```

Campos:

- `domain`: um de `Identity and Governance`, `Storage`, `Compute`, `Networking`, `Monitoring`.
- `difficulty`: `easy`, `medium` ou `hard`.
- `type`: `multiple-choice`, `multiple-response`, `yes-no`, `matching`, `ordering`, `scenario`,
  `drag-drop`, `hot-area` ou `lab-simulation` (`scenario` e `hot-area` reaproveitam o formato padrão
  de `options`/`correctAnswer`, apenas com renderização própria).
- `correctAnswer`: um índice (`number`) para questões de resposta única, ou uma lista de índices
  (`number[]`) para `multiple-response`, `ordering` e `hot-area` multisseleção (nesse caso, a ordem
  correta dos índices de `options`). Não é usado por `drag-drop` nem `lab-simulation`.
- `pairs`: obrigatório apenas para `type: "matching"` — lista de `{ "left": "...", "right": "..." }`;
  `correctAnswer` deve ser a lista de índices corretos de `options` (as opções do lado direito) na
  mesma ordem de `pairs`.
- `dragDrop`: obrigatório apenas para `type: "drag-drop"` — `{ categories: string[], items: [{ id,
  label, correctCategory }] }`, onde `correctCategory` é o índice em `categories`.
- `labConfig`: obrigatório apenas para `type: "lab-simulation"` — `{ scenario, requirements: string[],
  tasks: [{ id, label, options: string[], correctOption }] }`. A questão é considerada correta apenas
  se todas as tarefas forem respondidas corretamente.
- `caseStudyId`: opcional, em qualquer `type` — associa a questão a um Case Study definido em
  `src/data/case-studies.json` (`{ id, title, context, requirements, environment, questionIds }`).
  Questões com `caseStudyId` ficam de fora da seleção do Simulado V1 e só aparecem agrupadas ao seu
  Case Study no Simulado V2.
- `referenceUrl`: opcional; quando presente, habilita o botão **"Ver referência"**, que abre a
  documentação em uma nova aba.

## Como adicionar novas questões

1. Edite diretamente `src/data/questions.json` seguindo o formato acima (IDs únicos, sequenciais por
   convenção: `AZ104-XXXX`), **ou**
2. Use a página **Banco de Questões** (`/banco`) → **Importar JSON**, enviando um arquivo `.json`
   contendo um array de questões no mesmo formato. As questões importadas ficam salvas no
   `localStorage` (não alteram `questions.json`) e passam a compor o banco junto com as questões
   originais.

## Importação / exportação

Na página **Banco de Questões**:

- **Importar JSON**: valida o arquivo contra o schema antes de aceitar (mostra os erros encontrados
  se o arquivo for inválido); questões com um `id` que já existe no dataset base são ignoradas para
  evitar duplicidade.
- **Exportar tudo**: baixa um `.json` com o banco completo (questões originais + importadas) — útil
  para backup ou para editar em lote e reimportar depois.
- **Remover importadas**: limpa apenas as questões importadas pelo usuário, sem afetar o dataset
  original.

## Armazenamento local

Tudo é mantido em `localStorage`, sob os prefixos:

- `az104:history` — histórico de sessões (usado no Dashboard e em `/historico`)
- `az104:wrong` — questões erradas (usado em `/erros`)
- `az104:custom-questions` — questões importadas via `/banco`
- `az104:theme` — preferência de tema claro/escuro

Nada é enviado a servidores externos. Limpar os dados do site no navegador apaga todo o progresso.

## Troubleshooting

- **`npm install` falha por versão do Node**: use Node.js 18 ou superior (`node -v` para conferir).
- **Página em branco / erro no console**: confirme que `npm run build` roda sem erros
  (`npm run build`); erros de tipo ou de importação aparecem nesse passo antes mesmo de abrir o
  navegador.
- **Progresso "sumiu"**: o histórico é por navegador/perfil (localStorage). Abrir em uma janela
  anônima ou em outro navegador começa do zero.
- **Importação de JSON rejeitada**: confira a mensagem de erro exibida — ela lista os campos
  inválidos por item, comparando com `question-schema.json`.
- **Quero recomeçar do zero**: em `/historico` há um botão para limpar o histórico, e em `/erros`
  para limpar as questões erradas; em `/banco`, "Remover importadas" limpa apenas questões
  adicionadas manualmente.

## Sobre o dataset

O dataset atual (`src/data/questions.json`) contém **300 questões originais**, distribuídas
proporcionalmente aos pesos dos domínios definidos em `src/lib/domains.ts` (Identity and Governance 66,
Storage 54, Compute 75, Networking 60, Monitoring 45), priorizando dificuldade média/alta e cenários
administrativos realistas (ex.: comparações como Availability Set vs. Availability Zone, NSG vs. Azure
Firewall, Load Balancer vs. Application Gateway, SAS vs. Access Key, Backup vs. Site Recovery). Novas
levas podem ser adicionadas diretamente em `questions.json` ou via importação JSON pela página
**Banco de Questões**, sem exigir nenhuma alteração de código.

---

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/188f841e-9465-4f52-b0e6-acba20ad9198).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.
