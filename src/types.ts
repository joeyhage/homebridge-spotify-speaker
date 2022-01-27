export interface HomebridgeSpotifyDevice {
  deviceName: string;
  spotifyDeviceId: string;
  spotifyPlaylistId: string;
}

interface WebapiErrorBody {
  error: {
    message: string;
    status: number;
  };
}

interface WebapiErrorHeaders {
  [key: string]: string | boolean;
}
export interface WebapiError {
  name: string;
  body: WebapiErrorBody;
  headers: WebapiErrorHeaders;
  statusCode: number;
  message: string;
}
