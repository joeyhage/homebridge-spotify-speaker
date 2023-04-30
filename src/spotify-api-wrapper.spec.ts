import { API, Logger, PlatformConfig } from 'homebridge';
import { SpotifyApiWrapper } from './spotify-api-wrapper';

it('should authenticate and persist tokens', async () => {
  // given
  const wrapper = new SpotifyApiWrapper(
    console as Logger,
    {
      spotifyAuthCode: process.env.SPOTIFY_AUTH_CODE!,
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID!,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    } as unknown as PlatformConfig,
    { user: { persistPath: () => '.' } } as API,
  );

  // when
  const result = await wrapper.authenticate();
  wrapper.persistTokens();

  // then
  expect(result).toBe(true);
});

it('should retrieve device list', async () => {
  // given
  const wrapper = new SpotifyApiWrapper(
    console as Logger,
    {
      spotifyAuthCode: process.env.SPOTIFY_AUTH_CODE!,
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID!,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    } as unknown as PlatformConfig,
    { user: { persistPath: () => '.' } } as API,
  );

  // when
  await wrapper.authenticate();
  const devices = await wrapper.getMyDevices();

  // then
  expect(devices?.length).toBeGreaterThan(0);
});

it('should retrieve playback state', async () => {
  // given
  const wrapper = new SpotifyApiWrapper(
    console as Logger,
    {
      spotifyAuthCode: process.env.SPOTIFY_AUTH_CODE!,
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID!,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    } as unknown as PlatformConfig,
    { user: { persistPath: () => '.' } } as API,
  );

  // when
  await wrapper.authenticate();
  const state = await wrapper.getPlaybackState();

  // then
  expect(state?.statusCode).toEqual(200);
});
