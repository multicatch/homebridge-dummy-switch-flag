import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { DummySwitchAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class DummyButtonFlagHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  // This is only required when using Custom Services and Characteristics not support by HomeKit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices() {
    const switches = this.config.switches;

    const devices = [];

    for (const aSwitch of switches) {
      const uuid = this.api.hap.uuid.generate(aSwitch.name);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      } else {
        this.discoveredCacheUUIDs.push(uuid);
      }

      this.log.info('Adding new dummy switch: %s', aSwitch.name);
      const accessory = new this.api.platformAccessory(aSwitch.name, uuid);
      new DummySwitchAccessory(this.Characteristic, this.Service, accessory, aSwitch, this.log);
      devices.push(accessory);
    }

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, devices);
  }
}
