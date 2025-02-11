import { Characteristic as ICharacteristic, CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';

export enum SwitchType {
  Simple = 'simple',
  AutoReset = 'auto_reset',
}

export interface SwitchConfig {
  name: string;
  type: SwitchType, 
  auto_reset?: SwitchResetConfig;
};

export interface SwitchResetConfig {
  delay: number;
  target_state?: boolean;
}

export class DummySwitchAccessory {
  private service: Service;

  private state = false;
  private resetInterval: NodeJS.Timeout | undefined;

  constructor(
    private readonly characteristic: typeof ICharacteristic,
    serviceType: typeof Service,
    private readonly accessory: PlatformAccessory,
    private readonly config: SwitchConfig,
    private readonly log: Logger,
  ) {
    this.service = this.accessory.addService(serviceType.Switch)!;

    this.service.setCharacteristic(characteristic.Name, config.name);
    this.service.setCharacteristic(characteristic.ConfiguredName, config.name);

    this.verifyAndFixConfig();

    this.service.getCharacteristic(characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.accessory.getService(serviceType.AccessoryInformation)!
      .setCharacteristic(characteristic.Manufacturer, 'multicatch')
      .setCharacteristic(characteristic.Model, 'Dummy Button')
      .setCharacteristic(characteristic.FirmwareRevision, '1.0.0');
  }

  private verifyAndFixConfig() {
    if (this.config.type === SwitchType.AutoReset && !this.config.auto_reset) {
      this.config.auto_reset = {
        delay: 10,
        target_state: false,
      };
    }

    if (this.config.auto_reset && !this.config.auto_reset.target_state) {
      this.config.auto_reset.target_state = false; // default reset state is OFF
    }
  }

  async setOn(value: CharacteristicValue) {
    const shouldBeOn = value as boolean;
    this.setState(shouldBeOn);

    if (this.resetInterval) {
      this.log.info('[%s] Auto reset cancelled.', this.config.name);
      clearInterval(this.resetInterval);
      this.resetInterval = undefined;
    }

    const target_state = this.config.auto_reset?.target_state;
    if (this.config.type === SwitchType.AutoReset && target_state !== shouldBeOn) {
      const auto_reset = this.config.auto_reset!;
      this.resetInterval = setInterval(() => {
        this.log.debug('[%s] Timeout! Resetting state to: %s', this.config.name, auto_reset.target_state);
        this.setState(target_state!);
        this.service.updateCharacteristic(this.characteristic.On, this.state);
      }, auto_reset.delay);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.state;
  }

  private setState(state: boolean) {
    this.state = state;
  }
}
