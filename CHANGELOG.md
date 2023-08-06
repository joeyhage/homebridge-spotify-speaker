# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.2] - 2023-08-06

### Fixed

- Automatically retry once on error because some Wi-Fi enabled Spotify speakers cannot be found on the first attempt after a period of inactivity.

## [1.3.1] - 2023-04-29

### Changed

- A speaker accessory can now be added in the plugin settings using either the Spotify `id` or `name` of the device.

## [1.3.0] - 2023-04-06

### Added

- New plugin settings to customize Spotify shuffle and repeat. Shuffle setting randomizes the order tracks in the playlist are played. Repeat setting repeats the entire playlist once all tracks have been played.
- New plugin setting to customize how frequently this plugin polls Spotify for changes.

## [1.2.4] - 2023-04-06

### Fixed

- Speaker accessories (lightbulbs) no longer appear in Homekit after being deleted or renamed in the plugin config.

## [1.2.3] - 2023-04-05

### Changed

- Change poblouin references to joeyhage since the old homebridge plugin is no longer maintained

[unreleased]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.3.2...HEAD
[1.3.2]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.2.4...v1.3.0
[1.2.4]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/1.2.2...v1.2.3
[1.2.2]: https://github.com/joeyhage/homebridge-spotify-speaker/releases/tag/1.2.2
