
declare const google: any;
declare const gapi: any;

const CLIENT_ID_KEY = 'settings_googleClientId';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

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
        tokenClient.requestAccessToken({prompt: 'consent'});
    });
};

export const saveFileToDrive = async (fileName: string, content: string): Promise<void> => {
    if (!gapiInited || !gisInited) {
        throw new Error("Google Drive API not initialized. Please configure Client ID in settings.");
    }

    return new Promise((resolve, reject) => {
        // Check if we have a valid token, if not, request it
        const token = gapi.client.getToken();
        
        const upload = async () => {
             try {
                // Prepare metadata
                const metadata = {
                    name: fileName,
                    mimeType: 'application/json',
                };
                
                // Prepare multipart body
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

                await gapi.client.request({
                    'path': '/upload/drive/v3/files',
                    'method': 'POST',
                    'params': {'uploadType': 'multipart'},
                    'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody
                });
                
                resolve();
            } catch (err) {
                reject(err);
            }
        };

        if (token === null) {
             tokenClient.callback = async (resp: any) => {
                if (resp.error) {
                    reject(resp);
                } else {
                    await upload();
                }
            };
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            upload();
        }
    });
};

export const getStoredClientId = () => localStorage.getItem(CLIENT_ID_KEY) || '';
export const setStoredClientId = (id: string) => localStorage.setItem(CLIENT_ID_KEY, id);
