
declare const google: any;
declare const gapi: any;

const CLIENT_ID_KEY = 'settings_googleClientId';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
// Changed scope to drive.file to allow managing files created by this app, 
// and creating new ones.
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Prompt Modifier Data';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initializeGoogleDrive = async (clientId: string): Promise<boolean> => {
    if (!clientId) return false;
    
    return new Promise((resolve) => {
        const checkGapi = () => {
             if (typeof gapi !== 'undefined') {
                 gapi.load('client', async () => {
                     await gapi.client.init({
                         clientId: clientId,
                         discoveryDocs: DISCOVERY_DOCS,
                     });
                     gapiInited = true;
                     checkAll();
                 });
             } else {
                 setTimeout(checkGapi, 100);
             }
        };

        const checkGis = () => {
             if (typeof google !== 'undefined' && google.accounts) {
                 tokenClient = google.accounts.oauth2.initTokenClient({
                     client_id: clientId,
                     scope: SCOPES,
                     callback: '', // defined at request time
                 });
                 gisInited = true;
                 checkAll();
             } else {
                 setTimeout(checkGis, 100);
             }
        };

        const checkAll = () => {
            if (gapiInited && gisInited) resolve(true);
        };

        checkGapi();
        checkGis();
    });
};

export const signIn = async (): Promise<void> => {
    if (!tokenClient) {
        throw new Error("Google Drive API not initialized. Please check Client ID.");
    }
    return new Promise((resolve, reject) => {
        tokenClient.callback = (resp: any) => {
            if (resp.error) {
                reject(resp);
            } else {
                resolve(resp);
            }
        };
        // Request offline access to avoid constant prompts if possible, 
        // though for client-side explicit flow is standard.
        tokenClient.requestAccessToken({prompt: 'consent'});
    });
};

const ensureToken = async (): Promise<void> => {
     if (!gapiInited || !gisInited) throw new Error("API not initialized");
     const token = gapi.client.getToken();
     if (token !== null) return; // Token exists
     
     // If no token, trigger auth flow
     await signIn();
};

// --- Folder Management ---

export const getAppFolderId = async (): Promise<string> => {
    await ensureToken();
    try {
        const response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id;
        }
        
        // Create folder if not exists
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: APP_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        });
        return createResponse.result.id;
    } catch (e) {
        console.error("Error getting/creating folder", e);
        throw e;
    }
};

// --- File Operations ---

export const listFilesInAppFolder = async (folderId: string): Promise<any[]> => {
    await ensureToken();
    try {
        // Removed name filter to allow finding both 'Prompt_Modifier_' (projects) and 'Catalog_' (items)
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`, 
            fields: 'files(id, name, modifiedTime, appProperties)',
            spaces: 'drive',
            pageSize: 1000
        });
        return response.result.files || [];
    } catch (e) {
        console.error("Error listing files", e);
        throw e;
    }
};

// Search for files with specific name pattern in the app folder
export const searchFiles = async (nameContains: string, folderId: string): Promise<any[]> => {
    await ensureToken();
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name contains '${nameContains}' and trashed=false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
        });
        return response.result.files || [];
    } catch (e) {
        console.error("Error searching files", e);
        throw e;
    }
};

export const downloadFileContent = async (fileId: string): Promise<any> => {
    await ensureToken();
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.result; // GAPI returns JSON body for alt=media if it's JSON
    } catch (e) {
        console.error(`Error reading file ${fileId}`, e);
        throw e;
    }
};

export const saveFileToDrive = async (fileName: string, content: string, folderId?: string, existingFileId?: string): Promise<void> => {
    await ensureToken();

    // If no folder provided, find/create the app folder
    const targetFolderId = folderId || await getAppFolderId();

    return new Promise((resolve, reject) => {
        const metadata: any = {
            name: fileName,
            mimeType: 'application/json',
        };
        
        if (!existingFileId) {
            metadata.parents = [targetFolderId];
        }

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            content +
            close_delim;

        const request = gapi.client.request({
            'path': existingFileId ? `/upload/drive/v3/files/${existingFileId}` : '/upload/drive/v3/files',
            'method': existingFileId ? 'PATCH' : 'POST',
            'params': {'uploadType': 'multipart'},
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });
        
        request.execute((response: any) => {
            // response is the parsed JSON body. If it has an 'error' property, it failed.
            if (response && response.error) {
                reject(response.error);
            } else {
                resolve(response);
            }
        });
    });
};

export const deleteFile = async (fileId: string): Promise<void> => {
    await ensureToken();
    try {
        await gapi.client.drive.files.delete({
            fileId: fileId
        });
    } catch (e) {
        console.error(`Error deleting file ${fileId}`, e);
        throw e;
    }
};

export const getStoredClientId = () => localStorage.getItem(CLIENT_ID_KEY) || '';
export const setStoredClientId = (id: string) => localStorage.setItem(CLIENT_ID_KEY, id);
