"use server";

import { stripe } from "@/lib/stripe";

export const getInvoiceUrl = async (invoiceId: string) => {
  const invoice = await stripe.getInvoice(invoiceId);
  if (!invoice || !invoice.invoice_pdf) {
    throw new Error("Invoice not found");
  }
  return invoice.invoice_pdf;
};
