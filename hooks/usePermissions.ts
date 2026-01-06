import { useState, useEffect, useCallback } from 'react';

type PermissionName = 'clipboard-read';

export const usePermissions = (permissionName: PermissionName) => {
    const [status, setStatus] = useState<PermissionState | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [sessionDeclined, setSessionDeclined] = useState(false);

    useEffect(() => {
        let permissionStatus: PermissionStatus;
        
        const checkPermission = async () => {
            try {
                // The 'clipboard-read' permission name is valid, despite what some TS typings might suggest.
                // Using 'any' to bypass potential lib errors.
                permissionStatus = await navigator.permissions.query({ name: permissionName as any });
                setStatus(permissionStatus.state);

                if (permissionStatus.state === 'prompt' && !sessionDeclined) {
                    setShowDialog(true);
                }

                permissionStatus.onchange = () => {
                    setStatus(permissionStatus.state);
                    if (permissionStatus.state !== 'prompt') {
                        setShowDialog(false);
                    }
                };
            } catch (error) {
                console.warn(`Permission API for '${permissionName}' not supported.`, error);
                // Assume granted or not needed if API is not supported.
                setStatus('granted');
            }
        };

        checkPermission();

        return () => {
            if (permissionStatus) {
                permissionStatus.onchange = null;
            }
        };
    }, [permissionName, sessionDeclined]);

    const requestPermission = useCallback(async () => {
        try {
            // The only way to trigger the prompt is to try to use the feature.
            await navigator.clipboard.readText();
            // The onchange listener will handle the status update.
        } catch (err) {
            // User likely denied the permission in the browser prompt.
            // The onchange listener should also catch this, but we can be proactive.
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setStatus('denied');
            }
            console.error('Clipboard read failed:', err);
        } finally {
            setShowDialog(false);
        }
    }, []);

    const declinePermission = useCallback(() => {
        setShowDialog(false);
        setSessionDeclined(true); // Don't ask again this session.
    }, []);

    return { showDialog, requestPermission, declinePermission };
};
