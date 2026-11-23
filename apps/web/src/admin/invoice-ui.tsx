import { Badge } from '@/components/ui'
import { invoiceStateLabel, type InvoiceState, type InvoiceTotals } from '@hvac/shared'

export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  'bank-transfer': 'Bank transfer',
  'card-on-site': 'Card on site',
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials',
  equipment: 'Equipment',
  transport: 'Transport',
  subcontractor: 'Subcontractor',
  office: 'Office',
  utilities: 'Utilities',
  marketing: 'Marketing',
  travel: 'Travel',
  other: 'Other',
}

export const ROLE_LABELS: Record<string, string> = {
  technician: 'Technician',
  'senior-technician': 'Senior technician',
  engineer: 'Engineer',
  'project-manager': 'Project manager',
  sales: 'Sales',
  accounts: 'Accounts',
  helper: 'Helper',
  admin: 'Admin',
}

const stateTone: Record<InvoiceState, 'neutral' | 'cold' | 'heat' | 'success' | 'warn' | 'danger'> = {
  draft: 'neutral',
  unpaid: 'cold',
  partial: 'warn',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
}

export function InvoiceStateBadge({ state }: { state: InvoiceTotals['state'] }) {
  return (
    <Badge tone={stateTone[state]} dot>
      {invoiceStateLabel(state)}
    </Badge>
  )
}