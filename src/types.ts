export interface HomebridgeSpotifySpeakerDevice {
  deviceName: string;
  deviceType: string;
  spotifyDeviceId: string;
  spotifyPlaylistUrl: string;
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

/**
 * Ref: https://developer.spotify.com/documentation/web-api/reference/#/operations/get-information-about-the-users-current-playback
 */
export interface SpotifyPlaybackState {
  body: SpotifyApi.CurrentPlaybackResponse;
  statusCode: number;
}
