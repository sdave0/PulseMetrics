export const mapConfidenceToPercentage = (confidence: string | null | undefined): number => {
    if (!confidence) return 0;
    const lower = confidence.toLowerCase();
    if (lower === 'high') return 85;
    if (lower === 'medium') return 50;
    if (lower === 'low') return 25;
    return 0;
};

export const getConfidenceColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-red-600'; // High confidence of anomaly -> Red alert
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
};
