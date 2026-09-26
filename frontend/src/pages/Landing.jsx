import { Link } from "react-router-dom";
import { MapPin, CalendarClock, Radio, ShieldCheck, LayoutGrid, Gauge } from "lucide-react";
import { Button } from "../components/Button.jsx";
import { Card } from "../components/Card.jsx";

const CUSTOMER_FEATURES = [
    { icon: MapPin, title: "Find parking nearby", body: "Search lots by city, see live availability, and compare hourly rates." },
    { icon: CalendarClock, title: "Book ahead of time", body: "Pick a start and end time, select a slot on the visual layout, and confirm instantly." },
    { icon: Radio, title: "Live updates", body: "Availability refreshes in real time as other customers book or cancel." },
];

const VENDOR_FEATURES = [
    { icon: LayoutGrid, title: "Manage your lots", body: "Upload a DXF layout, configure slot types and hourly rates, and track occupancy." },
    { icon: Gauge, title: "Run the front desk", body: "Start and complete walk-in parking sessions without a customer account." },
    { icon: ShieldCheck, title: "Stay in control", body: "Mark slots unavailable for maintenance and see every booking as it happens." },
];

export function Landing() {
    return (
        <div>
            <section className="mx-auto max-w-6xl px-4 py-20 text-center">
                <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Parking, without the guesswork.</h1>
                <p className="mx-auto mt-4 max-w-xl text-ink-soft">
                    ParkEase connects drivers with real-time parking availability and gives lot operators one dashboard to run the whole
                    operation.
                </p>
                <div className="mt-8 flex justify-center gap-3">
                    <Link to="/register">
                        <Button className="px-6 py-3">Find parking</Button>
                    </Link>
                    <Link to="/register">
                        <Button variant="secondary" className="px-6 py-3">
                            List your lot
                        </Button>
                    </Link>
                </div>
            </section>

            <section className="border-t border-border bg-surface-raised py-16">
                <div className="mx-auto max-w-6xl px-4">
                    <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-brand">How it works</h2>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {[
                            { step: "1", text: "Search a city and pick your arrival window." },
                            { step: "2", text: "Choose an open slot on the live layout map." },
                            { step: "3", text: "Confirm your booking and get instant status updates." },
                        ].map((item) => (
                            <Card key={item.step} className="p-5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-dark">
                                    {item.step}
                                </div>
                                <p className="mt-3 text-sm text-ink-soft">{item.text}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="mx-auto max-w-6xl px-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">For drivers</h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {CUSTOMER_FEATURES.map((feature) => (
                            <Card key={feature.title} className="p-5">
                                <feature.icon size={20} className="text-brand" />
                                <p className="mt-3 font-medium text-ink">{feature.title}</p>
                                <p className="mt-1 text-sm text-ink-soft">{feature.body}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-border bg-surface-raised py-16">
                <div className="mx-auto max-w-6xl px-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">For lot operators</h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {VENDOR_FEATURES.map((feature) => (
                            <Card key={feature.title} className="p-5">
                                <feature.icon size={20} className="text-brand" />
                                <p className="mt-3 font-medium text-ink">{feature.title}</p>
                                <p className="mt-1 text-sm text-ink-soft">{feature.body}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 text-center">
                <h2 className="text-2xl font-semibold text-ink">Ready to get started?</h2>
                <div className="mt-6 flex justify-center gap-3">
                    <Link to="/register">
                        <Button className="px-6 py-3">Create a free account</Button>
                    </Link>
                </div>
            </section>

            <footer className="border-t border-border py-8 text-center text-sm text-ink-soft">
                &copy; {new Date().getFullYear()} ParkEase
            </footer>
        </div>
    );
}
