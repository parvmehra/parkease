export function formatCurrency(amount) {
    if (typeof amount !== "number") return "—";
    return `₹${amount.toLocaleString("en-IN")}`;
}
