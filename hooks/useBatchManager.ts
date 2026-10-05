import {
    UseBatchManagerProps,
    useBatchSettingsAndDevice,
    useBatchStorageAndRestore,
    useBatchPolling,
    useBatchCreationAndLifecycle
} from './batch-manager';

export type { UseBatchManagerProps };

export const useBatchManager = (props: UseBatchManagerProps = {}) => {
    const {
        isBatchMode,
        setIsBatchMode,
        autoDownloadFromServer,
        autoDownloadFromServerRef,
        setAutoDownloadFromServer,
        restoreFinishedCards,
        restoreFinishedCardsRef,
        setRestoreFinishedCards,
        restoreFailedCards,
        restoreFailedCardsRef,
        setRestoreFailedCards,
        deviceId,
        deviceName,
        updateDeviceId,
        updateDeviceName,
        regenDeviceId,
        deviceIsolationEnabled,
        updateDeviceIsolationEnabled,
        deviceFilterMode,
        updateDeviceFilterMode
    } = useBatchSettingsAndDevice();

    const {
        batchJobs,
        setBatchJobs,
        batchJobsRef,
        persistBatchJobs,
        fetchingJobIds,
        fetchingJobIdsRef,
        isCleaningBatchCache,
        clearUnusedBatchCache,
        fetchBatchJobResults
    } = useBatchStorageAndRestore({
        ...props,
        restoreFinishedCardsRef,
        restoreFailedCardsRef
    });

    const {
        isPolling,
        checkBatchJob,
        pollActiveBatchJobs
    } = useBatchPolling({
        ...props,
        batchJobsRef,
        persistBatchJobs,
        fetchingJobIdsRef,
        fetchBatchJobResults,
        autoDownloadFromServerRef,
        restoreFinishedCardsRef,
        restoreFailedCardsRef
    });

    const {
        formingBatchNodeIds,
        isFormingBatch,
        getNodeActiveBatchJob,
        isNodeBatchActive,
        registerFormingBatch,
        unregisterFormingBatch,
        cancelFormingBatch,
        createBatchGeneration,
        cancelBatchJob,
        cancelBatchForNode,
        deleteBatchJob,
        retryBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs,
        getBatchJobJsonl,
        downloadBatchJsonl
    } = useBatchCreationAndLifecycle({
        ...props,
        batchJobs,
        batchJobsRef,
        setBatchJobs,
        persistBatchJobs
    });

    return {
        clearUnusedBatchCache,
        isCleaningBatchCache,
        autoDownloadFromServer,
        setAutoDownloadFromServer,
        isBatchMode,
        setIsBatchMode,
        restoreFinishedCards,
        setRestoreFinishedCards,
        restoreFailedCards,
        setRestoreFailedCards,
        batchJobs,
        setBatchJobs: persistBatchJobs,
        formingBatchNodeIds,
        isFormingBatch,
        getNodeActiveBatchJob,
        isNodeBatchActive,
        isPolling,
        isBatchPolling: isPolling,
        fetchingJobIds,
        fetchBatchJobResults,
        createBatchGeneration,
        checkBatchJob,
        pollActiveBatchJobs,
        cancelBatchJob,
        cancelBatchForNode,
        cancelFormingBatch,
        registerFormingBatch,
        unregisterFormingBatch,
        deleteBatchJob,
        retryBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs,
        getBatchJobJsonl,
        downloadBatchJsonl,
        deviceId,
        deviceName,
        setDeviceId: updateDeviceId,
        setDeviceName: updateDeviceName,
        regenerateDeviceId: regenDeviceId,
        deviceIsolationEnabled,
        setDeviceIsolationEnabled: updateDeviceIsolationEnabled,
        deviceFilterMode,
        setDeviceFilterMode: updateDeviceFilterMode
    };
};
