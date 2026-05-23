import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

const WipeApp = () => {
    const { auth, isLoading, error, clearError, fs, kv } = usePuterStore();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FSItem[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadFiles = async () => {
        const files = (await fs.readDir("./")) as FSItem[];
        setFiles(files ?? []);
    };

    useEffect(() => {
        loadFiles();
    }, []);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate("/auth?next=/wipe");
        }
    }, [isLoading, auth.isAuthenticated]);

    const handleDelete = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to wipe all app data? This will permanently delete all uploaded resumes and feedback. This action cannot be undone."
        );
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            // Use Promise.all so all deletions are awaited before flushing KV
            await Promise.all(files.map((file) => fs.delete(file.path)));
            await kv.flush();
            await loadFiles();
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return (
            <div>
                <p>Error: {error}</p>
                <button onClick={clearError}>Dismiss</button>
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col gap-6">
            <p className="text-lg font-medium">Authenticated as: <span className="font-bold">{auth.user?.username}</span></p>

            <div>
                <p className="font-semibold mb-2">Existing files:</p>
                {files.length === 0 ? (
                    <p className="text-gray-500">No files found.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {files.map((file) => (
                            <div key={file.id} className="flex flex-row gap-4">
                                <p>{file.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <button
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-md cursor-pointer transition-colors"
                    onClick={handleDelete}
                    disabled={isDeleting || files.length === 0}
                >
                    {isDeleting ? "Wiping..." : "Wipe App Data"}
                </button>
            </div>
        </div>
    );
};

export default WipeApp;
