# MetricMind Frontend

Conversational BI interface built with Next.js 14, TypeScript, and ECharts.

## Features

- **Chat Interface**: Natural language question input with example suggestions
- **Streaming Responses**: Real-time response rendering
- **KPI Cards**: Dynamic metric summaries with formatted values
- **Interactive Charts**: Bar, line, and pie charts with ECharts
- **Data Tables**: Sortable, paginated data tables
- **Query Inspection**: View API calls, metric definitions, and warnings
- **Error/Clarification States**: Graceful handling of unsupported questions and clarification needs
- **Mock Backend Integration**: Connects to the FastAPI mock backend

## Quick Start

### Prerequisites
- Node.js 18+
- Backend running on `http://127.0.0.1:8000`

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```
Runs on `http://localhost:3000` (or 3001 if 3000 is in use)

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css      # Global styles with Tailwind
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main page with ChatInterface
│   ├── components/
│   │   ├── ChatInterface.tsx    # Main chat component
│   │   ├── KPICards.tsx         # Metric summary cards
│   │   ├── ChartContainer.tsx   # ECharts visualization
│   │   ├── DataTable.tsx        # Sortable/paginated table
│   │   └── InspectionPanel.tsx  # API/metric inspection modal
│   ├── lib/
│   │   ├── api.ts           # Backend API client
│   │   └── utils.ts         # Formatting utilities
│   ├── types/
│   │   └── api.ts           # TypeScript types matching backend contracts
│   └── hooks/               # Custom React hooks (future)
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── .eslintrc.js
```

## Backend Integration

The frontend expects the following backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/metrics` | GET | Metrics catalog |
| `/api/v1/plan` | POST | Natural language → structured query |
| `/api/v1/query` | POST | Execute structured query |

### API Contract (from `backend/app/contracts.py`)

```typescript
type Metric = 'revenue' | 'reported_profit' | 'reported_profit_margin' | 'shipping_cost';
type Dimension = 'market' | 'category';

interface QueryRequest {
  metrics: Metric[];
  dimensions: Dimension[];
  start_date: string;  // ISO date
  end_date: string;    // ISO date
  market?: 'EU' | 'US' | 'LATAM' | 'Africa' | 'APAC' | 'EMEA' | 'Canada' | null;
  limit?: number;      // 1-1000
}
```

## Example Questions

The planner supports this grammar:
```
Show [market] [metrics] for [quarter year] [by dimension]
```

Examples:
- `Show EU revenue and profit for Q4 2014 by category`
- `Show all markets revenue for Q4 2014`
- `Show US profit margin for Q3 2014 by category`

## Architecture

```
User Question
     │
     ▼
ChatInterface (PlanRequest)
     │
     ▼
POST /api/v1/plan  ───► PlanResponse { status, query?, message }
     │                      │
     │         ┌────────────┴────────────┐
     │         ▼                         ▼
     │   needs_clarification          ready
     │         │                         │
     │         ▼                         ▼
     │   Show clarification        Execute query
     │   message to user                │
     │                                  ▼
     │                          POST /api/v1/query
     │                                  │
     │                                  ▼
     │                          QueryResponse
     │                                  │
     ▼                                  ▼
Render response ───► KPI Cards, Charts, Tables, Inspection
```

## Visualization Logic

| Data Pattern | Visualization |
|--------------|---------------|
| Single metric, no dimension | KPI Card |
| Metric over time (date dimension) | Line Chart |
| Category/region comparison | Bar Chart |
| Single metric + single dimension | Pie Chart (optional) |
| Multiple rows | Data Table |

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom Tremor-inspired color palette** for data viz
- **Responsive design** (mobile-first)
- **Dark mode ready** (CSS variables)

## Extending

### Adding New Metrics
1. Update backend `contracts.py` and `semantic.py`
2. Add formatter in `frontend/src/lib/utils.ts`
3. Update `frontend/src/types/api.ts`

### Adding New Chart Types
1. Modify `ChartContainer.tsx` chart selection logic
2. Add new ECharts series configuration

### Adding New Inspection Tabs
1. Add tab in `InspectionPanel.tsx`
2. Create corresponding view component

## Troubleshooting

### Backend Connection Failed
- Ensure backend is running: `cd backend && py -3.14 -m uvicorn app.main:app --reload --port 8000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS if accessing from different origin

### Build Errors
- Run `npm run typecheck` to see TypeScript errors
- Run `npm run lint` to see ESLint errors
- Clear `.next` cache: `rm -rf .next && npm run build`

### Charts Not Rendering
- Check browser console for ECharts errors
- Verify data format matches expected structure
- Ensure container has defined height