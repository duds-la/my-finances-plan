# DER — Sistema Financeiro Pessoal

Diagramas em Mermaid. Renderizam automaticamente no GitHub, GitLab, Notion e VSCode (extensão Markdown Preview Mermaid Support).

---

## Módulo 1 — Core financeiro

Entidades base: usuário, transação, tipo, categoria, recorrência e auditoria.

```mermaid
erDiagram
  USUARIO {
    int id PK
    string nome
    string email
    string senha_hash
    datetime criado_em
    bool ativo
  }
  TRANSACAO {
    int id PK
    int usuario_id FK
    int tipo_id FK
    int categoria_id FK
    int recorrencia_id FK
    decimal valor
    datetime data_transacao
    string descricao
    bool confirmada
  }
  TIPO {
    int id PK
    string descricao
  }
  CATEGORIA {
    int id PK
    string descricao
    string sigla
    string bloco_5030
    string icone
  }
  RECORRENCIA {
    int id PK
    int usuario_id FK
    int tipo_id FK
    int categoria_id FK
    string periodicidade
    decimal valor
    date proxima_data
    bool ativa
  }
  LOG_TRANSACAO {
    int id PK
    int transacao_id FK
    datetime log_data
    string acao
    string dados_anteriores
  }

  USUARIO ||--o{ TRANSACAO : realiza
  TIPO ||--o{ TRANSACAO : classifica
  CATEGORIA ||--o{ TRANSACAO : agrupa
  RECORRENCIA ||--o{ TRANSACAO : gera
  TRANSACAO ||--o{ LOG_TRANSACAO : auditado_em
  USUARIO ||--o{ RECORRENCIA : possui
```

---

## Módulo 2 — Investimentos

Rastreabilidade entre transações e investimentos via `COMPOSICAO_INVESTIMENTO`.

```mermaid
erDiagram
  TRANSACAO {
    int id PK
    int usuario_id FK
    decimal valor
    datetime data_transacao
  }
  TIPO_INVESTIMENTO {
    int id PK
    string sigla
    string descricao
    bool liquidez_diaria
    bool renda_fixa
    decimal desconto_ir
  }
  INVESTIMENTO {
    int id PK
    int usuario_id FK
    int tipo_investimento_id FK
    int transacao_id FK
    decimal valor_investido
    decimal taxa_juros
    date vencimento
    date data_aplicacao
    string status
  }
  RENDIMENTO {
    int id PK
    int investimento_id FK
    int tipo_rendimento_id FK
    date data_rendimento
    decimal valor_rendimento
    decimal ir_retido
  }
  TIPO_RENDIMENTO {
    int id PK
    string descricao
  }
  COMPOSICAO_INVESTIMENTO {
    int id PK
    int investimento_id FK
    int transacao_id FK
    decimal percentual
    string observacao
  }

  TIPO_INVESTIMENTO ||--o{ INVESTIMENTO : classifica
  TIPO_RENDIMENTO ||--o{ RENDIMENTO : classifica
  INVESTIMENTO ||--o{ RENDIMENTO : gera
  INVESTIMENTO ||--o{ COMPOSICAO_INVESTIMENTO : composto_por
  TRANSACAO ||--o{ COMPOSICAO_INVESTIMENTO : origina
  TRANSACAO ||--o| INVESTIMENTO : aplicacao
```

---

## Módulo 3 — Planejamento

Orçamento por categoria, metas financeiras, simulações e gamificação.

```mermaid
erDiagram
  USUARIO {
    int id PK
    string nome
  }
  ORCAMENTO {
    int id PK
    int usuario_id FK
    int categoria_id FK
    int mes
    int ano
    decimal limite
    decimal gasto_atual
    decimal percentual_consumido
  }
  META_FINANCEIRA {
    int id PK
    int usuario_id FK
    string titulo
    decimal valor_alvo
    decimal valor_atual
    date prazo
    string status
    decimal aporte_sugerido
  }
  APORTE_META {
    int id PK
    int meta_id FK
    int transacao_id FK
    decimal valor
    datetime data_aporte
  }
  SIMULACAO {
    int id PK
    int usuario_id FK
    string tipo
    json parametros
    json resultado
    datetime criado_em
  }
  CONQUISTA {
    int id PK
    string codigo
    string titulo
    string descricao
    string icone
    int pontos
  }
  CONQUISTA_USUARIO {
    int id PK
    int usuario_id FK
    int conquista_id FK
    datetime desbloqueado_em
  }

  USUARIO ||--o{ ORCAMENTO : define
  USUARIO ||--o{ META_FINANCEIRA : cria
  META_FINANCEIRA ||--o{ APORTE_META : recebe
  USUARIO ||--o{ SIMULACAO : executa
  USUARIO ||--o{ CONQUISTA_USUARIO : ganha
  CONQUISTA ||--o{ CONQUISTA_USUARIO : atribuida
```

---

## Módulo 4 — Análise & Inteligência

Score de saúde financeira, detecção de anomalias, projeções e dados externos.

```mermaid
erDiagram
  USUARIO {
    int id PK
    string nome
  }
  SCORE_FINANCEIRO {
    int id PK
    int usuario_id FK
    int mes
    int ano
    decimal score
    decimal ratio_gastos_receita
    decimal reserva_emergencia
    json componentes
    datetime calculado_em
  }
  ANOMALIA {
    int id PK
    int usuario_id FK
    int transacao_id FK
    int categoria_id FK
    decimal valor_esperado
    decimal valor_real
    decimal desvio_percentual
    string status
    datetime detectada_em
  }
  PROJECAO_SALDO {
    int id PK
    int usuario_id FK
    int periodo_dias
    decimal saldo_atual
    decimal saldo_projetado
    json entradas_previstas
    json saidas_previstas
    datetime gerado_em
  }
  DADO_EXTERNO {
    int id PK
    string fonte
    string indicador
    decimal valor
    date data_referencia
    datetime coletado_em
  }
  REGRA_AUTOMACAO {
    int id PK
    int usuario_id FK
    string gatilho
    string condicao
    string acao
    bool ativa
    datetime ultima_execucao
  }

  USUARIO ||--o{ SCORE_FINANCEIRO : possui
  USUARIO ||--o{ ANOMALIA : alertado_em
  USUARIO ||--o{ PROJECAO_SALDO : tem
  USUARIO ||--o{ REGRA_AUTOMACAO : configura
```

---

## Visão geral (relacionamentos entre módulos)

```mermaid
erDiagram
  USUARIO ||--o{ TRANSACAO : realiza
  USUARIO ||--o{ RECORRENCIA : possui
  USUARIO ||--o{ INVESTIMENTO : aplica
  USUARIO ||--o{ ORCAMENTO : define
  USUARIO ||--o{ META_FINANCEIRA : cria
  USUARIO ||--o{ SCORE_FINANCEIRO : possui
  USUARIO ||--o{ ANOMALIA : alertado
  USUARIO ||--o{ CONQUISTA_USUARIO : ganha
  TRANSACAO ||--o{ LOG_TRANSACAO : auditado
  TRANSACAO ||--o{ COMPOSICAO_INVESTIMENTO : origina
  INVESTIMENTO ||--o{ RENDIMENTO : gera
  INVESTIMENTO ||--o{ COMPOSICAO_INVESTIMENTO : composto_por
  META_FINANCEIRA ||--o{ APORTE_META : recebe
  CONQUISTA ||--o{ CONQUISTA_USUARIO : atribuida
  TIPO ||--o{ TRANSACAO : classifica
  CATEGORIA ||--o{ TRANSACAO : agrupa
  TIPO_INVESTIMENTO ||--o{ INVESTIMENTO : classifica
  RECORRENCIA ||--o{ TRANSACAO : gera
```
