import { toast } from "sonner"

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open(): void }
  }
}

interface RazorpayOptions {
  amount: number
  currency: string
  description: string
  handler(response: RazorpayPaymentResponse): void
  key: string
  name: string
  order_id: string
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export async function openRazorpayCheckout(input: {
  amount: number
  description?: string
  key: string
  name: string
  orderId: string
  onPaid(response: RazorpayPaymentResponse): Promise<void>
}) {
  await loadRazorpayCheckout()
  if (!window.Razorpay) throw new Error("Razorpay checkout is not available.")

  const checkout = new window.Razorpay({
    amount: input.amount,
    currency: "INR",
    description: input.description ?? "Workspace subscription",
    key: input.key,
    name: input.name,
    order_id: input.orderId,
    handler: (response) => {
      void input.onPaid(response).catch((error) => {
        toast.error("Payment confirmation failed", {
          description: error instanceof Error ? error.message : "Please try again.",
        })
      })
    },
  })
  checkout.open()
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Razorpay checkout script failed to load.")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Razorpay checkout script failed to load."))
    document.head.appendChild(script)
  })
}
