# Documents, printing and PDFs

Invoices and quotations have one visual language across the control room, browser
print and the downloadable PDF.

## Invoice document

The admin invoice page is the canonical tax-invoice sheet:

- brand identity, address, contact line and EIN;
- invoice reference, issue date, due date and place of supply;
- billed-to and against blocks;
- numbered description, quantity, rate, taxable value, tax percentage and amount;
- amount in words, notes, bank/payment details and terms;
- subtotal, discount, taxable value, state/local or sales tax, total, paid and balance;
- payment history when payments exist;
- declaration and authorised-signatory footer.

`GET /api/v1/admin/invoices/:id/pdf` and the portal invoice PDF use the same
PDFKit builder in `apps/api/src/pdf.ts`, so both admin and customer downloads have
the same layout. The invoice page also has a **Print** action using the same sheet
and `apps/web/src/admin/print.css`; printing hides the control-room chrome and
prints only the invoice sheet.

## Quotation document

Quotation PDFs use the same document system:

- brand header and quotation metadata;
- prepared-for customer block;
- quotation title, service, lead reference and total;
- description, quantity, rate, tax and amount columns;
- subtotal, discount, tax and total;
- notes, terms and authorised-signatory footer.

Both the admin download route and the customer portal download route call the
same quotation PDF builder.

## Implementation notes

- PDF generation uses PDFKit server-side; no browser or Chromium runtime is
  required in production.
- The invoice sheet uses Helvetica/Arial for body copy and Courier for data
  labels, matching the PDF fonts rather than the surrounding app fonts.
- Money is rendered with two decimals in both the screen and PDF.
- The on-screen invoice uses A4-friendly spacing and the print stylesheet uses
  `@page { size: A4; margin: 12mm; }`.
- All amounts, tax labels, dates and bank details come from the same invoice,
  quotation and brand records used by the screen.
- PDF responses are private/no-store because invoices contain customer PII.
- `api.test.ts` verifies that admin, portal invoice, portal quotation and expense
  PDFs are valid `%PDF` responses.
