import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black text-white p-4">
        <div className="max-w-3xl w-full text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="text-emerald-400">Keyboard</span>kombat
            </h1>

            <p className="text-xl text-zinc-400 max-w-xl mx-auto">
            Challenge your friends to a real-time typing battle. Test your speed and accuracy in intense 1v1 duels.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/CreateRoom">
                <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white">
                Create Room
                <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>

            <Link to="/JoinRoom">
                <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-emerald-500 text-emerald-500 hover:bg-emerald-950 hover:text-white"
                >
                Join Room
                </Button>
            </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <FeatureCard
                title="Real-time Duels"
                description="Compete head-to-head in real-time typing battles with friends or random opponents."
            />
            <FeatureCard
                title="Health System"
                description="Damage your opponent with fast, accurate typing. The better you type, the more damage you deal."
            />
            <FeatureCard
                title="Private Rooms"
                description="Create private game rooms with unique codes to challenge specific friends."
            />
            </div>
        </div>
        </main>
    );
    }

    function FeatureCard({ title, description }) {
    return (
        <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
        <h3 className="text-lg font-medium text-emerald-400 mb-2">{title}</h3>
        <p className="text-zinc-400">{description}</p>
        </div>
    );
    }