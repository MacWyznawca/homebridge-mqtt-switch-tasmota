// Sonoff-Tasmota Switch/Outlet Accessory plugin for HomeBridge 
// Jaromir Kopp @MacWyznawca
// v.0.0.1
// Remember to add accessory to config.json. Example:
/* "accessories": [
    {
		"accessory": "mqtt-switch-tasmota",
		"switchType": "outlet",
		
		"name": "NAME OF THIS ACCESSORY",
		
		"url": "mqtt://MQTT-ADDRESS",
		"username": "MQTT USER NAME",
		"password": "MQTT PASSWORD",
		
		"topics": {
			"statusGet": "stat/MQTT/POWER",
			"statusSet": "cmnd/MQTT/power",
			"stateGet": "tele/MQTT/STATE"
		},
		"onValue": "ON",
		"offValue": "OFF",
		
		"activityTopic": "tele/MQTT/LWT",
        "activityParameter": "Online",
        
		"startCmd": "cmnd/MQTT/TelePeriod",
		"startParameter": "60",

		"manufacturer": "ITEAD",
		"model": "Sonoff",
		"serialNumberMAC": "MAC OR SERIAL NUMBER"
	}
	]
*/

'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");

module.exports = function(homebridge) {
  	Service = homebridge.hap.Service;
  	Characteristic = homebridge.hap.Characteristic;

  	homebridge.registerAccessory("homebridge-mqtt-switch-tasmota", "mqtt-switch-tasmota", MqttSwitchTasmotaAccessory);
}

function MqttSwitchTasmotaAccessory(log, config) {
  	this.log          	= log;
  	
  	this.url 			= config["url"];
    this.publish_options = {
      qos: ((config["qos"] !== undefined)? config["qos"]: 0)
    };
    
	this.client_Id 		= 'mqttjs_' + Math.random().toString(16).substr(2, 8);
	this.options = {
	    keepalive: 10,
    	clientId: this.client_Id,
	    protocolId: 'MQTT',
    	protocolVersion: 4,
    	clean: true,
    	reconnectPeriod: 1000,
    	connectTimeout: 30 * 1000,
		will: {
			topic: 'WillMsg',
			payload: 'Connection Closed abnormally..!',
			qos: 0,
			retain: false
		},
	    username: config["username"],
	    password: config["password"],
    	rejectUnauthorized: false
	};
	
	this.topicStatusGet	= config["topics"].statusGet;
	this.topicStatusSet	= config["topics"].statusSet;
	this.topicsStateGet	= (config["topics"].stateGet  !== undefined) ? config["topics"].stateGet : "";

    this.onValue = (config["onValue"] !== undefined) ? config["onValue"]: "ON";
    this.offValue = (config["offValue"] !== undefined) ? config["offValue"]: "OFF";

	if (config["activityTopic"] !== undefined && config["activityParameter"] !== undefined) {
		this.activityTopic = config["activityTopic"];
	  	this.activityParameter = config["activityParameter"];
	}
	else {
		this.activityTopic = "";
	  	this.activityParameter = "";
	}
	
  	this.name = config["name"];
  	this.outlet = (config["switchType"] !== undefined) ? ((config["switchType"] == "outlet") ? true : false) : false;
  	
  	this.manufacturer = (config["manufacturer"] !== undefined) ? config['manufacturer'] :  "ITEAD";
  	this.manufacturer = (config["model"] !== undefined) ? config['model'] :  "Sonoff";
  	this.manufacturer = (config["serialNumberMAC"] !== undefined) ? config['serialNumberMAC'] : "0";

	this.switchStatus = false;
	
	if (this.outlet) {
		this.service = new Service.Outlet(this.name);
		this.service
			.getCharacteristic(Characteristic.OutletInUse)
			.on('get', this.getOutletUse.bind(this));
	}
	else {
		this.service = new Service.Switch(this.name);
	}
	
	this.service
    	.getCharacteristic(Characteristic.On)
    	.on('get', this.getStatus.bind(this))
    	.on('set', this.setStatus.bind(this));

	if(this.activityTopic !== "") {
		this.service.addOptionalCharacteristic(Characteristic.StatusActive);
		this.service
			.getCharacteristic(Characteristic.StatusActive)
			.on('get', this.getStatusActive.bind(this));
	}


	this.client = mqtt.connect(this.url, this.options);
	var that = this;
	this.client.on('error', function () {
		that.log('Error event on MQTT');
	});
	
	this.client.on('connect', function () {
		if (config["startCmd"] !== undefined && config["startParameter"] !== undefined) {
			that.client.publish(config["startCmd"], config["startParameter"]);
		}
	});
		
	this.client.on('message', function (topic, message) {
		if (topic == that.topicStatusGet) {			    
			try {
				var data = JSON.parse(message);
				var status = data.POWER;
				that.switchStatus = (status == that.onValue);
		   		that.service.getCharacteristic(Characteristic.On).setValue(that.switchStatus, undefined, 'fromSetValue');
		   		that.log(that.name, " -  Status get z JONSona : ", that.switchStatus);
		   	}
		   	catch (e) { 
		   		var status = message.toString();
				that.switchStatus = (status == that.onValue);
				that.log(that.name, " -  Status get z POWERa : ", that.switchStatus);
				that.service.getCharacteristic(Characteristic.On).setValue(that.switchStatus, undefined, 'fromSetValue');
		   	}
		}
		
		if (topic == that.topicsStateGet) {
			var data = JSON.parse(message);
			
			if (data.hasOwnProperty("POWER")) { 
				var status = data.POWER;
				that.switchStatus = (status == that.onValue);
		   		that.service.getCharacteristic(Characteristic.On).setValue(that.switchStatus, undefined, '');
			}
		} else if (topic == that.activityTopic) {
			var status = message.toString(); 	
			that.activeStat = (status == that.activityParameter);
			that.service.setCharacteristic(Characteristic.StatusActive, that.activeStat);
		}
	});
    this.client.subscribe(this.topicStatusGet);
	if(this.topicsStateGet !== ""){
	  	this.client.subscribe(this.topicsStateGet);
 	}
	if(this.activityTopic !== ""){
	  	this.client.subscribe(this.activityTopic);
 	}
}

MqttSwitchTasmotaAccessory.prototype.getStatus = function(callback) {
    callback(null, this.switchStatus);
}

MqttSwitchTasmotaAccessory.prototype.setStatus = function(status, callback, context) {
	if(context !== 'fromSetValue') {
		this.switchStatus = status;
	    this.client.publish(this.topicStatusSet, status ? this.onValue : this.offValue, this.publish_options);
	}
	callback();
}

MqttSwitchTasmotaAccessory.prototype.getStatusActive = function(callback) {
    this.log(this.name, " -  Activity Set : ", this.activeStat);
    callback(null, this.activeStat);
}

MqttSwitchTasmotaAccessory.prototype.getOutletUse = function(callback) {
    callback(null, true); // If configured for outlet - always in use (for now)
}

MqttSwitchTasmotaAccessory.prototype.getServices = function() {

	var informationService = new Service.AccessoryInformation();

	informationService
		.setCharacteristic(Characteristic.Name, this.name)
		.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
		.setCharacteristic(Characteristic.Model, this.model)
		.setCharacteristic(Characteristic.SerialNumber, this.serialNumberMAC);

	return [informationService, this.service];
}