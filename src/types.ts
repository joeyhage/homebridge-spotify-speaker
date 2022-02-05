export interface HomebridgeSpotifySpeakerDevice {
  deviceName: string;
  deviceType: string;
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

/**
 * Ref: https://developer.spotify.com/documentation/web-api/reference/#/operations/get-information-about-the-users-current-playback
 *
 * Some attributes are missing here, I kept what
 * could be needed in the scope of the project
 */
export interface SpotifyPlaybackState {
  body: {
    device: {
      id: string;
      is_active: boolean;
      is_private_session: boolean;
      is_restricted: boolean;
      name: string;
      type: string;
      volume_percent: number;
    };
    shuffle_state: boolean;
    repeat_state: string; // 'on', 'off'
    timestamp: number;
    context: {
      href: string;
      type: string; // 'playlist'
      uri: string;
    };
    progress_ms: number;
    currently_playing_type: string; // 'track'
    is_playing: boolean;
  };
  statusCode: number;
}
