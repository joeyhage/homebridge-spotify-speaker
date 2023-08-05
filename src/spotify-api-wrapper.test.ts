import { API, Logger, PlatformConfig } from 'homebridge';
import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyApiWrapper } from './spotify-api-wrapper';
import type { WebapiErrorBody } from './types';
import { WebapiError } from './types';
import { SpotifyDeviceNotFoundError } from './errors';

jest.mock('spotify-web-api-node');
const spotifyWebApiMocks = SpotifyWebApi as jest.MockedClass<typeof SpotifyWebApi>;

beforeEach(() => {
  spotifyWebApiMocks.mockClear();
});

test('should re-attempt to retrieve device list once', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyDevices
    .mockRejectedValueOnce(new Error('something went wrong'))
    .mockResolvedValueOnce(fakeGetMyDevicesResponse);

  // when
  const devices = await wrapper.getMyDevices();

  // then
  expect(devices?.length).toBe(1);
  expect(mockSpotifyWebApi.getMyDevices).toHaveBeenCalledTimes(2);
});

test('should re-attempt wrapped request once when 404', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyCurrentPlaybackState
    .mockRejectedValueOnce(new WebapiError('test', {} as WebapiErrorBody, {}, 404, 'device not found'))
    .mockResolvedValueOnce(fakeGetMyCurrentPlaybackState);

  // when
  const playbackState = await wrapper.getPlaybackState();

  // then
  expect(playbackState?.body.is_playing).toBe(false);
  expect(mockSpotifyWebApi.getMyCurrentPlaybackState).toHaveBeenCalledTimes(2);
});

test('should throw SpotifyDeviceNotFoundError after two 404s', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyCurrentPlaybackState.mockRejectedValue(
    new WebapiError('test', {} as WebapiErrorBody, {}, 404, 'device not found'),
  );

  // when
  const playbackState = wrapper.getPlaybackState();

  // then
  await expect(playbackState).rejects.toThrow(SpotifyDeviceNotFoundError);
});

function getSpotifyApiWrapper(): SpotifyApiWrapper {
  return new SpotifyApiWrapper(
    console as Logger,
    {
      spotifyAuthCode: '',
      spotifyClientId: '',
      spotifyClientSecret: '',
    } as unknown as PlatformConfig,
    { user: { persistPath: () => '.' } } as API,
  );
}

function getMockedSpotifyWebApi(): jest.Mocked<SpotifyWebApi> {
  return spotifyWebApiMocks.mock.instances[0] as jest.Mocked<SpotifyWebApi>;
}

const fakeGetMyDevicesResponse = {
  body: {
    devices: [
      {
        id: 'id',
        is_active: false,
        is_restricted: false,
        is_private_session: false,
        name: 'test',
        type: 'type',
        volume_percent: 0,
      },
    ],
  },
  headers: {},
  statusCode: 200,
};

const fakeGetMyCurrentPlaybackState = {
  body: { is_playing: false } as SpotifyApi.CurrentPlaybackResponse,
  headers: {},
  statusCode: 200,
};
