
export default function TopNav() {
    return (
        <nav className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
                <div className="font-bold text-xl">AITrader</div>
            </div>
            <div className="text-sm text-slate-500">Status: <span className="text-green-500">ok</span></div>
        </nav>
    )
}
