

export default function LCUStatus({ status }: { status: string }) {
    const normalizedStatus = status.trim().toLowerCase();
    const isReady = normalizedStatus === 'connected' || normalizedStatus === 'ready' || normalizedStatus === 'good';

    return (
        <div className="rounded-md w-max">
            {isReady ? (
                <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>READY</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>NOT READY</span>
                </div>
            )}
        </div>
    );
}