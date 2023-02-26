let Service, Characteristic;
const { CronJob } = require('cron');
const MH_Z19      = require('mh_z19');

module.exports = function(homebridge){
  Service         = homebridge.hap.Service;
  Characteristic  = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-co2-low-level", "CO2LowLevel", Co2SensorAccessory);
}


function Co2SensorAccessory(log, config) {
  this.log           = log;
  this.name          = config["name"];
  this.name2         = config["name2"]
  this.uart_path     = config["uart_path"];
  this.schedule      = config["schedule"] || '*/1 * * * *';
  this.warning_level_high = config["warning_level_high"] || 1500;
  this.warning_level_low = config["warning_level_low"] || 800;

  this.informationService         = new Service.AccessoryInformation();
  this.CarbonDioxideSensorService = new Service.CarbonDioxideSensor(this.name);
  this.SmokeSensorService = new Service.SmokeSensor(this.name2);

  this.job = new CronJob({
    cronTime: this.schedule,
    onTick: () => {
      new MH_Z19 (this.uart_path, function(error, co2_level, stderr) {
        if (co2_level == null) {
          this.CarbonDioxideSensorService
            .updateCharacteristic(Characteristic.CarbonDioxideLevel, new Error(error));
          this.CarbonDioxideSensorService
            .updateCharacteristic(Characteristic.CarbonDioxideDetected, new Error(error));
        }
        else {
          let co2_high_detected = (this.warning_level_high < co2_level) ? 0 : 1;
          let co2_low_detected = (this.warning_level_low > co2_level) ? 0 : 1;
          this.log(`>>> [Update] CarbonDioxideLevel => ${co2_level}`);
          this.log(`>>> [Update] CarbonHighLevelDetected => ${co2_high_detected}`);
          this.log(`>>> [Update] CarbonLowLevelDetected => ${co2_low_detected}`);
          this.CarbonDioxideSensorService
            .updateCharacteristic(Characteristic.CarbonDioxideLevel, co2_level);
          this.CarbonDioxideSensorService
            .updateCharacteristic(Characteristic.CarbonDioxideDetected, co2_high_detected);
          this.SmokeSensorService
            .updateCharacteristic(Characteristic.SmokeDetected, co2_low_detected)
        }
      }.bind(this))
    },
    runOnInit: true
  })
  
  this.job.start()
}


Co2SensorAccessory.prototype.getServices = function() {




  this.informationService
    .setCharacteristic(Characteristic.Manufacturer, "Co2Sensor Manufacturer")
    .setCharacteristic(Characteristic.Model, 'Co2Sensor Model')
    .setCharacteristic(Characteristic.SerialNumber, 'Co2Sensor Serial Number');

  return [this.informationService, this.CarbonDioxideSensorService];
}
