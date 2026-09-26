import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Input } from "../components/Input.jsx";
import { Button } from "../components/Button.jsx";
import { useToast } from "../hooks/useToast.js";
import * as vendorService from "../services/vendor.js";

const INITIAL_FORM = {
    name: "",
    description: "",
    hourlyRates: "",
    addressLine: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
};

export function VendorUploadLot() {
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState(INITIAL_FORM);
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function update(field) {
        return (event) => setForm({ ...form, [field]: event.target.value });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!file) return setError("A DXF layout file is required");
        setError("");
        setLoading(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            formData.append("dxfFile", file);
            const result = await vendorService.uploadLot(formData);
            toast.push("Parking lot created");
            navigate(`/vendor/lots/${result.lotId}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-xl font-semibold text-ink">New parking lot</h1>
            <p className="mt-1 text-sm text-ink-soft">
                Upload a DXF file with a <code>boundary</code> layer for the lot outline and a <code>parkinglot</code> layer for each slot.
            </p>
            <Card className="mt-5 p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Lot name" required value={form.name} onChange={update("name")} />
                    <Input label="Description" value={form.description} onChange={update("description")} />
                    <Input label="Hourly rate (₹)" type="number" min="0" required value={form.hourlyRates} onChange={update("hourlyRates")} />
                    <Input label="Address" required value={form.addressLine} onChange={update("addressLine")} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Area / locality" value={form.area} onChange={update("area")} />
                        <Input label="City" required value={form.city} onChange={update("city")} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="State" required value={form.state} onChange={update("state")} />
                        <Input label="Pincode" required value={form.pincode} onChange={update("pincode")} />
                    </div>
                    <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-ink">DXF layout file</span>
                        <input
                            type="file"
                            accept=".dxf"
                            required
                            onChange={(e) => setFile(e.target.files[0])}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                        />
                    </label>
                    {error && <p className="text-sm text-danger">{error}</p>}
                    <Button type="submit" className="w-full" loading={loading}>
                        <UploadCloud size={16} />
                        Create parking lot
                    </Button>
                </form>
            </Card>
        </div>
    );
}
