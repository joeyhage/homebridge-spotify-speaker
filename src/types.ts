export interface WebapiErrorBody {
  error: {
    message: string;
    status: number;
  };
}

interface WebapiErrorHeaders {
  [key: string]: string | boolean;
}
export class WebapiError {
  constructor(
    public readonly name: string,
    public readonly body: WebapiErrorBody,
    public readonly headers: WebapiErrorHeaders,
    public readonly statusCode: number,
    public readonly message: string,
  ) {}
}

/**
 * Ref: https://developer.spotify.com/documentation/web-api/reference/#/operations/get-information-about-the-users-current-playback
 */
export interface SpotifyPlaybackState {
  body: SpotifyApi.CurrentPlaybackResponse;
  statusCode: number;
}
