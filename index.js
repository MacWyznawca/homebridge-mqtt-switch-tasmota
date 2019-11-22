// Sonoff-Tasmota Switch/Outlet Accessory plugin for HomeBridge
// Jaromir Kopp @MacWyznawca

'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory("homebridge-mqtt-switch-tasmota", "mqtt-switch-tasmota", MqttSwitchTasmotaAccessory);
}

function MqttSwitchTasmotaAccessory(log, config) {
	this.log = log;

	this.url = config["url"];
	this.publish_options = {
		qos: ((config["qos"] !== undefined) ? config["qos"] : 0)
	};

	this.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
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

	this.topicStatusGet = config["topics"].statusGet;
	this.topicStatusSet = config["topics"].statusSet;
	this.topicsStateGet = (config["topics"].stateGet !== undefined) ? config["topics"].stateGet : "";

	this.onValue = (config["onValue"] !== undefined) ? config["onValue"] : "ON";
	this.offValue = (config["offValue"] !== undefined) ? config["offValue"] : "OFF";

	let powerVal = this.topicStatusSet.split("/");
	this.powerValue = powerVal[powerVal.length-1]
	this.log('Nazwa do RESULT ',this.powerValue);

	if (config["activityTopic"] !== undefined && config["activityParameter"] !== undefined) {
		this.activityTopic = config["activityTopic"];
		this.activityParameter = config["activityParameter"];
	} else {
		this.activityTopic = "";
		this.activityParameter = "";
	}

	this.name = config["name"] || "Sonoff";
	this.manufacturer = config['manufacturer'] || "ITEAD";
	this.model = config['model'] || "Sonoff";
	this.serialNumberMAC = config['serialNumberMAC'] || "";

	this.outlet = (config["switchType"] !== undefined) ? ((config["switchType"] == "outlet") ? true : false) : false;

	this.switchStatus = false;

	if (this.outlet) {
		this.service = new Service.Outlet(this.name);
		this.service
			.getCharacteristic(Characteristic.OutletInUse)
			.on('get', this.getOutletUse.bind(this));
	} else {
		this.service = new Service.Switch(this.name);
	}

	this.service
		.getCharacteristic(Characteristic.On)
		.on('get', this.getStatus.bind(this))
		.on('set', this.setStatus.bind(this));

	if (this.activityTopic !== "") {
		this.service.addOptionalCharacteristic(Characteristic.StatusActive);
		this.service
			.getCharacteristic(Characteristic.StatusActive)
			.on('get', this.getStatusActive.bind(this));
	}


	this.client = mqtt.connect(this.url, this.options);
	this.client.on('error', function() {
		this.log('Error event on MQTT');
	}.bind(this));

	this.client.on('connect', function() {
		this.client.subscribe(this.topicStatusGet);
		if (this.topicsStateGet !== "") {
			this.client.subscribe(this.topicsStateGet);
		}
		if (this.activityTopic !== "") {
			this.client.subscribe(this.activityTopic);
		}
		if (config["startCmd"] !== undefined && config["startParameter"] !== undefined) {
			this.client.publish(config["startCmd"], config["startParameter"]);
		}
	}.bind(this));

	this.client.on('message', function(topic, message) {
		if (topic == this.topicStatusGet) {
			try {
				// In the event that the user has a DUAL the topicStatusGet will return for POWER1 or POWER2 in the JSON.  
				// We need to coordinate which accessory is actually being reported and only take that POWER data.  
				// This assumes that the Sonoff single will return the value { "POWER" : "ON" }
				var data = JSON.parse(message);
				var status = data.POWER;
				if (data.hasOwnProperty(this.powerValue))
					status = data[this.powerValue];
				if (status !== undefined) {
					this.switchStatus = (status == this.onValue);
				  	this.log(this.name, "(",this.powerValue,") - Power from Status", status); //TEST ONLY
				}
			} catch (e) {
				var status = message.toString();

				this.switchStatus = (status == this.onValue);
			}
			this.service.getCharacteristic(Characteristic.On).updateValue(this.switchStatus);
		}

		if (topic == this.topicsStateGet) {
			try {
				var data = JSON.parse(message);
				if (data.hasOwnProperty(this.powerValue)) {
					var status = data[this.powerValue];
					this.log(this.name, "(",this.powerValue,") - Power from State", status); //TEST ONLY
					this.switchStatus = (status == this.onValue);
					this.service.getCharacteristic(Characteristic.On).updateValue(this.switchStatus);
				}
			} catch (e) {}
		} else if (topic == this.activityTopic) {
			var status = message.toString();
			this.activeStat = (status == this.activityParameter);
			this.service.setCharacteristic(Characteristic.StatusActive, this.activeStat);
		}
	}.bind(this));
}

MqttSwitchTasmotaAccessory.prototype.getStatus = function(callback) {
	if (this.activeStat) {
		this.log("Power state for '%s' is %s", this.name, this.switchStatus);
		callback(null, this.switchStatus);
	} else {
		this.log("'%s' is offline", this.name);
		callback('No Response');
	}
}

MqttSwitchTasmotaAccessory.prototype.setStatus = function(status, callback, context) {
	this.switchStatus = status;
	this.log("Set power state on '%s' to %s", this.name, status);
	this.client.publish(this.topicStatusSet, status ? this.onValue : this.offValue, this.publish_options);
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
