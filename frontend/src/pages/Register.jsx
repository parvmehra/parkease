import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../components/Card.jsx";
import { Input } from "../components/Input.jsx";
import { Button } from "../components/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { ROLES } from "../utils/constants.js";

export function Register() {
    const { register, login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", email: "", password: "", type: ROLES.CUSTOMER });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await register(form);
            const user = await login({ email: form.email, password: form.password });
            navigate(user.type === "Vendor" ? "/vendor" : "/app");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16">
            <Card className="p-6">
                <h1 className="text-xl font-semibold text-ink">Create your account</h1>
                <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                    <Input label="Username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    <Input
                        label="Email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <Input
                        label="Password"
                        type="password"
                        required
                        minLength={6}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-ink">I am a</span>
                        <div className="grid grid-cols-2 gap-2">
                            {[ROLES.CUSTOMER, ROLES.VENDOR].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setForm({ ...form, type })}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                        form.type === type ? "border-brand bg-brand-soft text-brand-dark" : "border-border text-ink-soft"
                                    }`}
                                >
                                    {type === ROLES.CUSTOMER ? "Customer" : "Vendor"}
                                </button>
                            ))}
                        </div>
                    </label>
                    {error && <p className="text-sm text-danger">{error}</p>}
                    <Button type="submit" className="w-full" loading={loading}>
                        Create account
                    </Button>
                </form>
                <p className="mt-4 text-center text-sm text-ink-soft">
                    Already have an account?{" "}
                    <Link to="/login" className="text-brand hover:underline">
                        Log in
                    </Link>
                </p>
            </Card>
        </div>
    );
}
