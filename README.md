# Homebridge Dummy Switch Flags

Switches that basically do nothing, but can be used in automations.

## Example

You have presence sensor and a physical wireless button. 

You want to turn off the lights **WHEN** someone presses the button **AND** everybody leaves the room.

There is no way to do it in vanilla HomeKit. BUT you can make a workaround like this:

#### Prerequisites

Suppose you have a switch that does nothing. It will be our **dummy switch**. 
We will use this just to "remember" that someone pressed the button.

#### Automation no 1: Button press

When someone presses the button, you *turn dummy switch ON*. 

#### Automation no 2: Presence sensor

When there is no presence (everyone left the room), you run a Shortcut.

In this shortcut you add an IF: check if *dummy switch is ON*. If it's ON, then you turn off the light. 

Then you turn *dummy switch* OFF to reset it.

**Why is this IF needed?** 

If there was no *dummy switch* then the light would always turn off when the room is empty. Which is not what we wanted. 

The button basically acts as an automation activator. But because HomeKit does not support enabling/disabling automations, the *dummy switch* acts as a hack for that.

## Configuration

To configure the switch, you can use Homebridge UI or JSON. The JSON looks like this:

```json
{
    "platforms": [
        {
            "switches": [
                {
                    "name": "ready_for_sleep",
                    "type": "simple"
                },
                {
                    "name": "turn_off_lights",
                    "type": "auto_reset",
                    "auto_reset": {
                        "delay": 10000,
                        "target_state": true
                    }
                },
                {
                    "name": "clicker",
                    "type": "button",
                    "with_counter": true,
                    "counter_trigger": 20
                }
            ],
            "platform": "DummySwitchFlagHomebridgePlugin"
        }
    ]
}
```

The property `platform` **needs to be set to `"DummySwitchFlagHomebridgePlugin"`!

Remember that names need to be unique.

You can configure as many switches as you want. There are three types of switches:

### Simple switch

```json
{
    "name": "your_name_here",
    "type": "simple"
}
```

This switch just exists. When you turn it on, it stays on. When you turn it off, it stays off.

### Timed switch (auto-reset)

```json
{
    "name": "your_name_here_2",
    "type": "auto_reset",
    "auto_reset": {
        "delay": 10000,
        "target_state": false
    }
}
```

This switch automatically "resets" after given delay. 

For example, when you turn the above switch on, it will turn itself off after 10000ms (10 seconds).

If you set `target_state` to `true`, then it will work in an opposite way. That is, if you turn if OFF then it will turn itself ON after 10s.

### Button

```json
{
    "name": "your_name_here_3",
    "type": "button"
}
```

This switch does not want to stay ON. It will turn itself OFF immediately.

## Counting activations

The plugin also lets you count dummy switch activations and make automation based on that.

When you add the following property to a button, it will start counting switch activations (ON):

```text
  "with_counter": true,
  "counter_trigger": 20
```

`count_trigger` is a property that will trigger an event after you activate the button a number of times.

In the above example, the event will be triggered when you turn the switch ON 20 times.

**What do I mean by an event?**

`"with_counter": true` adds another dummy switch that will turn ON when the condition is met.

That is, you get another dummy button that turns ON automatically when you reach given activation count.



