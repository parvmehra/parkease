import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../components/Card.jsx";
import { Input } from "../components/Input.jsx";
import { Button } from "../components/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";

export function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            const user = await login(form);
            navigate(user.type === "Vendor" ? "/vendor" : "/app");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-20">
            <Card className="p-6">
                <h1 className="text-xl font-semibold text-ink">Log in</h1>
                <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    {error && <p className="text-sm text-danger">{error}</p>}
                    <Button type="submit" className="w-full" loading={loading}>
                        Log in
                    </Button>
                </form>
                <p className="mt-4 text-center text-sm text-ink-soft">
                    No account?{" "}
                    <Link to="/register" className="text-brand hover:underline">
                        Sign up
                    </Link>
                </p>
            </Card>
        </div>
    );
}
