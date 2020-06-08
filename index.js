const moment = require('moment');
const mqtt = require('mqtt');
const os = require('os');

var Service, Characteristic;

var FakeGatoHistoryService;

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  homebridge.registerAccessory("homebridge-soil-moisture", "Soil Moisture Sensor", SoilMoistureAccessory);
}

function SoilMoistureAccessory(log, config) {
  this.log = log;
  this.displayName = config['name'];
  this.maxAnalogReading = config['maxAnalogReading'] || 1024;
  this.minAnalogReading = config['minAnalogReading'] || 0;
  this.moistureThreshold = config['moistureThreshold'] || 25;
  this.timeout = config['timeout'] || 5;
  this.enableFakeGato = config['enableFakeGato'] || false;
  this.fakeGatoStoragePath = config['fakeGatoStoragePath'];
  this.mqttConfig = config['mqtt'];

  this._currentMoisture = null;

  let informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, "Waveshare")
    .setCharacteristic(Characteristic.Model, "Moisture Sensor")
    .setCharacteristic(Characteristic.SerialNumber, `${os.hostname}-0`)
    .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

  let humidityService = new Service.HumiditySensor();
  let leakService = new Service.LeakSensor();

  this.informationService = informationService;
  this.humidityService = humidityService;
  this.leakService = leakService;

  if (this.enableFakeGato) {
    this.fakeGatoHistoryService = new FakeGatoHistoryService("weather", this, {
      storage: 'fs',
      filename: `SoilMoisture-${os.hostname}-0.json`,
      folder: this.fakeGatoStoragePath
    });
  }

  this.setupMQTT();
  this.lastUpdated = moment();
  setInterval(() => {
    if (moment().diff(this.lastUpdated, 'minutes') >= this.timeout) {
      this.log(`No messages received for last ${this.timeout} minute(s), assuming error!`);
      this.humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .updateValue(Error());
      this.leakService.getCharacteristic(Characteristic.LeakDetected)
        .updateValue(Error());
    }
  }, 60 * 1000);
}


Object.defineProperty(SoilMoistureAccessory.prototype, "currentMoisture", {
  set: function(moistureReading) {
    moistureReading = Math.min(moistureReading, this.maxAnalogReading);
    moistureReading = Math.max(moistureReading, this.minAnalogReading);
    // For capacitive soil moisture sensors, lower value = higher moisture content
    this._currentMoisture = 100 - (moistureReading - this.minAnalogReading) / (this.maxAnalogReading - this.minAnalogReading) * 100;
    
    this.humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(this._currentMoisture);

    if (this._currentMoisture < this.moistureThreshold) {
      this.leakService.getCharacteristic(Characteristic.LeakDetected)
        .updateValue(true);
    } else {
      this.leakService.getCharacteristic(Characteristic.LeakDetected)
        .updateValue(false);
    }

    if (this.enableFakeGato) {
      this.fakeGatoHistoryService.addEntry({
        time: moment().unix(),
        humidity: this._currentMoisture,
      });
    }

  },

  get: function() {
    return this._currentMoisture;
  }
});

SoilMoistureAccessory.prototype.setupMQTT = function() {
  if (!this.mqttConfig) {
    this.log.error("No MQTT config found");
    return;
  }
  
  this.mqttURL = this.mqttConfig.url;
  this.soilMoistureTopic = this.mqttConfig.soilMoistureTopic || 'soil_humidity';
  
  this.mqttClient = mqtt.connect(this.mqttURL);

  this.mqttClient.on("connect", () => {
    this.log(`MQTT client connected to ${this.mqttURL}`);
    this.mqttClient.subscribe(this.soilMoistureTopic, (err) => {
      if (!err) {
        this.log(`MQTT client subscribed to ${this.soilMoistureTopic}`);
      }
    });
  });

  this.mqttClient.on("message", (topic, message) => {
    this.onMQTTMessage(topic, message)
  });

  this.mqttClient.on("error", (err) => {
    this.log(`MQTT client error: ${err}`);
    client.end();
  });
}

SoilMoistureAccessory.prototype.onMQTTMessage = function(topic, message) {
  this.log(`Received measurement: ${parseInt(message)}`);
  this.currentMoisture = parseInt(message);
  this.lastUpdated = moment();
}

SoilMoistureAccessory.prototype.getServices = function() {
  return [this.informationService,
          this.humidityService,
          this.leakService,
          this.fakeGatoHistoryService];
}

