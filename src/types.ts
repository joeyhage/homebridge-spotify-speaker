export interface HomebridgeSpotifyDevice {
  deviceName: string;
  spotifyDeviceId: string;
  spotifyPlaylistId: string;
}

export interface WebapiError {
  name: string;
  body: any;
  headers: any;
  statusCode: number;
  message: string;
}
