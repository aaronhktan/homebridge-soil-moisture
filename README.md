# Homebridge Plugin for Analog Soil Moisture Sensor

This is a Homebridge plugin for an analog soil moisture sensor, working on the Raspberry Pi 3.

The actual sensor values are read in by an Arduino, communicated to an Onion Omega2 over UART, and then sent over MQTT to a Raspberry Pi.

## Configuration

| Field name           | Description                                                          | Type / Unit    | Default value       | Required? |
| -------------------- |:---------------------------------------------------------------------|:--------------:|:-------------------:|:---------:|
| name                 | Name of the accessory                                                | string         | —                   | Y         |
| maxAnalogReading     | Maximum analog reading (i.e. reading when soil is wet)               | int            | 1024                | N         |
| minAnalogReading     | Minimum analog reading (i.e. reading when soil is dry)               | int            | 0                   | N         |
| moistureThreshold    | Threshold at which to notify that plant is too dry                   | int            | 25                  | N         |
| timeout              | Time since last data received until setting "Not responding" status  | int (min)      | 5                   | N         |
| enableFakeGato       | Enable storing data in Eve Home app                                  | bool           | false               | N         |
| fakeGatoStoragePath  | Path to store data for Eve Home app                                  | string         | (fakeGato default)  | N         |
| mqttConfig           | Object containing some config for MQTT                               | object         | —                   | N         |

The mqttConfig object is defined as follows:

| Field name           | Description                                                     | Type / Unit  | Default value       | Required? |
| -------------------- |:----------------------------------------------------------------|:------------:|:-------------------:|:---------:|
| url                  | URL of the MQTT server, must start with mqtt://                 | string       | —                   | Y         |
| soilMoistureTopic    | MQTT topic to which soil moisture data is received from Onion   | string       | soil_humidity       | N         |

### Example Configuration

```
{
  "bridge": {
    "name": "Homebridge",
    "username": "XXXX",
    "port": XXXX
  },

  "accessories": [
    {
      "accessory": "Soil Moisture Sensor",
      "name": "Pothos",
      "maxAnalogReading": 800,
      "minAnalogReading": 200,
      "moistureThreshold": 25,
      "timeout": 5,
      "enableFakeGato": true,
      "mqtt": {
        "url": "mqtt://192.168.0.38",
        "soilMoistureTopic": "plants/soilmoisture"
      }
    },
  ]
}
```

## Project Layout

- All things required by Node are located at the root of the repository (i.e. package.json and index.js).
- The rest of the code is in `src`, further split up by language.
  - `arduino` contains code that runs on the Arduino and reads in an analog value from a pin and transmits that data over UART to the Onion.
  - `python` contains code that runs on the Onion, reading data over UART from the Arduino and transmitting that data over MQTT to the Raspberry Pi.
