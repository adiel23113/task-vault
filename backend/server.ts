let isShuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('shutting down gracefully');
}