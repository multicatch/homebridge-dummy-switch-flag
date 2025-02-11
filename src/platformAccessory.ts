import { Characteristic as ICharacteristic, CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';

export enum SwitchType {
  Simple = 'simple',
  AutoReset = 'auto_reset',
  Button = 'button',
}

export interface SwitchConfig {
  name: string;
  type: SwitchType,
  auto_reset?: SwitchResetConfig;
  with_counter: boolean;
  counter_trigger?: number;
};

export interface SwitchResetConfig {
  delay: number;
  target_state?: boolean;
}

export class DummySwitchAccessory {
  private service: Service;
  private counterIndicatorService?: Service;

  private state = false;
  private resetInterval: NodeJS.Timeout | undefined;

  private activationCounter: number = 0;

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

    if (this.config.with_counter) {
      this.counterIndicatorService = this.accessory.addService(serviceType.Switch, config.name + '_counter')!
        .setCharacteristic(characteristic.Name, config.name + '_counter')
        .setCharacteristic(characteristic.ConfiguredName, config.name + '_counter');

      this.counterIndicatorService.getCharacteristic(characteristic.On)
        .onSet(this.resetCounter.bind(this))
        .onGet(this.getCounterState.bind(this));
    }
  }

  private verifyAndFixConfig() {
    if (this.config.type === SwitchType.AutoReset && !this.config.auto_reset) {
      this.config.auto_reset = {
        delay: 10,
        target_state: false,
      };
    }

    if (this.config.auto_reset && this.config.auto_reset.target_state === undefined) {
      this.config.auto_reset.target_state = false; // default reset state is OFF
    }

    if (this.config.type === SwitchType.AutoReset) {
      this.state = this.config.auto_reset?.target_state || false;
      this.service.updateCharacteristic(this.characteristic.On, this.state);
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
    } else if (this.config.type === SwitchType.Button) {
      this.setState(false);
      this.service.updateCharacteristic(this.characteristic.On, this.state);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.state;
  }

  private setState(state: boolean) {
    this.state = state;
    if (this.config.with_counter && this.state) {
      this.activationCounter++;
    }
  }

  async resetCounter() {
    this.activationCounter = 0;
    this.counterIndicatorService?.updateCharacteristic(this.characteristic.On, false);
  }

  async getCounterState(): Promise<CharacteristicValue> {
    if (this.config.counter_trigger) {
      return this.activationCounter >= this.config.counter_trigger;
    }
    return false;
  }
}
