import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatInr } from '../lib/format'
import { Card, DataTable, StatusChip } from '../components/ui'

export function QuotationsPage() {
  const { data } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api('/quotations'),
  })
  const quotations = data?.quotations || []

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="space-y-2 md:hidden">
        {quotations.length === 0 ? (
          <Card className="py-8 text-center text-sm text-secondary">
            No quotations yet — convert a lead or open a project BOQ.
          </Card>
        ) : (
          quotations.map((q) => (
            <Card key={q._id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.title}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {q.versionLabel} ·{' '}
                    {q.projectId ? (
                      <Link
                        to={`/boq/${q.projectId._id || q.projectId}`}
                        className="text-accent"
                      >
                        Open BOQ
                      </Link>
                    ) : (
                      q.leadId?.clientName || 'Lead quote'
                    )}
                  </p>
                </div>
                <StatusChip status={q.status} />
              </div>
              <p className="mt-3 text-right text-sm font-semibold tabular-nums">
                {formatInr(q.grandTotal)}
              </p>
            </Card>
          ))
        )}
      </div>

      <Card
        variant="light"
        padding={false}
        className="hidden min-w-0 overflow-hidden md:block"
      >
        <DataTable
          columns={[
            {
              key: 'title',
              label: 'Quotation',
              render: (v, row) => (
                <div>
                  <p className="font-medium">{v}</p>
                  <p className="text-xs text-zinc-500">
                    {row.versionLabel} ·{' '}
                    {row.projectId ? (
                      <Link
                        to={`/boq/${row.projectId._id || row.projectId}`}
                        className="text-emerald-600"
                      >
                        Open BOQ
                      </Link>
                    ) : (
                      row.leadId?.clientName || 'Lead quote'
                    )}
                  </p>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <StatusChip status={v} />,
            },
            {
              key: 'grandTotal',
              label: 'Total',
              numeric: true,
              align: 'right',
              render: (v) => formatInr(v),
            },
          ]}
          data={quotations}
          emptyMessage="No quotations yet — convert a lead or open a project BOQ."
        />
      </Card>
    </div>
  )
}

export { MaterialsPage as ProcurementPage } from './MaterialsPage'
export { FinancePage } from './MoneyPage'
