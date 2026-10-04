
# MetricMind — Agentic Semantic BI Engine

> **Trustworthy conversational Business Intelligence powered by Agentic AI + Semantic Layer Governance**

MetricMind is a conversational BI system that lets business users ask analytical questions in natural language while keeping **business definitions, metric calculations, query scope, and data access governed**.

Instead of giving an LLM unrestricted access to raw warehouse tables and asking it to invent SQL, MetricMind uses a **Semantic Layer as the source of truth**. The LLM acts as an orchestrator: it understands intent, selects approved metrics and dimensions, calls the semantic API, performs additional analytical steps when necessary, and explains the result through an interactive BI interface.

---

## 1. Why MetricMind?

### The problem

Traditional Text-to-SQL systems can be risky in enterprise analytics:

- The LLM may hallucinate table joins.
- The same business metric can be calculated differently.
- The model may use the wrong time period or geography.
- Raw database access can expose data that should not be queried.
- Large exploratory queries can become expensive.
- Users cannot easily understand how an answer was produced.

This creates a major **trust problem** for Finance, Sales, Operations, and other business teams.

### Our solution

MetricMind separates **reasoning** from **business logic**.

```text
                         USER
                           │
                           ▼
                  Natural-language question
                           │
                           ▼
                ┌─────────────────────┐
                │   MetricMind Agent  │
                │ LangChain + LLM     │
                └──────────┬──────────┘
                           │
                  Understand intent
                           │
                           ▼
                ┌─────────────────────┐
                │  Semantic Layer     │
                │ Cube.dev / dbt      │
                │                     │
                │ Approved Metrics    │
                │ Approved Dimensions │
                └──────────┬──────────┘
                           │
                     Semantic API
                           │
                           ▼
                ┌─────────────────────┐
                │ Data Warehouse/DB   │
                │ PostgreSQL /        │
                │ Snowflake /         │
                │ Databricks          │
                └──────────┬──────────┘
                           │
                      Structured JSON
                           │
                           ▼
                ┌─────────────────────┐
                │ Next.js BI UI       │
                │ Charts + KPIs +     │
                │ Explanation + Trace │
                └─────────────────────┘
```

**Core principle:**

> The LLM decides **what analysis is needed**; the Semantic Layer decides **what a business metric means**.

---

## 2. Example User Journey

### Executive question

> **"Why did European margins drop last quarter?"**

MetricMind should not immediately generate arbitrary SQL.

```text
1. Understand the question
   ├── Metric: Margin
   ├── Geography: Europe
   └── Period: Last Quarter

2. Retrieve governed metric definition

3. Query the Semantic Layer

4. Compare current period with previous period

5. Detect a significant change

6. Automatically investigate contributing factors
   ├── Country
   ├── Category
   ├── Sub-category
   ├── Discount
   └── Shipping Cost

7. Produce an explanation

8. Render:
   ├── KPI summary
   ├── Chart
   ├── Supporting breakdown
   ├── View API Call
   └── View SQL / generated query
```

The exact numerical result depends on the selected public dataset and its available fields.

---

## 3. Project Goals

MetricMind aims to demonstrate:

- **Semantic governance** for business metrics.
- **Agentic reasoning** over governed data.
- Natural-language conversational BI.
- Multi-step root-cause analysis.
- Dynamic data visualization.
- Query-cost and scope governance.
- Full analytical transparency.
- Consistent metric calculations.

---

## 4. Data Source

### We are NOT creating fictional/mock corporate data.

The project uses a **publicly available real-world business/retail dataset** obtained from a public dataset platform such as Kaggle.

### Initial dataset choice

**Global Superstore / Superstore dataset**

The Global Superstore family of datasets contains transactional fields such as order dates, country, market, region, product/category information, sales, quantity, discount, profit, and shipping-related information. These dimensions make it suitable for semantic BI demonstrations involving time, geography, products, sales and profitability.

A public Global Superstore repository lists fields including Order Date, Country, Market, Region, Category, Sub-Category, Product Name, Sales, Quantity, Profit and Shipping Cost. citeturn0search0

Another public analysis reports a Global Superstore dataset with approximately 51,290 records and 24 original columns, covering transactions from January 2011 to December 2014. citeturn0search3

### Dataset source

The exact dataset version and source URL will be recorded in:

```text
docs/data-source.md
```

The repository should not redistribute the raw dataset unless its license/terms explicitly allow redistribution.

Instead:

```text
Repository
   │
   ├── data/
   │   └── README.md
   │
   └── docs/
       └── data-source.md
```

`data/README.md` will explain how to download the dataset and where to place it locally.

---

## 5. Business Metrics

The Semantic Layer will contain only **approved and documented metrics**.

Depending on the exact columns available in the selected dataset:

### Revenue / Sales

```text
Revenue = SUM(Sales)
```

### Profit

```text
Profit = SUM(Profit)
```

### Margin

If Sales and Profit are available:

```text
Margin = SUM(Profit) / SUM(Sales)
```

### Shipping Cost

If the selected dataset contains shipping cost:

```text
Shipping Cost = SUM(Shipping Cost)
```

### Important rule

We will **not invent unavailable financial fields**.

If the source dataset does not contain actual Cost, we will not pretend that it does. Any derived metric must be explicitly documented with its formula and assumptions.

---

## 6. Semantic Dimensions

The exact dimensions depend on the selected dataset, but the target semantic model is:

```text
Time
├── Date
├── Month
├── Quarter
└── Year

Geography
├── Country
├── Region
└── Market

Product
├── Category
├── Sub-category
└── Product

Customer
└── Segment
```

These dimensions support questions such as:

```text
"Show sales by region."

"Which category had the highest profit last year?"

"Compare European sales between Q2 and Q3."

"Which countries have declining margins?"

"Why did profitability decrease in a particular region?"
```

---

## 7. System Architecture

### Frontend

**Next.js + TypeScript**

Responsibilities:

- Conversational chat interface.
- Streaming response display.
- KPI cards.
- Interactive charts.
- Tables and breakdowns.
- Loading/error/empty states.
- Query transparency controls.

Recommended visualization tools:

- Tremor
- ECharts

### Agentic Orchestrator

**LangChain + LLM**

Responsibilities:

- Understand natural-language intent.
- Identify required metrics and dimensions.
- Access the approved semantic schema.
- Create semantic API requests.
- Execute multi-step analysis.
- Perform root-cause drill-down.
- Explain results in business language.
- Respect query limits and available metrics.

The agent should **not have unrestricted raw database access**.

### Semantic Layer

**Cube.dev and/or dbt Semantic Layer**

Responsibilities:

- Define approved metrics.
- Define dimensions.
- Define relationships.
- Centralize business definitions.
- Generate governed analytical queries.
- Provide a consistent interface to the agent.

Example:

```text
Metric: Margin

Definition:
SUM(Profit) / SUM(Sales)

Allowed dimensions:
Region
Country
Category
Sub-category
Date
Quarter
Year
```

### Data Layer

**MVP:** PostgreSQL

**Scalable architecture:** Snowflake / Databricks or another enterprise warehouse.

The database is the **storage and compute layer**, not the place where the LLM independently defines business logic.

---

## 8. End-to-End Request Flow

```text
User Question
     │
     ▼
Next.js Chat UI
     │
     ▼
LangChain Agent
     │
     ├── Intent extraction
     ├── Metric selection
     ├── Dimension selection
     └── Analysis planning
     │
     ▼
Semantic Layer
     │
     ├── Validate metric
     ├── Validate dimensions
     └── Build governed query
     │
     ▼
Database / Warehouse
     │
     ▼
Structured JSON
     │
     ▼
Agent interpretation
     │
     ├── Direct answer
     └── Additional drill-down queries
     │
     ▼
Next.js
     │
     ├── Explanation
     ├── KPI cards
     ├── Charts
     ├── Table
     └── API/SQL transparency
```

---

## 9. Agentic Multi-Step Reasoning

MetricMind becomes more than a simple Text-to-SQL chatbot when a question requires investigation.

Example:

```text
Question:
"Why did European margin fall?"
```

### Step 1 — Metric query

```text
Margin by:
Europe + current quarter
```

### Step 2 — Comparison

```text
Current quarter vs previous quarter
```

### Step 3 — Breakdown

```text
Margin by country
```

### Step 4 — Product investigation

```text
Margin by category/sub-category
```

### Step 5 — Operational factors

Where available:

```text
Discount
Shipping Cost
Quantity
```

### Step 6 — Explanation

The agent combines governed numerical results into an understandable business explanation.

---

## 10. Dynamic Visualization

The frontend inspects the structured JSON returned by the analytical backend and selects an appropriate visualization.

| Data pattern | Visualization |
|---|---|
| Metric without dimension | KPI card |
| Metric over time | Line chart |
| Category comparison | Bar chart |
| Region/country comparison | Bar chart |
| Multiple metrics | Grouped bar / comparison cards |
| Detailed records | Table |
| Contribution/breakdown | Bar / stacked visualization |

The visualization layer should **not change the underlying metric calculation**.

---

## 11. Transparency & Governance

A major feature of MetricMind is that users should be able to understand where an answer came from.

### View API Call

Shows the semantic API request used to retrieve the data.

### View SQL

Shows the compiled/generated SQL when available.

### Metric Definition

Shows the approved definition used for the answer.

Example:

```text
Metric: Margin

Formula:
SUM(Profit) / SUM(Sales)

Dimensions:
Region = Europe
Quarter = Q3
```

Audit path:

```text
Business Question
       ↓
Metric Definition
       ↓
Semantic API Request
       ↓
Generated Query
       ↓
Data
       ↓
Answer
```

---

## 12. Cost & Query Governance

MetricMind should prevent uncontrolled analytical queries.

Possible controls:

- Maximum rows returned.
- Maximum query execution time.
- Allowed dimensions only.
- Allowed metrics only.
- Pagination.
- Query complexity checks.
- Reject unrestricted requests.
- Log analytical requests.
- Cache repeated queries where appropriate.

Example:

```text
User:
"Give me every transaction from every country for every year."

        ↓

Governance Layer

        ↓

Request exceeds allowed analytical scope

        ↓

Ask user to narrow the query
```

---

## 13. Team Structure

### Member 1 — Data & Semantic Layer

**Stack:** dbt + Cube.dev + Database

Responsibilities:

- Acquire and document the public dataset.
- Clean and preprocess source data.
- Design the database schema.
- Build raw and transformed dbt models.
- Configure Cube.dev / Semantic Layer.
- Define metrics and dimensions.
- Build and test semantic API requests.
- Validate metric consistency.
- Maintain data lineage and metric documentation.

### Member 2 — Agentic AI & Backend

**Stack:** LangChain + LLM + API orchestration

Responsibilities:

- Build LangChain agent.
- Connect the agent to the Semantic Layer.
- Implement tool calling.
- Convert natural-language questions into semantic API payloads.
- Implement multi-step reasoning.
- Implement root-cause analysis.
- Add validation and query limits.
- Implement backend endpoints.
- Handle errors and fallbacks.
- Test representative executive questions.

### Member 3 — Frontend, Visualization & UX

**Stack:** Next.js + TypeScript + Tremor/ECharts

Responsibilities:

- Build conversational BI interface.
- Implement streaming responses.
- Build KPI cards and analytical summaries.
- Implement dynamic charts.
- Build tables and drill-down views.
- Add View API Call.
- Add View SQL.
- Add metric-definition panels.
- Handle loading/error/empty states.
- Integrate frontend with backend.
- Polish the final user experience.

---

## 14. Week-wise Development Plan

### Week 1 — Data Modeling & Foundation

**Member 1**
- Select and document the public dataset.
- Clean source data.
- Create database schema.
- Start dbt raw/staging models.

**Member 2**
- Set up backend.
- Set up LangChain environment.
- Define agent architecture.
- Prepare semantic-tool interface.

**Member 3**
- Set up Next.js project.
- Build chat UI.
- Implement initial message/response interface.
- Prepare visualization component structure.

### Week 2 — Semantic Layer & Agent

**Member 1**
- Complete dbt transformations.
- Configure Cube.dev.
- Define dimensions.
- Define governed metrics.

**Member 2**
- Connect agent to semantic schema.
- Implement semantic API tool.
- Convert natural language to API payloads.

**Member 3**
- Improve chat experience.
- Implement streaming response UI.
- Prepare KPI/chart components.

### Week 3 — Governance & Multi-Step Reasoning

**Member 1**
- Test metric consistency.
- Validate semantic API results.
- Document metric definitions and lineage.

**Member 2**
- Implement root-cause drill-down.
- Add validation.
- Add query limits.
- Implement fallback/error handling.

**Member 3**
- Connect frontend with backend.
- Implement structured result rendering.
- Prepare chart selection logic.

### Week 4 — Integration & Final BI Experience

| Part | Task | Member |
|---|---|---|
| **1** | Semantic Layer Integration — Connect and validate the finalized semantic API with the complete application flow. | **Member 1** |
| **2** | Data & Metric Validation — Verify Revenue, Profit, Margin and other selected metrics against expected results. | **Member 1** |
| **3** | Agent Workflow Integration — Connect LangChain with the semantic API and complete the question → reasoning → query → result pipeline. | **Member 2** |
| **4** | Root-Cause Analysis Engine — Finalize multi-step reasoning for questions requiring secondary breakdowns. | **Member 2** |
| **5** | Interactive BI Dashboard — Implement KPI cards, tables and dynamic ECharts/Tremor visualizations. | **Member 3** |
| **6** | Transparency, Testing & Demo — Add View API/SQL, test complete user flows, fix UI issues and prepare the final demonstration. | **Member 3** |

---

## 15. Week 4 Integration Target

At the end of Week 4:

```text
User
 │
 │ "Why did European margin fall in Q3?"
 ▼
Next.js
 │
 ▼
LangChain Agent
 │
 ▼
Semantic Layer
 │
 ▼
Governed Query
 │
 ▼
Database
 │
 ▼
JSON Result
 │
 ▼
Agent
 │
 ├── Compare Q3 vs previous period
 ├── Identify change
 └── Trigger breakdown
 │
 ▼
Next.js Dashboard
 │
 ├── KPI
 ├── Explanation
 ├── Chart
 ├── Breakdown
 ├── View API Call
 └── View SQL
```

---

## 16. Suggested Repository Structure

```text
metricmind/
│
├── README.md
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── backend/
│   ├── agent/
│   ├── tools/
│   ├── routes/
│   ├── services/
│   └── requirements.txt
│
├── semantic/
│   ├── cube/
│   ├── metrics/
│   └── schema/
│
├── dbt/
│   ├── models/
│   │   ├── staging/
│   │   ├── intermediate/
│   │   └── marts/
│   ├── tests/
│   └── dbt_project.yml
│
├── data/
│   └── README.md
│
├── docs/
│   ├── architecture.md
│   ├── data-source.md
│   ├── metrics.md
│   └── governance.md
│
├── tests/
│   ├── semantic/
│   ├── agent/
│   └── integration/
│
├── .env.example
├── docker-compose.yml
└── LICENSE
```

---

## 17. Important Development Rules

### Rule 1 — No unrestricted raw SQL from the LLM

The agent should work through approved semantic tools.

### Rule 2 — No invented metrics

If a metric does not exist in the Semantic Layer, the agent should say it is unavailable rather than inventing a formula.

### Rule 3 — Preserve source-data meaning

Transformations must be documented.

### Rule 4 — Every derived metric needs a definition

Example:

```text
Margin = SUM(Profit) / SUM(Sales)
```

### Rule 5 — Keep raw data separate from transformed data

Use:

```text
Raw → Staging → Intermediate → Mart/Semantic
```

### Rule 6 — Every major feature needs a test

Especially:

- Metric correctness
- Semantic API
- Agent tool calling
- Query limits
- Visualization rendering
- End-to-end questions

---

## 18. Example Questions for the Final Demo

### Basic

```text
What are our total sales?
```

### Time

```text
How did sales change quarter over quarter?
```

### Geography

```text
Which region generated the highest profit?
```

### Product

```text
Which categories have the highest margins?
```

### Comparison

```text
Compare European and Asian sales.
```

### Investigation

```text
Why did European margins fall in Q3?
```

### Drill-down

```text
Which countries contributed most to the margin decline?
```

### Governance

```text
What is the definition of margin?
```

### Transparency

```text
Show me the API call used for this answer.
```

---

## 19. Success Criteria

- [ ] Public dataset ingested reproducibly.
- [ ] Raw and transformed models available.
- [ ] Business metrics centrally defined.
- [ ] Agent can use only approved metrics.
- [ ] Natural-language questions become semantic API requests.
- [ ] No unrestricted LLM-to-database workflow exists.
- [ ] Multi-step analytical questions trigger additional queries.
- [ ] Results render as appropriate charts/KPIs/tables.
- [ ] Users can inspect API/query information.
- [ ] Query governance prevents uncontrolled requests.
- [ ] Same input gives consistent metric definitions/results for the same data snapshot.
- [ ] Complete executive demo works end-to-end.

---

## 20. What Makes MetricMind Different?

### Traditional Text-to-SQL

```text
User
 ↓
LLM
 ↓
Raw SQL
 ↓
Database
 ↓
Answer
```

Risks:

- Hallucinated joins
- Wrong metrics
- Wrong calculations
- Uncontrolled queries
- Low trust

### MetricMind

```text
User
 ↓
Agent
 ↓
Governed Semantic Layer
 ↓
Approved Metric + Dimensions
 ↓
Controlled Query
 ↓
Database
 ↓
Validated Result
 ↓
Explanation + Visualization + Trace
```

MetricMind demonstrates how **Generative AI can be combined with strict enterprise data governance** to make conversational analytics more reliable and auditable.

---

## 21. Current Project Status

> Update this section as development progresses.

**Status:** 🚧 In Development

### Completed

- [x] Project concept finalized.
- [x] Architecture defined.
- [x] Team responsibilities defined.
- [x] Public dataset approach selected.
- [x] Week-wise development plan defined.

### In Progress

- [ ] Finalize exact dataset version.
- [ ] Download and inspect source data.
- [ ] Build database schema.
- [ ] Initialize dbt.
- [ ] Initialize Semantic Layer.
- [ ] Initialize LangChain agent.
- [ ] Initialize Next.js interface.

### Upcoming

- [ ] Complete semantic metrics.
- [ ] Connect agent to semantic API.
- [ ] Implement multi-step reasoning.
- [ ] Build dynamic visualizations.
- [ ] Add governance controls.
- [ ] Add transparency controls.
- [ ] Complete end-to-end demo.

---

## 22. Team Contribution

| Member | Primary Area | Main Deliverable |
|---|---|---|
| **Member 1** | Data & Semantic Layer | Governed analytical data foundation |
| **Member 2** | Agentic AI & Backend | Intelligent orchestration and reasoning |
| **Member 3** | Frontend, Visualization & UX | Conversational BI experience |

All members should review integration points together before each milestone.

---

## 23. Final Vision

MetricMind should allow an executive to ask a question naturally and receive an answer that is:

**Accurate → Governed → Explainable → Visual → Auditable**

The goal is not merely to generate an answer.

The goal is to make the answer **trustworthy enough for business decision-making**.

---

## License & Dataset Notice

MetricMind's source code will use the project's selected open-source license.

The external dataset is subject to the **license and terms of its original provider**. Before committing or redistributing any dataset file, verify its current terms. If redistribution is not permitted, the repository will contain download instructions rather than the raw dataset.

---

## Project Keywords

`Agentic AI` · `Conversational BI` · `Semantic Layer` · `Business Intelligence` · `LangChain` · `Cube.dev` · `dbt` · `Next.js` · `ECharts` · `Tremor` · `LLM` · `Data Governance` · `Text-to-SQL` · `Root Cause Analysis`
